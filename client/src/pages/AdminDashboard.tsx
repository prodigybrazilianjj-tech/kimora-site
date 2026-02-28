import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type WholesaleRow = {
  id: string;
  createdAt?: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  memberCount: number;
  websiteOrInstagram?: string | null;
  city: string;
  state: string;
  businessType?: string | null;
  businessTypeOther?: string | null;
  retailSetup?: string | null;
  interestedOnShelf?: boolean;
  interestedCoachAffiliate?: boolean;
  interestedEventSponsorship?: boolean;
  notes?: string | null;
  status: "new" | "reviewing" | "approved" | "rejected" | "closed";
};

type FulfillmentStatus =
  | "unfulfilled"
  | "allocated"
  | "packed"
  | "shipped"
  | "delivered"
  | "canceled"
  | "backordered";

type OrderRow = {
  id: string;
  createdAt?: string;
  customerEmail?: string | null;
  status?: string | null;
  currency?: string | null;
  amountSubtotal?: number | null;
  amountTotal?: number | null;
  isSubscription?: boolean | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  shippingName?: string | null;
  shippingAddress?: any | null;

  // ✅ new (rollup from server)
  fulfillmentStatus?: FulfillmentStatus | string | null;
  fulfillmentCounts?: Record<string, number> | null;
  fulfillmentTop?: Array<{ status: string; count: number }> | null;
};

type Summary = {
  totalOrders: number;
  totalRevenueCents: number;
  aovCents: number;
  paidOrders: number;
  refundedOrders: number;
  subscriptionOrders: number;
  onetimeOrders: number;
};

type OrderItemRow = {
  id: string;
  orderId: string;
  flavor: string;
  purchaseType: string;
  frequencyWeeks?: number | null;
  quantity: number;
  unitAmount?: number | null;

  fulfillmentStatus?: FulfillmentStatus | string;
  carrier?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;

  createdAt?: string;
};

function money(cents?: number | null, currency?: string | null) {
  if (cents == null) return "—";
  const ccy = (currency || "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: ccy,
    }).format(cents / 100);
  } catch {
    return `${ccy} ${(cents / 100).toFixed(2)}`;
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

function oneLineAddress(addr: any) {
  if (!addr) return "—";
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.postal_code,
    addr.country,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function getApiBase() {
  return "";
}

async function api<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(getApiBase() + path, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
      "x-admin-token": token,
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { ok: false, message: text || "Invalid JSON" };
  }

  if (!res.ok) {
    const msg = json?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json as T;
}

type TabKey = "overview" | "orders" | "wholesale";

const FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "unfulfilled",
  "allocated",
  "packed",
  "shipped",
  "delivered",
  "backordered",
  "canceled",
];

function normalizeFulfillmentStatus(v: any): FulfillmentStatus {
  const s = String(v || "").trim().toLowerCase();
  if (FULFILLMENT_STATUSES.includes(s as FulfillmentStatus)) {
    return s as FulfillmentStatus;
  }
  return "unfulfilled";
}

function statusBadgeClass(status: FulfillmentStatus) {
  // No hard-coded colors requested; keep it subtle using existing theme classes.
  // We’ll vary emphasis by status via text weight only.
  const base = "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs";
  if (status === "delivered") return `${base} font-semibold`;
  if (status === "shipped") return `${base} font-semibold`;
  if (status === "packed") return `${base} font-medium`;
  if (status === "allocated") return `${base} font-medium`;
  if (status === "backordered") return `${base} font-semibold`;
  if (status === "canceled") return `${base} font-medium`;
  return `${base} font-normal`;
}

function countsSummary(counts?: Record<string, number> | null) {
  if (!counts) return "";
  const total = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
  if (!total) return "";
  // Show top 2 statuses by count
  const entries = Object.entries(counts)
    .map(([k, v]) => [k, Number(v) || 0] as const)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 2).map(([k, v]) => `${k}:${v}`);
  return `${top.join(" • ")}${entries.length > 2 ? " • …" : ""}`;
}

export default function AdminDashboard() {
  const { toast } = useToast();

  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");

  const [tab, setTab] = useState<TabKey>("overview");

  const [summary, setSummary] = useState<Summary | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderQ, setOrderQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderMode, setOrderMode] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItemRow[]>([]);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

  const [itemEdits, setItemEdits] = useState<
    Record<
      string,
      { fulfillmentStatus: FulfillmentStatus; carrier: string; trackingNumber: string }
    >
  >({});

  // ✅ order-level quick set (bulk update all items)
  const [orderFulfillmentEdit, setOrderFulfillmentEdit] = useState<
    Record<string, { fulfillmentStatus: FulfillmentStatus }>
  >({});

  const [wholesale, setWholesale] = useState<WholesaleRow[]>([]);
  const [wholesaleLoading, setWholesaleLoading] = useState(false);
  const [wholesaleQ, setWholesaleQ] = useState("");
  const [wholesaleStatusFilter, setWholesaleStatusFilter] = useState<
    "" | WholesaleRow["status"]
  >("");

  const canAuth = Boolean(savedToken);

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
    setSavedToken(t);
  }, []);

  function saveToken() {
    const t = token.trim();
    localStorage.setItem("adminToken", t);
    setSavedToken(t);
  }

  function clearToken() {
    localStorage.removeItem("adminToken");
    setToken("");
    setSavedToken("");
    setSummary(null);
    setOrders([]);
    setWholesale([]);
    setSelectedOrderId(null);
    setSelectedOrderDetail(null);
    setSelectedOrderItems([]);
    setOrderDetailError(null);
    setItemEdits({});
    setOrderFulfillmentEdit({});
  }

  async function loadSummary() {
    if (!savedToken) return;
    const data = await api<{ ok: true; summary: Summary }>(
      "/api/admin/summary",
      savedToken,
    );
    setSummary(data.summary);
  }

  async function loadOrders() {
    if (!savedToken) return;
    setOrdersLoading(true);
    try {
      const qs = new URLSearchParams();
      if (orderQ.trim()) qs.set("q", orderQ.trim());
      if (orderStatus.trim()) qs.set("status", orderStatus.trim());
      if (orderMode.trim()) qs.set("mode", orderMode.trim());

      const url = `/api/admin/orders${qs.toString() ? `?${qs.toString()}` : ""}`;
      const data = await api<{ ok: true; rows: OrderRow[] }>(url, savedToken);
      const rows = (data.rows || []) as OrderRow[];
      setOrders(rows);

      // seed quick-set edit state using server rollup
      setOrderFulfillmentEdit((prev) => {
        const next = { ...prev };
        for (const r of rows) {
          const current = normalizeFulfillmentStatus(r.fulfillmentStatus);
          if (!next[r.id]) next[r.id] = { fulfillmentStatus: current };
        }
        return next;
      });
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadWholesale() {
    if (!savedToken) return;
    setWholesaleLoading(true);
    try {
      const data = await api<{ ok: true; rows: WholesaleRow[] }>(
        "/api/admin/wholesale-applications",
        savedToken,
      );
      setWholesale(data.rows || []);
    } finally {
      setWholesaleLoading(false);
    }
  }

  async function openOrder(id: string) {
    if (!savedToken) return;

    setSelectedOrderId(id);
    setSelectedOrderDetail(null);
    setSelectedOrderItems([]);
    setOrderDetailError(null);
    setOrderDetailLoading(true);
    setItemEdits({});

    try {
      const data = await api<{ ok: true; order: any; items: OrderItemRow[] }>(
        `/api/admin/orders/${id}`,
        savedToken,
      );

      setSelectedOrderDetail(data.order);

      const items = (data.items || []) as OrderItemRow[];
      setSelectedOrderItems(items);

      const seeded: Record<
        string,
        { fulfillmentStatus: FulfillmentStatus; carrier: string; trackingNumber: string }
      > = {};
      for (const it of items) {
        const status = normalizeFulfillmentStatus(it.fulfillmentStatus || "unfulfilled");
        seeded[it.id] = {
          fulfillmentStatus: status,
          carrier: String(it.carrier || ""),
          trackingNumber: String(it.trackingNumber || ""),
        };
      }
      setItemEdits(seeded);
    } catch (e: any) {
      const msg = String(e?.message || "Failed to load order.");
      setOrderDetailError(msg);
      toast({ title: "Order load failed", description: msg });
    } finally {
      setOrderDetailLoading(false);
    }
  }

  function closeOrder() {
    setSelectedOrderId(null);
    setSelectedOrderDetail(null);
    setSelectedOrderItems([]);
    setOrderDetailError(null);
    setOrderDetailLoading(false);
    setItemEdits({});
  }

  async function updateWholesaleStatus(id: string, status: WholesaleRow["status"]) {
    if (!savedToken) return;

    await api<{ ok: true }>(`/api/admin/wholesale-applications/${id}`, savedToken, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    await loadWholesale();
  }

  async function saveItemFulfillment(itemId: string) {
    if (!savedToken) return;

    const edit = itemEdits[itemId];
    if (!edit) return;

    await api<{ ok: true }>(`/api/admin/order-items/${itemId}/fulfillment`, savedToken, {
      method: "PATCH",
      body: JSON.stringify({
        fulfillmentStatus: edit.fulfillmentStatus,
        carrier: edit.carrier || null,
        trackingNumber: edit.trackingNumber || null,
      }),
    });

    toast({ title: "Saved", description: `Item updated` });

    // refresh detail + list (so rollups update)
    if (selectedOrderId) await openOrder(selectedOrderId);
    await loadOrders();
  }

  async function saveOrderFulfillment(orderId: string) {
    if (!savedToken) return;

    const edit = orderFulfillmentEdit[orderId];
    if (!edit) return;

    await api<{ ok: true; updated: number }>(
      `/api/admin/orders/${orderId}/fulfillment`,
      savedToken,
      {
        method: "PATCH",
        body: JSON.stringify({
          fulfillmentStatus: edit.fulfillmentStatus,
        }),
      },
    );

    toast({
      title: "Saved",
      description: `Order items set to "${edit.fulfillmentStatus}"`,
    });

    // refresh list + detail if open
    await loadOrders();
    if (selectedOrderId === orderId) {
      await openOrder(orderId);
    }
  }

  useEffect(() => {
    if (!savedToken) return;
    loadSummary().catch(() => {});
    loadOrders().catch(() => {});
    loadWholesale().catch(() => {});
  }, [savedToken]);

  const filteredWholesale = useMemo(() => {
    let rows = wholesale;

    if (wholesaleStatusFilter) rows = rows.filter((r) => r.status === wholesaleStatusFilter);

    const q = wholesaleQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.businessName, r.contactName, r.email, r.city, r.state, r.phone]
          .map((x) => String(x || "").toLowerCase())
          .join(" | ");
        return hay.includes(q);
      });
    }

    return rows;
  }, [wholesale, wholesaleQ, wholesaleStatusFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Orders • Revenue • Wholesale</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_DASHBOARD_TOKEN"
              className="h-10 w-[280px] max-w-full rounded-md border border-border bg-background px-3 text-sm"
              type="password"
              autoComplete="off"
            />
            <Button type="button" onClick={saveToken} className="h-10">
              Save token
            </Button>
            <Button type="button" variant="outline" onClick={clearToken} className="h-10">
              Clear
            </Button>
          </div>
        </div>

        {!canAuth && (
          <div className="mt-8 rounded-lg border border-border p-5">
            <div className="font-semibold">Token required</div>
            <p className="text-sm text-muted-foreground mt-1">
              Set ADMIN_DASHBOARD_TOKEN in Render, then paste it here and click Save token.
            </p>
          </div>
        )}

        <div className="mt-8 flex gap-2 flex-wrap">
          <Button
            type="button"
            variant={tab === "overview" ? "default" : "outline"}
            onClick={() => setTab("overview")}
          >
            Overview
          </Button>
          <Button
            type="button"
            variant={tab === "orders" ? "default" : "outline"}
            onClick={() => setTab("orders")}
          >
            Orders
          </Button>
          <Button
            type="button"
            variant={tab === "wholesale" ? "default" : "outline"}
            onClick={() => setTab("wholesale")}
          >
            Wholesale
          </Button>

          <div className="flex-1" />

          {canAuth && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={loadSummary}>
                Refresh overview
              </Button>
              <Button type="button" variant="outline" onClick={loadOrders}>
                Refresh orders
              </Button>
              <Button type="button" variant="outline" onClick={loadWholesale}>
                Refresh wholesale
              </Button>
            </div>
          )}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="mt-6 grid gap-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Total revenue</div>
                <div className="text-2xl font-bold mt-1">
                  {summary ? money(summary.totalRevenueCents, "usd") : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Total orders</div>
                <div className="text-2xl font-bold mt-1">{summary ? summary.totalOrders : "—"}</div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Avg order value</div>
                <div className="text-2xl font-bold mt-1">{summary ? money(summary.aovCents, "usd") : "—"}</div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Paid vs Refunded</div>
                <div className="text-lg font-semibold mt-2">{summary ? `${summary.paidOrders} paid` : "—"}</div>
                <div className="text-sm text-muted-foreground">{summary ? `${summary.refundedOrders} refunded` : ""}</div>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-[220px]">
                  <input
                    value={orderQ}
                    onChange={(e) => setOrderQ(e.target.value)}
                    placeholder="Search orders..."
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">All</option>
                  <option value="paid">paid</option>
                  <option value="refunded">refunded</option>
                </select>

                <select
                  value={orderMode}
                  onChange={(e) => setOrderMode(e.target.value)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">All</option>
                  <option value="payment">One-time</option>
                  <option value="subscription">Subscription</option>
                </select>

                <Button type="button" onClick={loadOrders} className="h-10">
                  Apply
                </Button>
              </div>

              {ordersLoading && <div className="mt-3 text-sm text-muted-foreground">Loading…</div>}
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="font-semibold">Orders ({orders.length})</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tip: “Fulfillment” is an order-level quick set (bulk updates all items).
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-3 text-left">Created</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Fulfillment</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const isOpen = selectedOrderId === o.id;

                      const rollup = normalizeFulfillmentStatus(o.fulfillmentStatus);
                      const edit = orderFulfillmentEdit[o.id] || { fulfillmentStatus: rollup };

                      return (
                        <>
                          <tr key={o.id} className="border-t border-border align-top">
                            <td className="p-3">{fmtDate(o.createdAt)}</td>
                            <td className="p-3">{o.customerEmail || "—"}</td>
                            <td className="p-3">{o.isSubscription ? "Subscription" : "One-time"}</td>
                            <td className="p-3">{o.status || "—"}</td>

                            <td className="p-3">
                              <div className="flex flex-col gap-2">
                                <div className={statusBadgeClass(rollup)}>
                                  <span>Rollup:</span>
                                  <code>{rollup}</code>
                                </div>

                                {o.fulfillmentCounts ? (
                                  <div className="text-xs text-muted-foreground">
                                    {countsSummary(o.fulfillmentCounts)}
                                  </div>
                                ) : null}

                                <div className="flex items-center gap-2 flex-wrap">
                                  <select
                                    value={edit.fulfillmentStatus}
                                    onChange={(e) =>
                                      setOrderFulfillmentEdit((prev) => ({
                                        ...prev,
                                        [o.id]: {
                                          fulfillmentStatus: normalizeFulfillmentStatus(e.target.value),
                                        },
                                      }))
                                    }
                                    className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                                    title="Quick set: updates ALL items in the order"
                                  >
                                    {FULFILLMENT_STATUSES.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      saveOrderFulfillment(o.id);
                                    }}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>
                            </td>

                            <td className="p-3">{money(o.amountTotal, o.currency)}</td>

                            <td className="p-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  // toggle open/close in-place
                                  if (selectedOrderId === o.id) {
                                    closeOrder();
                                  } else {
                                    openOrder(o.id);
                                  }
                                }}
                              >
                                {isOpen ? "Hide" : "View"}
                              </Button>
                            </td>
                          </tr>

                          {isOpen && (
                            <tr className="border-t border-border">
                              <td className="p-3 bg-muted/10" colSpan={7}>
                                <div className="rounded-lg border border-border p-4">
                                  <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                      <div className="font-semibold">Order detail</div>
                                      <div className="text-sm text-muted-foreground">
                                        {selectedOrderId ? `ID: ${selectedOrderId}` : ""}
                                      </div>
                                    </div>

                                    <div className="flex gap-2">
                                      {selectedOrderId && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="h-9"
                                          onClick={() => openOrder(selectedOrderId)}
                                          disabled={orderDetailLoading}
                                        >
                                          Refresh detail
                                        </Button>
                                      )}
                                      <Button type="button" variant="outline" className="h-9" onClick={closeOrder}>
                                        Close
                                      </Button>
                                    </div>
                                  </div>

                                  {orderDetailLoading && (
                                    <div className="mt-3 text-sm text-muted-foreground">Loading order…</div>
                                  )}
                                  {orderDetailError && <div className="mt-3 text-sm text-red-400">{orderDetailError}</div>}

                                  {selectedOrderDetail && (
                                    <div className="mt-4 grid md:grid-cols-3 gap-4">
                                      <div className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Created</div>
                                        <div className="font-medium mt-1">
                                          {fmtDate(selectedOrderDetail.createdAt)}
                                        </div>
                                      </div>

                                      <div className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Customer</div>
                                        <div className="font-medium mt-1">
                                          {selectedOrderDetail.customerEmail || "—"}
                                        </div>
                                      </div>

                                      <div className="rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Total</div>
                                        <div className="font-medium mt-1">
                                          {money(selectedOrderDetail.amountTotal, selectedOrderDetail.currency)}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Status: {selectedOrderDetail.status || "—"} •{" "}
                                          {selectedOrderDetail.isSubscription ? "Subscription" : "One-time"}
                                        </div>
                                      </div>

                                      <div className="md:col-span-3 rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Shipping</div>
                                        <div className="font-medium mt-1">{selectedOrderDetail.shippingName || "—"}</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                          {oneLineAddress(selectedOrderDetail.shippingAddress)}
                                        </div>
                                      </div>

                                      {/* Fulfillment per item */}
                                      <div className="md:col-span-3 rounded-md border border-border p-3">
                                        <div className="text-xs text-muted-foreground">Items</div>

                                        <div className="mt-3 overflow-auto">
                                          <table className="w-full text-sm">
                                            <thead className="bg-muted/40">
                                              <tr>
                                                <th className="p-2 text-left">Item</th>
                                                <th className="p-2 text-left">Qty</th>
                                                <th className="p-2 text-left">Fulfillment</th>
                                                <th className="p-2 text-left">Carrier</th>
                                                <th className="p-2 text-left">Tracking</th>
                                                <th className="p-2 text-left">Shipped</th>
                                                <th className="p-2 text-left">Delivered</th>
                                                <th className="p-2 text-left">Action</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {selectedOrderItems.map((it) => {
                                                const edit = itemEdits[it.id] || {
                                                  fulfillmentStatus: "unfulfilled" as FulfillmentStatus,
                                                  carrier: "",
                                                  trackingNumber: "",
                                                };

                                                const label =
                                                  it.flavor ||
                                                  `${it.purchaseType}${it.frequencyWeeks ? ` (${it.frequencyWeeks}w)` : ""}`;

                                                return (
                                                  <tr key={it.id} className="border-t border-border">
                                                    <td className="p-2">
                                                      <div className="font-medium">{label}</div>
                                                      <div className="text-xs text-muted-foreground">
                                                        {it.purchaseType}
                                                        {it.frequencyWeeks ? ` • every ${it.frequencyWeeks}w` : ""}
                                                      </div>
                                                    </td>

                                                    <td className="p-2">{it.quantity}</td>

                                                    <td className="p-2">
                                                      <select
                                                        value={edit.fulfillmentStatus}
                                                        onChange={(e) =>
                                                          setItemEdits((prev) => ({
                                                            ...prev,
                                                            [it.id]: {
                                                              ...edit,
                                                              fulfillmentStatus: normalizeFulfillmentStatus(e.target.value),
                                                            },
                                                          }))
                                                        }
                                                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                                                      >
                                                        {FULFILLMENT_STATUSES.map((s) => (
                                                          <option key={s} value={s}>
                                                            {s}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    </td>

                                                    <td className="p-2">
                                                      <input
                                                        value={edit.carrier}
                                                        onChange={(e) =>
                                                          setItemEdits((prev) => ({
                                                            ...prev,
                                                            [it.id]: { ...edit, carrier: e.target.value },
                                                          }))
                                                        }
                                                        placeholder="USPS / UPS / FedEx"
                                                        className="h-8 w-[140px] rounded-md border border-border bg-background px-2 text-sm"
                                                      />
                                                    </td>

                                                    <td className="p-2">
                                                      <input
                                                        value={edit.trackingNumber}
                                                        onChange={(e) =>
                                                          setItemEdits((prev) => ({
                                                            ...prev,
                                                            [it.id]: { ...edit, trackingNumber: e.target.value },
                                                          }))
                                                        }
                                                        placeholder="Tracking #"
                                                        className="h-8 w-[200px] rounded-md border border-border bg-background px-2 text-sm"
                                                      />
                                                    </td>

                                                    <td className="p-2 text-muted-foreground">
                                                      {it.shippedAt ? fmtDate(it.shippedAt) : "—"}
                                                    </td>
                                                    <td className="p-2 text-muted-foreground">
                                                      {it.deliveredAt ? fmtDate(it.deliveredAt) : "—"}
                                                    </td>

                                                    <td className="p-2">
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-8"
                                                        onClick={() => saveItemFulfillment(it.id)}
                                                      >
                                                        Save
                                                      </Button>
                                                    </td>
                                                  </tr>
                                                );
                                              })}

                                              {!selectedOrderItems.length && (
                                                <tr>
                                                  <td className="p-3 text-muted-foreground" colSpan={8}>
                                                    No items found for this order.
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>

                                        <div className="text-xs text-muted-foreground mt-2">
                                          Tip: setting to <code>shipped</code> stamps shippedAt. Setting to{" "}
                                          <code>delivered</code> stamps deliveredAt.
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}

                    {!orders.length && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={7}>
                          No orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* WHOLESALE */}
        {tab === "wholesale" && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-[220px]">
                  <input
                    value={wholesaleQ}
                    onChange={(e) => setWholesaleQ(e.target.value)}
                    placeholder="Search wholesale applications..."
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <select
                  value={wholesaleStatusFilter}
                  onChange={(e) => setWholesaleStatusFilter(e.target.value as any)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">All</option>
                  <option value="new">new</option>
                  <option value="reviewing">reviewing</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="closed">closed</option>
                </select>

                <Button type="button" onClick={loadWholesale} className="h-10">
                  Refresh
                </Button>
              </div>

              {wholesaleLoading && <div className="mt-3 text-sm text-muted-foreground">Loading…</div>}
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="font-semibold">Wholesale applications ({filteredWholesale.length})</div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-3 text-left">Business</th>
                      <th className="p-3 text-left">Contact</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWholesale.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="p-3">{r.businessName}</td>
                        <td className="p-3">{r.contactName}</td>
                        <td className="p-3">{r.email}</td>
                        <td className="p-3">
                          <code>{r.status}</code>
                        </td>
                        <td className="p-3">
                          <select
                            value={r.status}
                            onChange={(e) => updateWholesaleStatus(r.id, e.target.value as any)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                          >
                            <option value="new">new</option>
                            <option value="reviewing">reviewing</option>
                            <option value="approved">approved</option>
                            <option value="rejected">rejected</option>
                            <option value="closed">closed</option>
                          </select>
                        </td>
                      </tr>
                    ))}

                    {!filteredWholesale.length && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={5}>
                          No wholesale applications found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
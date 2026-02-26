// client/src/pages/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

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
  init?: RequestInit
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

export default function AdminDashboard() {
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
  const [selectedOrderDetail, setSelectedOrderDetail] =
    useState<any | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] =
    useState<any[] | null>(null);

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
  }

  async function loadSummary() {
    if (!savedToken) return;
    const data = await api<{ ok: true; summary: Summary }>(
      "/api/admin/summary",
      savedToken
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

      const url = `/api/admin/orders${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;

      const data = await api<{ ok: true; rows: OrderRow[] }>(
        url,
        savedToken
      );
      setOrders(data.rows || []);
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
        savedToken
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
    setSelectedOrderItems(null);

    const data = await api<{ ok: true; order: any; items: any[] }>(
      `/api/admin/orders/${id}`,
      savedToken
    );

    setSelectedOrderDetail(data.order);
    setSelectedOrderItems(data.items || []);
  }

  async function updateWholesaleStatus(
    id: string,
    status: WholesaleRow["status"]
  ) {
    if (!savedToken) return;

    await api<{ ok: true }>(
      `/api/admin/wholesale-applications/${id}`,
      savedToken,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );

    await loadWholesale();
  }

  useEffect(() => {
    if (!savedToken) return;
    loadSummary().catch(() => {});
    loadOrders().catch(() => {});
    loadWholesale().catch(() => {});
  }, [savedToken]);

  const filteredWholesale = useMemo(() => {
    let rows = wholesale;

    if (wholesaleStatusFilter) {
      rows = rows.filter((r) => r.status === wholesaleStatusFilter);
    }

    const q = wholesaleQ.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.businessName,
          r.contactName,
          r.email,
          r.city,
          r.state,
          r.phone,
        ]
          .map((x) => String(x || "").toLowerCase())
          .join(" | ");
        return hay.includes(q);
      });
    }

    return rows;
  }, [wholesale, wholesaleQ, wholesaleStatusFilter]);

  const computedOrderStats = useMemo(() => {
    const paid = orders.filter(
      (o) => String(o.status || "").toLowerCase() === "paid"
    );
    const refunded = orders.filter(
      (o) => String(o.status || "").toLowerCase() === "refunded"
    );
    const subs = orders.filter((o) => Boolean(o.isSubscription));
    const one = orders.filter((o) => !o.isSubscription);

    const currency = (orders.find((o) => o.currency)?.currency ||
      "usd") as string;

    const revenueCents = paid.reduce(
      (acc, o) => acc + (o.amountTotal || 0),
      0
    );
    const aovCents = paid.length
      ? Math.round(revenueCents / paid.length)
      : 0;

    return {
      currency,
      count: orders.length,
      paidCount: paid.length,
      refundedCount: refunded.length,
      subCount: subs.length,
      oneCount: one.length,
      revenueCents,
      aovCents,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Orders • Revenue • Wholesale
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_DASHBOARD_TOKEN"
              className="h-10 w-[280px] max-w-full rounded-md border border-border bg-background px-3 text-sm"
            />
            <Button onClick={saveToken} className="h-10">
              Save token
            </Button>
            <Button
              variant="outline"
              onClick={clearToken}
              className="h-10"
            >
              Clear
            </Button>
          </div>
        </div>

        {!canAuth && (
          <div className="mt-8 rounded-lg border border-border p-5">
            <div className="font-semibold">Token required</div>
            <p className="text-sm text-muted-foreground mt-1">
              Set ADMIN_DASHBOARD_TOKEN in Render, then paste it here
              and click Save token.
            </p>
          </div>
        )}

        <div className="mt-8 flex gap-2 flex-wrap">
          <Button
            variant={tab === "overview" ? "default" : "outline"}
            onClick={() => setTab("overview")}
          >
            Overview
          </Button>
          <Button
            variant={tab === "orders" ? "default" : "outline"}
            onClick={() => setTab("orders")}
          >
            Orders
          </Button>
          <Button
            variant={tab === "wholesale" ? "default" : "outline"}
            onClick={() => setTab("wholesale")}
          >
            Wholesale
          </Button>

          <div className="flex-1" />

          {canAuth && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadSummary}>
                Refresh overview
              </Button>
              <Button variant="outline" onClick={loadOrders}>
                Refresh orders
              </Button>
              <Button variant="outline" onClick={loadWholesale}>
                Refresh wholesale
              </Button>
            </div>
          )}
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid gap-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">
                  Total revenue
                </div>
                <div className="text-2xl font-bold mt-1">
                  {summary
                    ? money(summary.totalRevenueCents, "usd")
                    : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">
                  Total orders
                </div>
                <div className="text-2xl font-bold mt-1">
                  {summary ? summary.totalOrders : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">
                  Avg order value
                </div>
                <div className="text-2xl font-bold mt-1">
                  {summary
                    ? money(summary.aovCents, "usd")
                    : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">
                  Paid vs Refunded
                </div>
                <div className="text-lg font-semibold mt-2">
                  {summary ? `${summary.paidOrders} paid` : "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {summary
                    ? `${summary.refundedOrders} refunded`
                    : ""}
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <option value="subscription">
                    Subscription
                  </option>
                </select>

                <Button onClick={loadOrders} className="h-10">
                  Apply
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="font-semibold">
                  Orders ({orders.length})
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
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-t border-border"
                      >
                        <td className="p-3">
                          {fmtDate(o.createdAt)}
                        </td>
                        <td className="p-3">
                          {o.customerEmail || "—"}
                        </td>
                        <td className="p-3">
                          {o.isSubscription
                            ? "Subscription"
                            : "One-time"}
                        </td>
                        <td className="p-3">
                          {o.status || "—"}
                        </td>
                        <td className="p-3">
                          {money(o.amountTotal, o.currency)}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            className="h-8"
                            onClick={() => openOrder(o.id)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {!orders.length && (
                      <tr>
                        <td
                          className="p-4 text-muted-foreground"
                          colSpan={6}
                        >
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

        {tab === "wholesale" && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="font-semibold">
                  Wholesale applications (
                  {filteredWholesale.length})
                </div>
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
                      <tr
                        key={r.id}
                        className="border-t border-border"
                      >
                        <td className="p-3">
                          {r.businessName}
                        </td>
                        <td className="p-3">
                          {r.contactName}
                        </td>
                        <td className="p-3">{r.email}</td>
                        <td className="p-3">
                          <code>{r.status}</code>
                        </td>
                        <td className="p-3">
                          <select
                            value={r.status}
                            onChange={(e) =>
                              updateWholesaleStatus(
                                r.id,
                                e.target.value as any
                              )
                            }
                            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                          >
                            <option value="new">new</option>
                            <option value="reviewing">
                              reviewing
                            </option>
                            <option value="approved">
                              approved
                            </option>
                            <option value="rejected">
                              rejected
                            </option>
                            <option value="closed">
                              closed
                            </option>
                          </select>
                        </td>
                      </tr>
                    ))}

                    {!filteredWholesale.length && (
                      <tr>
                        <td
                          className="p-4 text-muted-foreground"
                          colSpan={5}
                        >
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
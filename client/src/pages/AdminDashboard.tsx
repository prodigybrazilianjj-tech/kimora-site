// client/src/pages/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type WholesaleStatus = "new" | "reviewing" | "approved" | "rejected" | "closed";

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
  status: WholesaleStatus;

  // optional fields your backend sets (not required for UI)
  source?: string | null;
  metadata?: any | null;
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

type OrderItemRow = {
  id: string;
  createdAt?: string;
  orderId: string;
  stripePriceId?: string | null;
  stripeLineItemId?: string | null;
  flavor: string;
  purchaseType: "onetime" | "subscribe";
  frequencyWeeks?: number | null;
  quantity: number;
  unitAmount?: number | null;
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
  // Keep relative for same-origin deployments (Render, Vite proxy, etc.)
  return "";
}

function toPlainHeaders(h?: HeadersInit): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => (out[k] = v));
    return out;
  }
  if (Array.isArray(h)) {
    const out: Record<string, string> = {};
    for (const [k, v] of h) out[k] = v;
    return out;
  }
  return { ...(h as Record<string, string>) };
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const headers = toPlainHeaders(init?.headers);

  // Only set JSON content-type if we have a body and caller didn't override it
  const hasBody = init?.body !== undefined && init?.body !== null;
  if (hasBody && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Send BOTH headers so server can accept either
  headers["x-admin-token"] = token;
  headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(base + path, {
    ...(init || {}),
    headers,
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

const TOKEN_KEY = "adminToken";

export default function AdminDashboard() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");

  const [tab, setTab] = useState<TabKey>("overview");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Overview / summary
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderQ, setOrderQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderMode, setOrderMode] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderRow | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItemRow[] | null>(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);

  // Wholesale
  const [wholesale, setWholesale] = useState<WholesaleRow[]>([]);
  const [wholesaleLoading, setWholesaleLoading] = useState(false);
  const [wholesaleQ, setWholesaleQ] = useState("");
  const [wholesaleStatusFilter, setWholesaleStatusFilter] = useState<"" | WholesaleStatus>("");
  const [updatingWholesaleId, setUpdatingWholesaleId] = useState<string | null>(null);

  const canAuth = Boolean(savedToken);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY) || "";
    setToken(t);
    setSavedToken(t);
  }, []);

  function saveToken() {
    const t = token.trim();
    localStorage.setItem(TOKEN_KEY, t);
    setSavedToken(t);
    setErrorMsg(null);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setSavedToken("");
    setErrorMsg(null);

    setSummary(null);
    setOrders([]);
    setWholesale([]);
    setSelectedOrderId(null);
    setSelectedOrderDetail(null);
    setSelectedOrderItems(null);
  }

  async function loadSummary() {
    if (!savedToken) return;
    setSummaryLoading(true);
    setErrorMsg(null);
    try {
      const data = await api<{ ok: true; summary: Summary }>("/api/admin/summary", savedToken);
      setSummary(data.summary);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to load summary.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadOrders() {
    if (!savedToken) return;
    setOrdersLoading(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams();
      if (orderQ.trim()) qs.set("q", orderQ.trim());
      if (orderStatus.trim()) qs.set("status", orderStatus.trim());
      if (orderMode.trim()) qs.set("mode", orderMode.trim());

      const url = `/api/admin/orders${qs.toString() ? `?${qs.toString()}` : ""}`;
      const data = await api<{ ok: true; rows: OrderRow[] }>(url, savedToken);

      setOrders(data.rows || []);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadWholesale() {
    if (!savedToken) return;
    setWholesaleLoading(true);
    setErrorMsg(null);
    try {
      const data = await api<{ ok: true; rows: WholesaleRow[] }>(
        "/api/admin/wholesale-applications",
        savedToken,
      );
      setWholesale(data.rows || []);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to load wholesale applications.");
    } finally {
      setWholesaleLoading(false);
    }
  }

  async function openOrder(id: string) {
    if (!savedToken) return;
    setSelectedOrderId(id);
    setSelectedOrderDetail(null);
    setSelectedOrderItems(null);
    setOrderDetailLoading(true);
    setErrorMsg(null);

    try {
      const data = await api<{ ok: true; order: OrderRow; items: OrderItemRow[] }>(
        `/api/admin/orders/${id}`,
        savedToken,
      );

      setSelectedOrderDetail(data.order);
      setSelectedOrderItems(data.items || []);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to load order detail.");
    } finally {
      setOrderDetailLoading(false);
    }
  }

  async function updateWholesaleStatus(id: string, status: WholesaleStatus) {
    if (!savedToken) return;

    setUpdatingWholesaleId(id);
    setErrorMsg(null);

    try {
      await api<{ ok: true }>(`/api/admin/wholesale-applications/${id}`, savedToken, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      // Optimistic-ish: update local state immediately (then refresh to stay accurate)
      setWholesale((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      await loadWholesale();
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to update wholesale status.");
      // If patch failed, refresh anyway
      await loadWholesale().catch(() => {});
    } finally {
      setUpdatingWholesaleId(null);
    }
  }

  // Initial load when token present
  useEffect(() => {
    if (!savedToken) return;
    loadSummary().catch(() => {});
    loadOrders().catch(() => {});
    loadWholesale().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          r.websiteOrInstagram ?? "",
          r.businessType ?? "",
          r.businessTypeOther ?? "",
          r.notes ?? "",
        ]
          .map((x) => String(x || "").toLowerCase())
          .join(" | ");
        return hay.includes(q);
      });
    }

    return rows;
  }, [wholesale, wholesaleQ, wholesaleStatusFilter]);

  const computedOrderStats = useMemo(() => {
    const paid = orders.filter((o) => String(o.status || "").toLowerCase() === "paid");
    const refunded = orders.filter((o) => String(o.status || "").toLowerCase() === "refunded");
    const subs = orders.filter((o) => Boolean(o.isSubscription));
    const one = orders.filter((o) => !o.isSubscription);

    const currency = (orders.find((o) => o.currency)?.currency || "usd") as string;

    const revenueCents = paid.reduce((acc, o) => acc + (o.amountTotal || 0), 0);
    const aovCents = paid.length ? Math.round(revenueCents / paid.length) : 0;

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

  const overview = summary || {
    totalOrders: computedOrderStats.count,
    totalRevenueCents: computedOrderStats.revenueCents,
    aovCents: computedOrderStats.aovCents,
    paidOrders: computedOrderStats.paidCount,
    refundedOrders: computedOrderStats.refundedCount,
    subscriptionOrders: computedOrderStats.subCount,
    onetimeOrders: computedOrderStats.oneCount,
  };

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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button onClick={saveToken} className="h-10">
              Save token
            </Button>
            <Button variant="outline" onClick={clearToken} className="h-10">
              Clear
            </Button>
          </div>
        </div>

        {!canAuth && (
          <div className="mt-8 rounded-lg border border-border p-5">
            <div className="font-semibold">Token required</div>
            <p className="text-sm text-muted-foreground mt-1">
              Set <code>ADMIN_DASHBOARD_TOKEN</code> in Render, paste it here, then click{" "}
              <b>Save token</b>.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm">
            <div className="font-semibold text-red-600">Error</div>
            <div className="text-muted-foreground mt-1">{errorMsg}</div>
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
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={loadSummary} disabled={summaryLoading}>
                {summaryLoading ? "Refreshing…" : "Refresh overview"}
              </Button>
              <Button variant="outline" onClick={loadOrders} disabled={ordersLoading}>
                {ordersLoading ? "Refreshing…" : "Refresh orders"}
              </Button>
              <Button variant="outline" onClick={loadWholesale} disabled={wholesaleLoading}>
                {wholesaleLoading ? "Refreshing…" : "Refresh wholesale"}
              </Button>
            </div>
          )}
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid gap-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Total revenue</div>
                <div className="text-2xl font-bold mt-1">{money(overview.totalRevenueCents, "usd")}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Source: {summary ? "server summary" : "computed from loaded orders"}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Total orders</div>
                <div className="text-2xl font-bold mt-1">{overview.totalOrders}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {overview.subscriptionOrders} subscription • {overview.onetimeOrders} one-time
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Avg order value</div>
                <div className="text-2xl font-bold mt-1">{money(overview.aovCents, "usd")}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Paid: {overview.paidOrders} • Refunded: {overview.refundedOrders}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Quick health</div>
                <div className="text-lg font-semibold mt-2">
                  {canAuth ? "Authenticated ✅" : "Token missing ❌"}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Orders loaded: {orders.length} • Wholesale loaded: {wholesale.length}
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
                    placeholder="Search email, session id, shipping name..."
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">All status</option>
                  <option value="paid">paid</option>
                  <option value="refunded">refunded</option>
                </select>

                <select
                  value={orderMode}
                  onChange={(e) => setOrderMode(e.target.value)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">All types</option>
                  <option value="payment">One-time</option>
                  <option value="subscription">Subscription</option>
                </select>

                <Button onClick={loadOrders} className="h-10" disabled={ordersLoading}>
                  {ordersLoading ? "Loading…" : "Apply"}
                </Button>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Tip: “mode=subscription” maps to <code>orders.isSubscription</code> on the server.
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="font-semibold">Orders ({orders.length})</div>
                <div className="text-sm text-muted-foreground">
                  Paid revenue (loaded): {money(computedOrderStats.revenueCents, computedOrderStats.currency)}
                  {" • "}
                  AOV: {money(computedOrderStats.aovCents, computedOrderStats.currency)}
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
                      <tr key={o.id} className="border-t border-border">
                        <td className="p-3">{fmtDate(o.createdAt)}</td>
                        <td className="p-3">{o.customerEmail || "—"}</td>
                        <td className="p-3">{o.isSubscription ? "Subscription" : "One-time"}</td>
                        <td className="p-3">{o.status || "—"}</td>
                        <td className="p-3">{money(o.amountTotal, o.currency)}</td>
                        <td className="p-3">
                          <Button
                            variant="outline"
                            className="h-8"
                            onClick={() => openOrder(o.id)}
                            disabled={orderDetailLoading && selectedOrderId === o.id}
                          >
                            {orderDetailLoading && selectedOrderId === o.id ? "Loading…" : "View"}
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {!orders.length && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={6}>
                          {ordersLoading ? "Loading…" : "No orders found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order detail */}
            {selectedOrderId && (
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="font-semibold">Order detail</div>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      setSelectedOrderId(null);
                      setSelectedOrderDetail(null);
                      setSelectedOrderItems(null);
                    }}
                  >
                    Close
                  </Button>
                </div>

                {orderDetailLoading && (
                  <div className="mt-3 text-sm text-muted-foreground">Loading order…</div>
                )}

                {!orderDetailLoading && selectedOrderDetail && (
                  <div className="mt-4 grid gap-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="rounded-md border border-border p-3">
                        <div className="text-xs text-muted-foreground">Created</div>
                        <div className="font-medium mt-1">{fmtDate(selectedOrderDetail.createdAt)}</div>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <div className="text-xs text-muted-foreground">Customer</div>
                        <div className="font-medium mt-1">{selectedOrderDetail.customerEmail || "—"}</div>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="font-medium mt-1">
                          {money(selectedOrderDetail.amountTotal, selectedOrderDetail.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Subtotal: {money(selectedOrderDetail.amountSubtotal, selectedOrderDetail.currency)}
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="rounded-md border border-border p-3">
                        <div className="text-xs text-muted-foreground">Shipping</div>
                        <div className="font-medium mt-1">
                          {selectedOrderDetail.shippingName || "—"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {oneLineAddress(selectedOrderDetail.shippingAddress)}
                        </div>
                      </div>

                      <div className="rounded-md border border-border p-3">
                        <div className="text-xs text-muted-foreground">Stripe IDs</div>
                        <div className="text-sm mt-2 space-y-1">
                          <div>
                            <span className="text-muted-foreground">Session:</span>{" "}
                            <code className="text-xs">{selectedOrderDetail.stripeCheckoutSessionId || "—"}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">PaymentIntent:</span>{" "}
                            <code className="text-xs">{selectedOrderDetail.stripePaymentIntentId || "—"}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Subscription:</span>{" "}
                            <code className="text-xs">{selectedOrderDetail.stripeSubscriptionId || "—"}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Customer:</span>{" "}
                            <code className="text-xs">{selectedOrderDetail.stripeCustomerId || "—"}</code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border overflow-hidden">
                      <div className="p-3 border-b border-border font-medium">
                        Items ({selectedOrderItems?.length || 0})
                      </div>
                      <div className="overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="p-3 text-left">Flavor</th>
                              <th className="p-3 text-left">Type</th>
                              <th className="p-3 text-left">Qty</th>
                              <th className="p-3 text-left">Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedOrderItems || []).map((it) => (
                              <tr key={it.id} className="border-t border-border">
                                <td className="p-3">{it.flavor}</td>
                                <td className="p-3">
                                  {it.purchaseType === "subscribe"
                                    ? `subscribe${it.frequencyWeeks ? ` (${it.frequencyWeeks}w)` : ""}`
                                    : "onetime"}
                                </td>
                                <td className="p-3">{it.quantity}</td>
                                <td className="p-3">{money(it.unitAmount ?? null, selectedOrderDetail.currency)}</td>
                              </tr>
                            ))}

                            {!selectedOrderItems?.length && (
                              <tr>
                                <td className="p-4 text-muted-foreground" colSpan={4}>
                                  No items found for this order.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <details className="rounded-md border border-border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Raw JSON (order + items)
                      </summary>
                      <pre className="mt-3 text-xs overflow-auto bg-muted/30 rounded-md p-3">
                        {JSON.stringify(
                          { order: selectedOrderDetail, items: selectedOrderItems },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "wholesale" && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-lg border border-border p-4">
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-[220px]">
                  <input
                    value={wholesaleQ}
                    onChange={(e) => setWholesaleQ(e.target.value)}
                    placeholder="Search business, contact, email, notes..."
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <select
                  value={wholesaleStatusFilter}
                  onChange={(e) => setWholesaleStatusFilter(e.target.value as any)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="">All status</option>
                  <option value="new">new</option>
                  <option value="reviewing">reviewing</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="closed">closed</option>
                </select>

                <Button onClick={loadWholesale} className="h-10" disabled={wholesaleLoading}>
                  {wholesaleLoading ? "Loading…" : "Refresh"}
                </Button>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Showing {filteredWholesale.length} of {wholesale.length}.
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="font-semibold">Wholesale applications ({filteredWholesale.length})</div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-3 text-left">Created</th>
                      <th className="p-3 text-left">Business</th>
                      <th className="p-3 text-left">Contact</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWholesale.map((r) => (
                      <tr key={r.id} className="border-t border-border align-top">
                        <td className="p-3 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                        <td className="p-3">
                          <div className="font-medium">{r.businessName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {r.city}, {r.state} • members: {r.memberCount}
                          </div>

                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-muted-foreground">
                              Details
                            </summary>
                            <div className="mt-2 text-xs space-y-1">
                              <div>
                                <span className="text-muted-foreground">Phone:</span>{" "}
                                <span className="font-medium">{r.phone}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Website/IG:</span>{" "}
                                <span className="font-medium">{r.websiteOrInstagram || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Business type:</span>{" "}
                                <span className="font-medium">
                                  {r.businessType || "—"}
                                  {r.businessType === "other" && r.businessTypeOther
                                    ? ` (${r.businessTypeOther})`
                                    : ""}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Retail setup:</span>{" "}
                                <span className="font-medium">{r.retailSetup || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Interested:</span>{" "}
                                <span className="font-medium">
                                  onShelf={String(Boolean(r.interestedOnShelf))},{" "}
                                  coachAffiliate={String(Boolean(r.interestedCoachAffiliate))},{" "}
                                  eventSponsorship={String(Boolean(r.interestedEventSponsorship))}
                                </span>
                              </div>
                              <div className="pt-2">
                                <div className="text-muted-foreground">Notes</div>
                                <div className="mt-1 whitespace-pre-wrap">{r.notes || "—"}</div>
                              </div>
                              <details className="pt-2">
                                <summary className="cursor-pointer text-muted-foreground">Raw JSON</summary>
                                <pre className="mt-2 overflow-auto bg-muted/30 rounded-md p-2">
                                  {JSON.stringify(r, null, 2)}
                                </pre>
                              </details>
                            </div>
                          </details>
                        </td>

                        <td className="p-3">{r.contactName}</td>
                        <td className="p-3">{r.email}</td>
                        <td className="p-3">
                          <code>{r.status}</code>
                        </td>
                        <td className="p-3">
                          <select
                            value={r.status}
                            disabled={updatingWholesaleId === r.id}
                            onChange={(e) =>
                              updateWholesaleStatus(r.id, e.target.value as WholesaleStatus)
                            }
                            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                          >
                            <option value="new">new</option>
                            <option value="reviewing">reviewing</option>
                            <option value="approved">approved</option>
                            <option value="rejected">rejected</option>
                            <option value="closed">closed</option>
                          </select>
                          {updatingWholesaleId === r.id && (
                            <div className="text-xs text-muted-foreground mt-1">Updating…</div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {!filteredWholesale.length && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={6}>
                          {wholesaleLoading ? "Loading…" : "No wholesale applications found."}
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
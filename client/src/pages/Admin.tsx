import { useEffect, useMemo, useState } from "react";

type OrderRow = {
  id: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  customerEmail?: string | null;
  currency: string;
  amountSubtotal?: number | null;
  amountTotal?: number | null;
  isSubscription: boolean;
  status: string;
  shippingName?: string | null;
  shippingAddress?: any;
  createdAt: string;
  items?: any[];
};

function formatMoney(amountCents?: number | null, currency?: string | null) {
  if (amountCents == null) return "";
  const ccy = String(currency || "usd").toUpperCase();
  const dollars = amountCents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: ccy,
    }).format(dollars);
  } catch {
    return `${ccy} ${dollars.toFixed(2)}`;
  }
}

function addrOneLine(addr: any) {
  if (!addr) return "";
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

const LS_KEY = "kimora_admin_token";

export default function Admin() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(LS_KEY) || "");
  const [limit, setLimit] = useState<number>(50);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token.trim()) h["x-admin-token"] = token.trim();
    return h;
  }, [token]);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders?limit=${encodeURIComponent(String(limit))}`, {
        headers,
      });

      if (res.status === 401) {
        setOrders([]);
        setError("Unauthorized. Check your ADMIN token.");
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setOrders([]);
        setError(data?.message || "Failed to load orders.");
        return;
      }

      setOrders(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token.trim()) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveToken() {
    localStorage.setItem(LS_KEY, token.trim());
  }

  function clearToken() {
    localStorage.removeItem(LS_KEY);
    setToken("");
    setOrders([]);
    setError("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold mb-2">Admin</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Uses <code className="px-1 py-0.5 rounded bg-muted">ADMIN_DASHBOARD_TOKEN</code> via{" "}
          <code className="px-1 py-0.5 rounded bg-muted">x-admin-token</code>.
        </p>

        <div className="flex flex-col md:flex-row gap-3 md:items-end mb-6">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1">Admin token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste ADMIN_DASHBOARD_TOKEN"
              className="w-full px-3 py-2 rounded border border-border bg-background"
              type="password"
              autoComplete="off"
            />
          </div>

          <div className="w-full md:w-36">
            <label className="block text-xs text-muted-foreground mb-1">Limit</label>
            <input
              value={String(limit)}
              onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value || 50))))}
              className="w-full px-3 py-2 rounded border border-border bg-background"
              type="number"
              min={1}
              max={500}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                saveToken();
                loadOrders();
              }}
              className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold"
              disabled={loading || !token.trim()}
            >
              {loading ? "Loading…" : "Load Orders"}
            </button>

            <button
              onClick={clearToken}
              className="px-4 py-2 rounded border border-border"
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 p-3 rounded border border-destructive/40 bg-destructive/10 text-destructive">
            {error}
          </div>
        ) : null}

        <div className="rounded border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="font-semibold">Orders</div>
            <div className="text-xs text-muted-foreground">{orders.length} rows</div>
          </div>

          <div className="divide-y divide-border">
            {orders.map((o) => (
              <div key={o.id} className="px-4 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="font-semibold">
                    {o.shippingName || o.customerEmail || "Order"}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="px-2 py-1 rounded bg-muted mr-2">
                      {o.isSubscription ? "subscription" : "one-time"}
                    </span>
                    <span className="px-2 py-1 rounded bg-muted mr-2">{o.status}</span>
                    <span className="font-semibold">
                      {formatMoney(o.amountTotal, o.currency)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Session:</span>{" "}
                    <code className="text-xs">{o.stripeCheckoutSessionId}</code>
                  </div>
                  {o.shippingAddress ? (
                    <div>
                      <span className="font-medium text-foreground">Ship:</span>{" "}
                      {addrOneLine(o.shippingAddress)}
                    </div>
                  ) : null}
                </div>

                {Array.isArray(o.items) && o.items.length ? (
                  <div className="mt-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      Items
                    </div>
                    <ul className="text-sm list-disc pl-5">
                      {o.items.map((it: any) => (
                        <li key={it.id}>
                          {it.flavor} • {it.purchaseType}
                          {it.frequencyWeeks ? ` • ${it.frequencyWeeks}w` : ""} • qty{" "}
                          {it.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}

            {!orders.length && !loading ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">
                No orders loaded yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
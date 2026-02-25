// client/src/pages/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";

type WholesaleRow = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  websiteOrInstagram?: string | null;
  city: string;
  state: string;
  businessType: string;
  businessTypeOther?: string | null;
  memberCount: number;
  retailSetup?: string | null;
  interestedOnShelf: boolean;
  interestedCoachAffiliate: boolean;
  interestedEventSponsorship: boolean;
  notes?: string | null;
  status: "new" | "reviewing" | "approved" | "rejected" | "closed";
  createdAt: string;
};

const LS_KEY = "kimora_admin_token";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function digitsPretty(phone: string) {
  const d = String(phone || "").replace(/[^\d]/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(LS_KEY) || "";
  });

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WholesaleRow[]>([]);
  const [error, setError] = useState<string>("");

  const [filter, setFilter] = useState<
    "all" | "new" | "reviewing" | "approved" | "rejected" | "closed"
  >("all");

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/wholesale-applications", {
        headers: {
          "x-admin-token": token.trim(),
        },
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Request failed (${resp.status})`);
      }

      const data = (await resp.json()) as { ok: boolean; rows: WholesaleRow[] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: any) {
      setError(String(e?.message || e || "Failed to load"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: WholesaleRow["status"]) {
    setError("");
    try {
      const resp = await fetch(`/api/admin/wholesale-applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token.trim(),
        },
        body: JSON.stringify({ status }),
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Update failed (${resp.status})`);
      }

      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e: any) {
      setError(String(e?.message || e || "Failed to update status"));
    }
  }

  function saveToken() {
    const t = token.trim();
    setToken(t);
    window.localStorage.setItem(LS_KEY, t);
  }

  function clearToken() {
    setToken("");
    window.localStorage.removeItem(LS_KEY);
  }

  useEffect(() => {
    // Auto-load if token exists
    if (token.trim()) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pt-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold tracking-wider">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Wholesale applications viewer (protected by <code>ADMIN_DASHBOARD_TOKEN</code>).
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Admin token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste ADMIN_DASHBOARD_TOKEN"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={saveToken}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  Save token
                </button>
                <button
                  onClick={clearToken}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={load}
                disabled={!token.trim() || loading}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary/90"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <div className="font-semibold text-destructive">Error</div>
              <div className="mt-1 text-destructive/90">{error}</div>
              <div className="mt-2 text-muted-foreground">
                Tip: make sure you set <code>ADMIN_DASHBOARD_TOKEN</code> in Render ENV and pasted the
                exact same value here.
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between bg-card px-4 py-3 border-b border-border">
            <div className="text-sm font-semibold">
              Applications <span className="text-muted-foreground">({filtered.length})</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-background px-4 py-8 text-sm text-muted-foreground">
              {token.trim()
                ? "No applications found (or filter hides them)."
                : "Paste your admin token above to load applications."}
            </div>
          ) : (
            <div className="divide-y divide-border bg-background">
              {filtered.map((r) => (
                <div key={r.id} className="px-4 py-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold">{r.businessName}</div>
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {r.status}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        {r.contactName} • {r.email} • {digitsPretty(r.phone)}
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        {r.city}, {r.state} • {r.businessType}
                        {r.businessType === "other" && r.businessTypeOther
                          ? ` (${r.businessTypeOther})`
                          : ""}
                        {" • "}Members: {r.memberCount}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        Submitted: {fmtDate(r.createdAt)}
                      </div>

                      {(r.websiteOrInstagram || r.notes) && (
                        <div className="mt-3 rounded-lg border border-border bg-card p-3">
                          {r.websiteOrInstagram ? (
                            <div className="text-sm">
                              <span className="font-semibold">Website/IG:</span>{" "}
                              <span className="text-muted-foreground">{r.websiteOrInstagram}</span>
                            </div>
                          ) : null}

                          {r.notes ? (
                            <div className="mt-2 text-sm">
                              <span className="font-semibold">Notes:</span>{" "}
                              <span className="text-muted-foreground whitespace-pre-wrap">
                                {r.notes}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <label className="text-xs text-muted-foreground">Update status</label>
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value as any)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="new">new</option>
                        <option value="reviewing">reviewing</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                        <option value="closed">closed</option>
                      </select>

                      <div className="mt-2 text-xs text-muted-foreground">
                        Interested:{" "}
                        {[
                          r.interestedOnShelf ? "onShelf" : null,
                          r.interestedCoachAffiliate ? "coachAffiliate" : null,
                          r.interestedEventSponsorship ? "eventSponsorship" : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}
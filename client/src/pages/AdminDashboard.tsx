import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

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

  shippingCarrier?: string | null;
  shippingTrackingNumber?: string | null;
  shippingLabelUrl?: string | null;
  shippingShipmentId?: string | null;
  trackingUrl?: string | null;

  orderNumber?: string | null;
  fulfillmentStatus?: FulfillmentStatus | string | null;
  fulfillmentCounts?: Record<string, number> | null;
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

type InventoryRow = {
  id: string;
  sku: string;
  flavor: string;
  productName: string;
  isActive?: boolean | null;
  onHandQuantity: number;
  reservedQuantity: number;
  reorderPoint: number;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;

  createdAt?: string;
};

type OrderDetailResponse = {
  ok: true;
  order: OrderRow;
  items: OrderItemRow[];
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
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function titleizeSlug(value?: string | null) {
  return String(value || "")
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function getApiBase() {
  return "";
}

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus();

  const maybeShowPicker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
  if (typeof maybeShowPicker === "function") {
    maybeShowPicker.call(input);
    return;
  }

  input.click();
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
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

async function downloadPdf(
  path: string,
  token: string,
  filenamePrefix: string,
  body?: Record<string, unknown>
) {
  const res = await fetch(getApiBase() + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
    },
    body: JSON.stringify(body || {}),
  });

  if (!res.ok) {
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    throw new Error(json?.message || text || `Request failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `${filenamePrefix}-${stamp}.pdf`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.open(url, "_blank", "noopener,noreferrer");

  setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return res.headers;
}

type TabKey = "overview" | "orders" | "inventory" | "wholesale";

const FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  "unfulfilled",
  "allocated",
  "packed",
  "shipped",
  "delivered",
  "backordered",
  "canceled",
];

function normalizeFulfillment(s: any): FulfillmentStatus {
  const v = String(s || "")
    .trim()
    .toLowerCase();
  return (
    FULFILLMENT_STATUSES.includes(v as FulfillmentStatus) ? v : "unfulfilled"
  ) as FulfillmentStatus;
}

function formatCounts(counts?: Record<string, number> | null) {
  if (!counts) return "";
  const parts = FULFILLMENT_STATUSES.map((k) => {
    const n = Number((counts as any)[k] ?? 0);
    return n > 0 ? `${k}:${n}` : "";
  }).filter(Boolean);
  return parts.join(" • ");
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function AdminDashboard() {
  const { toast } = useToast();

  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");

  const [tab, setTab] = useState<TabKey>("overview");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [orderQ, setOrderQ] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [orderMode, setOrderMode] = useState("");
  const [orderFulfillmentFilter, setOrderFulfillmentFilter] = useState("");
  const [orderDateFrom, setOrderDateFrom] = useState("");
  const [orderDateTo, setOrderDateTo] = useState("");

  const [orderFulfillmentEdits, setOrderFulfillmentEdits] = useState<
    Record<string, FulfillmentStatus>
  >({});
  const [orderFulfillmentOriginals, setOrderFulfillmentOriginals] = useState<
    Record<string, FulfillmentStatus>
  >({});
  const [savingAllOrders, setSavingAllOrders] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderRow | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItemRow[]>([]);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState<string | null>(null);

  const [itemEdits, setItemEdits] = useState<
    Record<string, { fulfillmentStatus: FulfillmentStatus; carrier: string; trackingNumber: string }>
  >({});

  const [wholesale, setWholesale] = useState<WholesaleRow[]>([]);
  const [wholesaleLoading, setWholesaleLoading] = useState(false);
  const [wholesaleError, setWholesaleError] = useState<string | null>(null);
  const [wholesaleQ, setWholesaleQ] = useState("");
  const [wholesaleStatusFilter, setWholesaleStatusFilter] = useState<
    "" | WholesaleRow["status"]
  >("");

  const [labelsLoading, setLabelsLoading] = useState(false);
  const [packingSlipsLoading, setPackingSlipsLoading] = useState(false);
  const [singlePackingSlipOrderId, setSinglePackingSlipOrderId] = useState<string | null>(null);

  const fromDateInputRef = useRef<HTMLInputElement | null>(null);
  const toDateInputRef = useRef<HTMLInputElement | null>(null);
  const orderFulfillmentEditsRef = useRef<Record<string, FulfillmentStatus>>({});

  const canAuth = Boolean(savedToken);

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
    setSavedToken(t);
  }, []);

  useEffect(() => {
    orderFulfillmentEditsRef.current = orderFulfillmentEdits;
  }, [orderFulfillmentEdits]);

  function setOrderFulfillmentValue(orderId: string, status: FulfillmentStatus) {
    orderFulfillmentEditsRef.current = {
      ...orderFulfillmentEditsRef.current,
      [orderId]: status,
    };

    setOrderFulfillmentEdits((prev) => ({
      ...prev,
      [orderId]: status,
    }));
  }

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
    setSummaryError(null);
    setOrders([]);
    setOrdersError(null);
    setInventory([]);
    setInventoryError(null);
    setOrderFulfillmentEdits({});
    setOrderFulfillmentOriginals({});
    orderFulfillmentEditsRef.current = {};
    setWholesale([]);
    setWholesaleError(null);
    closeOrder();
  }

  async function loadSummary(showToast = false) {
    if (!savedToken) return;
    try {
      setSummaryError(null);
      const data = await api<{ ok: true; summary: Summary }>("/api/admin/summary", savedToken);
      setSummary(data.summary);
    } catch (e: any) {
      const msg = String(e?.message || "Failed to load summary.");
      setSummaryError(msg);
      if (showToast) {
        toast({ title: "Overview load failed", description: msg });
      }
      throw e;
    }
  }

  async function loadOrders(showToast = false) {
    if (!savedToken) return;
    setOrdersLoading(true);
    try {
      setOrdersError(null);

      const qs = new URLSearchParams();
      if (orderQ.trim()) qs.set("q", orderQ.trim());
      if (orderStatus.trim()) qs.set("status", orderStatus.trim());
      if (orderMode.trim()) qs.set("mode", orderMode.trim());
      if (orderFulfillmentFilter.trim()) qs.set("fulfillment", orderFulfillmentFilter.trim());
      if (orderDateFrom.trim()) qs.set("dateFrom", orderDateFrom.trim());
      if (orderDateTo.trim()) qs.set("dateTo", orderDateTo.trim());

      const url = `/api/admin/orders${qs.toString() ? `?${qs.toString()}` : ""}`;
      const data = await api<{ ok: true; rows: OrderRow[] }>(url, savedToken);
      const rows = (data.rows || []) as OrderRow[];
      setOrders(rows);

      const seeded: Record<string, FulfillmentStatus> = {};
      for (const r of rows) {
        seeded[r.id] = normalizeFulfillment(r.fulfillmentStatus);
      }
      setOrderFulfillmentEdits(seeded);
      setOrderFulfillmentOriginals(seeded);
      orderFulfillmentEditsRef.current = seeded;
    } catch (e: any) {
      const msg = String(e?.message || "Failed to load orders.");
      setOrders([]);
      setOrdersError(msg);
      if (showToast) {
        toast({ title: "Orders load failed", description: msg });
      }
      throw e;
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadInventory(showToast = false) {
    if (!savedToken) return;
    setInventoryLoading(true);
    try {
      setInventoryError(null);
      const data = await api<{ ok: true; rows: InventoryRow[] }>("/api/admin/inventory", savedToken);
      setInventory(data.rows || []);
    } catch (e: any) {
      const msg = String(e?.message || "Failed to load inventory.");
      setInventory([]);
      setInventoryError(msg);
      if (showToast) {
        toast({ title: "Inventory load failed", description: msg });
      }
      throw e;
    } finally {
      setInventoryLoading(false);
    }
  }

  async function loadWholesale(showToast = false) {
    if (!savedToken) return;
    setWholesaleLoading(true);
    try {
      setWholesaleError(null);
      const data = await api<{ ok: true; rows: WholesaleRow[] }>(
        "/api/admin/wholesale-applications",
        savedToken
      );
      setWholesale(data.rows || []);
    } catch (e: any) {
      const msg = String(e?.message || "Failed to load wholesale applications.");
      setWholesale([]);
      setWholesaleError(msg);
      if (showToast) {
        toast({ title: "Wholesale load failed", description: msg });
      }
      throw e;
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
      const data = await api<OrderDetailResponse>(`/api/admin/orders/${id}`, savedToken);

      setSelectedOrderDetail(data.order);

      const items = (data.items || []) as OrderItemRow[];
      setSelectedOrderItems(items);

      const seeded: Record<
        string,
        { fulfillmentStatus: FulfillmentStatus; carrier: string; trackingNumber: string }
      > = {};
      for (const it of items) {
        const status = normalizeFulfillment(it.fulfillmentStatus);
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

    try {
      await api<{ ok: true }>(`/api/admin/wholesale-applications/${id}`, savedToken, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      toast({ title: "Saved", description: `Wholesale status updated to ${status}` });
      await loadWholesale();
    } catch (e: any) {
      const msg = String(e?.message || "Failed to update wholesale status.");
      toast({ title: "Save failed", description: msg });
    }
  }

  async function saveItemFulfillment(itemId: string) {
    if (!savedToken) return;

    const edit = itemEdits[itemId];
    if (!edit) return;

    try {
      await api<{ ok: true }>(`/api/admin/order-items/${itemId}/fulfillment`, savedToken, {
        method: "PATCH",
        body: JSON.stringify({
          fulfillmentStatus: edit.fulfillmentStatus,
          carrier: edit.carrier || null,
          trackingNumber: edit.trackingNumber || null,
        }),
      });

      toast({ title: "Saved", description: "Item updated" });

      if (selectedOrderId) {
        await openOrder(selectedOrderId);
      }
      await loadOrders();
    } catch (e: any) {
      const msg = String(e?.message || "Failed to update item.");
      toast({ title: "Save failed", description: msg });
    }
  }

  async function saveOrderFulfillment(orderId: string) {
    if (!savedToken) return;
    const status = orderFulfillmentEditsRef.current[orderId] || "unfulfilled";
    try {
      await api<{ ok: true }>(`/api/admin/orders/${orderId}/fulfillment`, savedToken, {
        method: "PATCH",
        body: JSON.stringify({ fulfillmentStatus: status }),
      });

      setOrderFulfillmentOriginals((prev) => ({
        ...prev,
        [orderId]: status,
      }));

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                fulfillmentStatus: status,
              }
            : order
        )
      );

      toast({ title: "Saved", description: `Order set to ${status}` });

      if (selectedOrderId === orderId) {
        await openOrder(orderId);
      }
    } catch (e: any) {
      const msg = String(e?.message || "Failed to update order fulfillment.");
      toast({ title: "Save failed", description: msg });
    }
  }

  async function saveAllOrderFulfillmentChanges() {
    if (!savedToken || savingAllOrders) return;

    const editSnapshot: Record<string, FulfillmentStatus> = {
      ...orderFulfillmentEditsRef.current,
    };

    const changedOrderIds = orders
      .map((o) => o.id)
      .filter((id) => {
        const current = editSnapshot[id] || "unfulfilled";
        const original = orderFulfillmentOriginals[id] || "unfulfilled";
        return current !== original;
      });

    if (!changedOrderIds.length) {
      toast({ title: "No changes", description: "No order fulfillment changes to save." });
      return;
    }

    setSavingAllOrders(true);

    try {
      let successCount = 0;
      const failures: Array<{ orderId: string; message: string }> = [];
      const succeededOrderIdMap: Record<string, true> = {};

      for (const orderId of changedOrderIds) {
        const status = editSnapshot[orderId] || "unfulfilled";
        try {
          await api<{ ok: true }>(`/api/admin/orders/${orderId}/fulfillment`, savedToken, {
            method: "PATCH",
            body: JSON.stringify({ fulfillmentStatus: status }),
          });
          successCount += 1;
          succeededOrderIdMap[orderId] = true;
        } catch (e: any) {
          failures.push({
            orderId,
            message: String(e?.message || "Failed to update order."),
          });
        }
      }

      if (successCount > 0) {
        setOrders((prev) =>
          prev.map((order) =>
            succeededOrderIdMap[order.id]
              ? {
                  ...order,
                  fulfillmentStatus: editSnapshot[order.id] || "unfulfilled",
                }
              : order
          )
        );

        setOrderFulfillmentEdits((prev) => {
          const next = { ...prev };
          for (const orderId in succeededOrderIdMap) {
            next[orderId] = editSnapshot[orderId] || "unfulfilled";
          }
          return next;
        });

        setOrderFulfillmentOriginals((prev) => {
          const next = { ...prev };
          for (const orderId in succeededOrderIdMap) {
            next[orderId] = editSnapshot[orderId] || "unfulfilled";
          }
          return next;
        });

        orderFulfillmentEditsRef.current = {
          ...orderFulfillmentEditsRef.current,
          ...Object.keys(succeededOrderIdMap).reduce<Record<string, FulfillmentStatus>>(
            (acc, orderId) => {
              acc[orderId] = editSnapshot[orderId] || "unfulfilled";
              return acc;
            },
            {}
          ),
        };
      }

      if (successCount > 0 && failures.length === 0) {
        toast({
          title: "Saved",
          description: `Saved ${successCount} order fulfillment change${
            successCount === 1 ? "" : "s"
          }.`,
        });
      } else if (successCount > 0 && failures.length > 0) {
        toast({
          title: "Partially saved",
          description: `${successCount} saved, ${failures.length} failed.`,
        });
      } else {
        toast({
          title: "Save failed",
          description: failures[0]?.message || "Failed to save order fulfillment changes.",
        });
      }

      if (selectedOrderId && succeededOrderIdMap[selectedOrderId]) {
        await openOrder(selectedOrderId);
      }
    } finally {
      setSavingAllOrders(false);
    }
  }

  function resetOrderFulfillmentChanges() {
    setOrderFulfillmentEdits(orderFulfillmentOriginals);
    orderFulfillmentEditsRef.current = { ...orderFulfillmentOriginals };
    toast({ title: "Reset", description: "Unsaved order fulfillment changes were reset." });
  }

  function clearOrderFilters() {
    setOrderQ("");
    setOrderStatus("");
    setOrderMode("");
    setOrderFulfillmentFilter("");
    setOrderDateFrom("");
    setOrderDateTo("");
  }

  async function generatePackedLabels() {
    if (!savedToken || labelsLoading) return;

    try {
      setLabelsLoading(true);
      toast({ title: "Generating labels…", description: "This can take a few seconds." });

      const headers = await downloadPdf(
        "/api/admin/labels/batch",
        savedToken,
        "kimora-labels-packed"
      );

      const errorCount = Number(headers.get("X-Label-Errors") || "0") || 0;

      toast({
        title: "Labels ready",
        description:
          errorCount > 0
            ? `Label PDF opened/downloaded. ${errorCount} label error${
                errorCount === 1 ? "" : "s"
              } appended at the end.`
            : "Label PDF opened/downloaded.",
      });

      await loadOrders();
      if (selectedOrderId) await openOrder(selectedOrderId);
    } catch (e: any) {
      const msg = String(e?.message || "Failed to generate labels.");
      toast({ title: "Labels failed", description: msg });
    } finally {
      setLabelsLoading(false);
    }
  }

  async function generatePackingSlips() {
    if (!savedToken || packingSlipsLoading) return;

    try {
      setPackingSlipsLoading(true);
      toast({ title: "Generating packing slips…", description: "This can take a few seconds." });

      await downloadPdf("/api/admin/packing-slips/batch", savedToken, "kimora-packing-slips");

      toast({
        title: "Packing slips ready",
        description: "Packing slip PDF opened/downloaded.",
      });
    } catch (e: any) {
      const msg = String(e?.message || "Failed to generate packing slips.");
      toast({ title: "Packing slips failed", description: msg });
    } finally {
      setPackingSlipsLoading(false);
    }
  }

  async function generateSinglePackingSlip(order: OrderRow) {
    if (!savedToken) return;

    const orderId = String(order.id || "").trim();
    if (!orderId) return;

    try {
      setSinglePackingSlipOrderId(orderId);
      toast({ title: "Generating packing slip…", description: "Opening single-order packing slip." });

      const niceOrderNumber = String(order.orderNumber || orderId).trim();
      await downloadPdf(
        "/api/admin/packing-slips/batch",
        savedToken,
        `kimora-packing-slip-${niceOrderNumber}`,
        { orderIds: [orderId] }
      );

      toast({
        title: "Packing slip ready",
        description: `Packing slip opened for order ${niceOrderNumber}.`,
      });
    } catch (e: any) {
      const msg = String(e?.message || "Failed to generate packing slip.");
      toast({ title: "Packing slip failed", description: msg });
    } finally {
      setSinglePackingSlipOrderId(null);
    }
  }

  useEffect(() => {
    if (!savedToken) return;
    loadSummary().catch(() => {});
    loadOrders().catch(() => {});
    loadInventory().catch(() => {});
    loadWholesale().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const packedCount = useMemo(() => {
    let n = 0;
    for (const o of orders) {
      const st = normalizeFulfillment(o.fulfillmentStatus);
      if (st === "packed") n += 1;
    }
    return n;
  }, [orders]);

  const changedOrderCount = useMemo(() => {
    return orders
      .map((o) => o.id)
      .filter((id) => {
        const current = orderFulfillmentEdits[id] || "unfulfilled";
        const original = orderFulfillmentOriginals[id] || "unfulfilled";
        return current !== original;
      }).length;
  }, [orders, orderFulfillmentEdits, orderFulfillmentOriginals]);

  const inventoryStats = useMemo(() => {
    let totalOnHand = 0;
    let totalReserved = 0;
    let lowStockCount = 0;

    for (const row of inventory) {
      const onHand = Number(row.onHandQuantity ?? 0) || 0;
      const reserved = Number(row.reservedQuantity ?? 0) || 0;
      const reorderPoint = Number(row.reorderPoint ?? 0) || 0;
      const available = onHand - reserved;

      totalOnHand += onHand;
      totalReserved += reserved;

      if (available <= reorderPoint) {
        lowStockCount += 1;
      }
    }

    return {
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
      lowStockCount,
    };
  }, [inventory]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Orders • Revenue • Inventory • Wholesale</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_DASHBOARD_TOKEN"
              className="h-10 w-[280px] max-w-full rounded-md border border-border bg-background px-3 text-sm"
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
            variant={tab === "inventory" ? "default" : "outline"}
            onClick={() => setTab("inventory")}
          >
            Inventory
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
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" onClick={() => loadSummary(true)}>
                Refresh overview
              </Button>
              <Button type="button" variant="outline" onClick={() => loadOrders(true)}>
                Refresh orders
              </Button>
              <Button type="button" variant="outline" onClick={() => loadInventory(true)}>
                Refresh inventory
              </Button>
              <Button type="button" variant="outline" onClick={() => loadWholesale(true)}>
                Refresh wholesale
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={generatePackingSlips}
                disabled={packingSlipsLoading || packedCount === 0}
                title={
                  packedCount === 0
                    ? "No packed orders yet"
                    : "Generate a packing slips PDF for packed orders"
                }
              >
                {packingSlipsLoading
                  ? "Generating slips…"
                  : `Packing slips${packedCount ? ` (${packedCount})` : ""}`}
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={generatePackedLabels}
                disabled={labelsLoading || packedCount === 0}
                title={
                  packedCount === 0
                    ? "No packed orders yet"
                    : "Creates EasyPost labels for packed orders and downloads a merged PDF"
                }
              >
                {labelsLoading
                  ? "Generating labels…"
                  : `Generate labels${packedCount ? ` (${packedCount})` : ""}`}
              </Button>
            </div>
          )}
        </div>

        {tab === "overview" && (
          <div className="mt-6 grid gap-4">
            {summaryError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                Failed to load overview: {summaryError}
              </div>
            )}

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
                <div className="text-2xl font-bold mt-1">
                  {summary ? money(summary.aovCents, "usd") : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Paid vs Refunded</div>
                <div className="text-lg font-semibold mt-2">
                  {summary ? `${summary.paidOrders} paid` : "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {summary ? `${summary.refundedOrders} refunded` : ""}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-lg border border-border p-4">
              <div className="grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Search</div>
                  <input
                    value={orderQ}
                    onChange={(e) => setOrderQ(e.target.value)}
                    placeholder="Order #, email, name, tracking..."
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Order status</div>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">All</option>
                    <option value="paid">paid</option>
                    <option value="refunded">refunded</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Type</div>
                  <select
                    value={orderMode}
                    onChange={(e) => setOrderMode(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">All</option>
                    <option value="payment">One-time</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Fulfillment</div>
                  <select
                    value={orderFulfillmentFilter}
                    onChange={(e) => setOrderFulfillmentFilter(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">All</option>
                    {FULFILLMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date from</div>
                  <div className="relative">
                    <input
                      ref={fromDateInputRef}
                      type="date"
                      value={orderDateFrom}
                      onChange={(e) => setOrderDateFrom(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => openNativeDatePicker(fromDateInputRef.current)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Open date picker for date from"
                      title="Open calendar"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date to</div>
                  <div className="relative">
                    <input
                      ref={toDateInputRef}
                      type="date"
                      value={orderDateTo}
                      onChange={(e) => setOrderDateTo(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => openNativeDatePicker(toDateInputRef.current)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Open date picker for date to"
                      title="Open calendar"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <Button type="button" onClick={() => loadOrders(true)} className="h-10">
                  Apply filters
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearOrderFilters();
                    setTimeout(() => {
                      loadOrders(true);
                    }, 0);
                  }}
                  className="h-10"
                >
                  Clear filters
                </Button>
              </div>

              {ordersLoading && <div className="mt-3 text-sm text-muted-foreground">Loading…</div>}
              {ordersError && (
                <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  Failed to load orders: {ordersError}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm text-muted-foreground">
                  {changedOrderCount > 0
                    ? `${changedOrderCount} unsaved fulfillment change${
                        changedOrderCount === 1 ? "" : "s"
                      }`
                    : "No unsaved fulfillment changes"}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetOrderFulfillmentChanges}
                    disabled={changedOrderCount === 0 || savingAllOrders}
                  >
                    Reset changes
                  </Button>
                  <Button
                    type="button"
                    onClick={saveAllOrderFulfillmentChanges}
                    disabled={changedOrderCount === 0 || savingAllOrders}
                  >
                    {savingAllOrders
                      ? "Saving changes…"
                      : `Save all changes${changedOrderCount ? ` (${changedOrderCount})` : ""}`}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="font-semibold">Orders ({orders.length})</div>
              </div>

              <div className="overflow-auto">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="w-[135px] p-3 text-left">Created</th>
                      <th className="w-[140px] p-3 text-left">Order #</th>
                      <th className="w-[190px] p-3 text-left">Email</th>
                      <th className="w-[100px] p-3 text-left">Type</th>
                      <th className="w-[90px] p-3 text-left">Status</th>
                      <th className="w-[280px] p-3 text-left">Fulfillment</th>
                      <th className="w-[220px] p-3 text-left">Shipment</th>
                      <th className="w-[100px] p-3 text-left">Total</th>
                      <th className="sticky right-0 z-10 w-[160px] border-l border-border bg-muted/40 p-3 text-left">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const edit =
                        orderFulfillmentEdits[o.id] || normalizeFulfillment(o.fulfillmentStatus);
                      const countsText = formatCounts(o.fulfillmentCounts);
                      const original = orderFulfillmentOriginals[o.id] || "unfulfilled";
                      const changed = edit !== original;
                      const packingSlipLoading = singlePackingSlipOrderId === o.id;

                      return (
                        <tr key={o.id} className="border-t border-border align-top">
                          <td className="p-3 text-xs leading-5">{fmtDate(o.createdAt)}</td>
                          <td className="p-3 font-mono text-[11px] break-all">
                            {o.orderNumber || "—"}
                          </td>
                          <td className="p-3 break-words">{o.customerEmail || "—"}</td>
                          <td className="p-3">{o.isSubscription ? "Subscription" : "One-time"}</td>
                          <td className="p-3">{o.status || "—"}</td>

                          <td className="p-3">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <select
                                  value={edit}
                                  onChange={(e) =>
                                    setOrderFulfillmentValue(
                                      o.id,
                                      e.target.value as FulfillmentStatus
                                    )
                                  }
                                  className={`h-8 rounded-md border bg-background px-2 text-sm ${
                                    changed ? "border-amber-500" : "border-border"
                                  }`}
                                  title="Sets ALL items in the order to this status"
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

                                {changed && <div className="text-xs text-amber-400">Unsaved</div>}
                              </div>

                              <div className="text-xs text-muted-foreground break-words">
                                {countsText || "—"}
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            {o.shippingTrackingNumber ? (
                              <div className="flex flex-col gap-2">
                                <div className="text-xs break-words">
                                  {o.shippingCarrier || "Carrier"} • {o.shippingTrackingNumber}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  {o.trackingUrl && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => openInNewTab(o.trackingUrl!)}
                                    >
                                      Track
                                    </Button>
                                  )}
                                  {o.shippingLabelUrl && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => openInNewTab(o.shippingLabelUrl!)}
                                    >
                                      Label
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="p-3">{money(o.amountTotal, o.currency)}</td>
                          <td className="sticky right-0 z-10 border-l border-border bg-background p-3">
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 w-full"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openOrder(o.id);
                                }}
                              >
                                View
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 w-full"
                                disabled={packingSlipLoading}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  generateSinglePackingSlip(o);
                                }}
                              >
                                {packingSlipLoading ? "Opening…" : "Packing slip"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {!orders.length && !ordersLoading && !ordersError && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={9}>
                          No orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {(selectedOrderId || orderDetailLoading || orderDetailError) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => closeOrder()}
                  role="button"
                  tabIndex={-1}
                />
                <div className="relative w-full max-w-5xl max-h-[85vh] overflow-auto rounded-xl border border-border bg-background shadow-lg">
                  <div className="sticky top-0 bg-background border-b border-border p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold">Order detail</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedOrderId ? `ID: ${selectedOrderId}` : ""}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {selectedOrderId && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9"
                            onClick={() =>
                              selectedOrderDetail
                                ? generateSinglePackingSlip(selectedOrderDetail)
                                : undefined
                            }
                            disabled={
                              orderDetailLoading ||
                              !selectedOrderDetail ||
                              singlePackingSlipOrderId === selectedOrderId
                            }
                          >
                            {singlePackingSlipOrderId === selectedOrderId
                              ? "Opening slip…"
                              : "Packing slip"}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-9"
                            onClick={() => openOrder(selectedOrderId)}
                            disabled={orderDetailLoading}
                          >
                            Refresh detail
                          </Button>
                        </>
                      )}
                      <Button type="button" variant="outline" className="h-9" onClick={closeOrder}>
                        Close
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    {orderDetailLoading && (
                      <div className="text-sm text-muted-foreground">Loading order…</div>
                    )}
                    {orderDetailError && (
                      <div className="text-sm text-red-400">{orderDetailError}</div>
                    )}

                    {selectedOrderDetail && (
                      <div className="mt-2 grid md:grid-cols-3 gap-4">
                        <div className="rounded-md border border-border p-3">
                          <div className="text-xs text-muted-foreground">Created</div>
                          <div className="font-medium mt-1">
                            {fmtDate(selectedOrderDetail.createdAt)}
                          </div>
                        </div>

                        <div className="rounded-md border border-border p-3">
                          <div className="text-xs text-muted-foreground">Order #</div>
                          <div className="font-medium mt-1 font-mono text-sm break-all">
                            {selectedOrderDetail.orderNumber || "—"}
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

                        <div className="md:col-span-2 rounded-md border border-border p-3">
                          <div className="text-xs text-muted-foreground">Shipping</div>
                          <div className="font-medium mt-1">
                            {selectedOrderDetail.shippingName || "—"}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {oneLineAddress(selectedOrderDetail.shippingAddress)}
                          </div>

                          {(selectedOrderDetail.shippingTrackingNumber ||
                            selectedOrderDetail.shippingLabelUrl) && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {selectedOrderDetail.shippingTrackingNumber && (
                                <div className="text-sm break-all">
                                  {selectedOrderDetail.shippingCarrier || "Carrier"} •{" "}
                                  {selectedOrderDetail.shippingTrackingNumber}
                                </div>
                              )}

                              {selectedOrderDetail.trackingUrl && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => openInNewTab(selectedOrderDetail.trackingUrl!)}
                                >
                                  Track package
                                </Button>
                              )}

                              {selectedOrderDetail.shippingLabelUrl && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() =>
                                    openInNewTab(selectedOrderDetail.shippingLabelUrl!)
                                  }
                                >
                                  View label
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

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

                                  const label = titleizeSlug(it.flavor || "");
                                  const purchaseLabel =
                                    it.purchaseType === "subscribe"
                                      ? `Subscription${
                                          it.frequencyWeeks ? ` • every ${it.frequencyWeeks}w` : ""
                                        }`
                                      : "One-time";

                                  return (
                                    <tr key={it.id} className="border-t border-border">
                                      <td className="p-2">
                                        <div className="font-medium">{label || "—"}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {purchaseLabel}
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
                                                fulfillmentStatus: e.target
                                                  .value as FulfillmentStatus,
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
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <input
                                            value={edit.trackingNumber}
                                            onChange={(e) =>
                                              setItemEdits((prev) => ({
                                                ...prev,
                                                [it.id]: {
                                                  ...edit,
                                                  trackingNumber: e.target.value,
                                                },
                                              }))
                                            }
                                            placeholder="Tracking #"
                                            className="h-8 w-[200px] rounded-md border border-border bg-background px-2 text-sm"
                                          />
                                          {it.trackingUrl && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              className="h-8"
                                              onClick={() => openInNewTab(it.trackingUrl!)}
                                            >
                                              Track
                                            </Button>
                                          )}
                                        </div>
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
                            <code>delivered</code> stamps both.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "inventory" && (
          <div className="mt-6 grid gap-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Total on hand</div>
                <div className="text-2xl font-bold mt-1">{inventoryStats.totalOnHand}</div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Reserved</div>
                <div className="text-2xl font-bold mt-1">{inventoryStats.totalReserved}</div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Available</div>
                <div className="text-2xl font-bold mt-1">{inventoryStats.totalAvailable}</div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="text-sm text-muted-foreground">Low stock items</div>
                <div className="text-2xl font-bold mt-1">{inventoryStats.lowStockCount}</div>
              </div>
            </div>

            {inventoryLoading && (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                Loading inventory…
              </div>
            )}

            {inventoryError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                Failed to load inventory: {inventoryError}
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="font-semibold">Inventory ({inventory.length})</div>
                <div className="text-sm text-muted-foreground">
                  Available = on hand - reserved
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-3 text-left">SKU</th>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-left">Flavor</th>
                      <th className="p-3 text-left">On hand</th>
                      <th className="p-3 text-left">Reserved</th>
                      <th className="p-3 text-left">Available</th>
                      <th className="p-3 text-left">Reorder point</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((row) => {
                      const onHand = Number(row.onHandQuantity ?? 0) || 0;
                      const reserved = Number(row.reservedQuantity ?? 0) || 0;
                      const reorderPoint = Number(row.reorderPoint ?? 0) || 0;
                      const available = onHand - reserved;
                      const lowStock = available <= reorderPoint;

                      return (
                        <tr key={row.id} className="border-t border-border">
                          <td className="p-3 font-mono text-xs">{row.sku || "—"}</td>
                          <td className="p-3">{row.productName || "—"}</td>
                          <td className="p-3">{titleizeSlug(row.flavor) || "—"}</td>
                          <td className="p-3">{onHand}</td>
                          <td className="p-3">{reserved}</td>
                          <td className="p-3 font-medium">{available}</td>
                          <td className="p-3">{reorderPoint}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs ${
                                lowStock
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-300"
                              }`}
                            >
                              {lowStock ? "Low stock" : "OK"}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">{fmtDate(row.updatedAt)}</td>
                        </tr>
                      );
                    })}

                    {!inventory.length && !inventoryLoading && !inventoryError && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={9}>
                          No inventory items found.
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

                <Button type="button" onClick={() => loadWholesale(true)} className="h-10">
                  Refresh
                </Button>
              </div>

              {wholesaleLoading && (
                <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
              )}
              {wholesaleError && (
                <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  Failed to load wholesale applications: {wholesaleError}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="font-semibold">
                  Wholesale applications ({filteredWholesale.length})
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
                            onChange={(e) =>
                              updateWholesaleStatus(
                                r.id,
                                e.target.value as WholesaleRow["status"]
                              )
                            }
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

                    {!filteredWholesale.length && !wholesaleLoading && !wholesaleError && (
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
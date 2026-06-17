/**
 * audit-channel-tags.ts
 *
 * QuickBooks readiness check. Every sale should carry a `kimora_channel`
 * accounting tag (retail | subscription | wholesale) so the Stripe→QBO
 * connector posts revenue to the right income account. This script scans
 * recent Stripe activity and flags anything missing the tag.
 *
 * Run:  npm run audit:channels
 *       npm run audit:channels -- 60        (look back 60 days instead of 35)
 *
 * Exit code is 1 if any untagged sales are found (handy for cron/CI).
 */
import "dotenv/config";
import { stripe } from "../server/stripe";

const DAYS = Math.max(1, parseInt(process.argv[2] || "35", 10) || 35);
const since = Math.floor(Date.now() / 1000) - DAYS * 24 * 60 * 60;

type Flag = { kind: string; id: string; created: string; detail: string };

function when(ts: number | null | undefined): string {
  return ts ? new Date(ts * 1000).toISOString().slice(0, 10) : "—";
}

async function auditCheckoutSessions(flags: Flag[]) {
  let scanned = 0;
  for await (const s of stripe.checkout.sessions.list({
    created: { gte: since },
    limit: 100,
  })) {
    // Only sessions that actually resulted in money moving.
    const paid = s.payment_status === "paid" || s.status === "complete";
    if (!paid) continue;
    scanned++;
    const channel = (s.metadata as any)?.kimora_channel;
    if (!channel) {
      flags.push({
        kind: "checkout_session",
        id: s.id,
        created: when(s.created),
        detail: `mode=${s.mode} amount=${((s.amount_total ?? 0) / 100).toFixed(2)} ${s.customer_details?.email ?? ""}`,
      });
    }
  }
  return scanned;
}

async function auditWholesaleInvoices(flags: Flag[]) {
  let scanned = 0;
  for await (const inv of stripe.invoices.list({ created: { gte: since }, limit: 100 })) {
    const md = (inv.metadata as any) || {};
    const isWholesale =
      String(md.source || "").includes("wholesale") || md.kimora_channel === "wholesale";
    if (!isWholesale) continue; // subscription/retail invoices are covered by the session scan
    scanned++;
    if (md.kimora_channel !== "wholesale") {
      flags.push({
        kind: "wholesale_invoice",
        id: inv.id,
        created: when(inv.created),
        detail: `${inv.number ?? ""} ${inv.customer_email ?? ""} $${((inv.amount_due ?? 0) / 100).toFixed(2)}`,
      });
    }
  }
  return scanned;
}

async function main() {
  console.log(`\nKimora channel-tag audit — last ${DAYS} days (since ${when(since)})\n`);
  const flags: Flag[] = [];

  const sessions = await auditCheckoutSessions(flags);
  const invoices = await auditWholesaleInvoices(flags);

  console.log(`Scanned ${sessions} paid checkout sessions and ${invoices} wholesale invoices.`);

  if (!flags.length) {
    console.log("\n✅ All sales are tagged with kimora_channel. QBO sync will categorize cleanly.\n");
    process.exit(0);
  }

  console.log(`\n⚠️  ${flags.length} sale(s) missing the kimora_channel tag:\n`);
  for (const f of flags) {
    console.log(`  • [${f.kind}] ${f.id}  (${f.created})  ${f.detail}`);
  }
  console.log(
    "\nThese will land in QBO as uncategorized revenue. Tag them manually in the\n" +
      "Stripe dashboard (or in the QBO connector) and confirm the backend deploy that\n" +
      "adds kimora_channel is live.\n",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("Audit failed:", err?.message || err);
  process.exit(2);
});

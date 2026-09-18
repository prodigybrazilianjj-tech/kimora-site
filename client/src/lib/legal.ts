// ─────────────────────────────────────────────────────────────────────────
// Legal policy copy — ONE source, rendered by two surfaces.
//
// WHY THIS FILE EXISTS. Until now /privacy, /terms and /refunds served
// `<div id="root"></div>` to any crawler that does not run JavaScript: correct
// title, correct meta description, correct canonical, one ld+json block, and
// then zero words. That is playbook finding #1 — the finding this whole SEO
// program was started to close — still live on three routes in week eight.
//
// It was not an oversight. shared/prerender.ts said, deliberately:
//
//   "The legal pages are omitted deliberately: their real body is the full
//    policy text, and a four-line summary standing in for a terms-of-service
//    page would be the one case where the fallback genuinely misrepresents
//    the page."
//
// The premise is right and the conclusion does not follow. It is a false
// dichotomy between a summary and nothing. The third option is the one this
// file takes: serve the policy IN FULL. That satisfies prerender.ts's own
// anti-cloaking rule 3 ("it says what the page says") more completely than any
// other route on the site, because it is not a mirror of the page — it is the
// same array the page renders.
//
// WHY IT IS NOT HYPOTHETICAL. Playbook finding #35 recorded Google's AI-surface
// baseline: four impressions in three months, of which /refunds ×1 and /terms
// ×1, filed as an oddity "which no one targeted." It is not an oddity. Half the
// AI impressions this site has ever recorded are on pages that hand a retriever
// nothing. That is why /refunds went first.
//
// WHY THE PAGE READS FROM HERE TOO, RATHER THAN KEEPING ITS OWN JSX.
// Playbook finding #38: "a comment saying 'keep this in sync with X' is a
// defect report, not a control." Three flavour arrays claimed to be in sync and
// disagreed on every description; the names only matched because somebody
// remembered to edit three files. Duplicating a REFUND POLICY that way — one
// copy for readers, one for crawlers, the crawler copy being the one an answer
// engine quotes — is the worst available place on this site for that hazard.
// So Refunds.tsx renders this array and prerenderFor() renders this array.
// There is no second copy to drift.
//
// WHY client/src/lib/ AND NOT shared/. shared/faq.ts (branch seo/2026-09-07,
// still unmerged as of 2026-09-18) would be the repo's first `@shared/*` import
// from client code, and it has never been through a build. Putting a second
// unbuilt file behind the same unproven alias means both fail together and
// neither failure identifies the other. This file sits where articles.ts
// already sits — the existing precedent for "a corpus the page and the
// prerender both render" — so the page imports it over `@/lib`, which every
// component in the repo already uses, and shared/prerender.ts imports it by
// relative path, exactly as it already imports articles.ts and product.ts.
//
// EDITING THIS FILE CHANGES A PUBLISHED LEGAL POLICY. Treat it accordingly.
// ─────────────────────────────────────────────────────────────────────────

/**
 * An inline run inside a paragraph.
 *
 * A bare string is plain text. `{ b }` is bolded on the page and is plain text
 * in the crawler HTML — emphasis is presentation, and the fallback deliberately
 * carries no styling. `{ br: true }` is a hard line break, which the address
 * and contact blocks genuinely need and which a paragraph split would render
 * differently from the page today.
 *
 * NOTE: this vocabulary is deliberately NOT ArticleBlock's. ArticleBlock has no
 * inline emphasis and no line break, and widening it to gain them would put a
 * change with blast radius across four live /learn articles inside a commit
 * about legal pages. Separate type, separate renderer, zero shared code path.
 * Playbook finding #38's sibling lesson: the reason the flavour refactor went
 * wrong was that centralising a value quietly destroyed the type guarding it.
 */
export type LegalSpan = string | { b: string } | { br: true };

/**
 * One block of policy copy.
 *
 * Intentionally small. If a policy ever needs a structure this cannot express,
 * ADD THE BLOCK TYPE — do not flatten the prose to fit. Playbook, 2026-08-26:
 * when the block vocabulary cannot express the prose, the transcription does
 * not fail loudly, it quietly produces a worse page. That cost the stick-packs
 * article four lists.
 */
export type LegalBlock =
  | { type: "h2"; text: string }
  | { type: "p"; spans: readonly LegalSpan[] }
  | { type: "ul"; items: readonly string[] };

export interface LegalPage {
  /** Rendered as the h1 on the page and as the heading of the fallback body. */
  heading: string;
  effectiveDate: string;
  lastUpdated: string;
  blocks: readonly LegalBlock[];
}

/** Convenience for the common case of a paragraph with no inline runs. */
const p = (text: string): LegalBlock => ({ type: "p", spans: [text] });
const h2 = (text: string): LegalBlock => ({ type: "h2", text });

const SUPPORT_EMAIL = "support@kimoraco.com";

/**
 * /refunds — Refund & Return Policy.
 *
 * Transcribed verbatim from Refunds.tsx as of origin/main 4d088bb. Every
 * sentence, every bolded run and both line-break groups are preserved; the JSX
 * whitespace collapse is preserved too (e.g. "health regulations," is followed
 * by a bolded run that opens with a space, which is how the page reads today).
 *
 * ⚠️ This is the policy the Product JSON-LD's MerchantReturnPolicy describes —
 * 30 days, ReturnFeesCustomerResponsibility, NewCondition, ReturnByMail, no
 * restocking fee (shared/seo.ts). If the window, the fee treatment or the
 * opened/unopened line changes here, the structured data changes in the same
 * commit or the page and the markup will tell an answer engine two different
 * things about the same policy.
 */
export const REFUNDS_POLICY: LegalPage = {
  heading: "Refund & Return Policy",
  effectiveDate: "April 27, 2026",
  lastUpdated: "April 27, 2026",
  blocks: [
    {
      type: "p",
      spans: [
        { b: "Effective Date:" },
        " April 27, 2026",
        { br: true },
        { b: "Last Updated:" },
        " April 27, 2026",
      ],
    },
    p(
      "We stand behind our products and want you to feel confident ordering from Kimora Co. Please review the policy below before placing an order. By making a purchase, you agree to these terms.",
    ),

    h2("Return Eligibility"),
    {
      type: "p",
      spans: [
        "Due to the nature of dietary supplements and health regulations,",
        { b: " opened products are not eligible for return." },
      ],
    },
    {
      type: "p",
      spans: [
        "Unopened and unused products in their original packaging may be returned within ",
        { b: "30 days of delivery" },
        ".",
      ],
    },
    p("We do not charge restocking fees."),

    h2("How to Initiate a Return"),
    {
      type: "p",
      spans: [
        "Email ",
        { b: SUPPORT_EMAIL },
        " with your order number and the reason for the return. If your return is approved, we will email you return instructions and the return address.",
      ],
    },
    p("Returns sent without prior authorization may not be processed."),

    h2("Return Shipping"),
    p(
      "For change-of-mind returns, you are responsible for return shipping costs. We recommend using a trackable shipping service — Kimora is not responsible for items lost in return transit.",
    ),
    p(
      "For damaged, defective, or incorrect orders, Kimora will provide a prepaid return label or arrange replacement at our expense. See “Damaged, Defective, or Incorrect Orders” below.",
    ),

    h2("Return Address"),
    {
      type: "p",
      spans: [
        "Approved returns may be mailed to:",
        { br: true },
        { br: true },
        { b: "Kimora Co." },
        { br: true },
        { b: "PO Box 20024" },
        { br: true },
        { b: "Sedona, AZ 86341" },
        { br: true },
        { b: "United States" },
      ],
    },

    h2("Refund Processing"),
    p(
      "Once an approved return is received and inspected, refunds will be issued to the original payment method. Please allow 5–10 business days for the refund to appear on your statement, depending on your bank or card issuer.",
    ),
    p(
      "Refunds reflect the actual amount paid. If a promotional code, discount, or gift card was applied to the original order, the refund will be issued at the discounted amount paid, not the full retail price. Original shipping charges are non-refundable.",
    ),

    h2("Subscription Orders"),
    {
      type: "p",
      spans: [
        "Subscription orders renew automatically at the cadence you selected (for example, every 30, 60, or 90 days). To stop the next shipment, cancel at least ",
        { b: "48 hours before" },
        ` the renewal date through your account dashboard or by emailing ${SUPPORT_EMAIL}.`,
      ],
    },
    p(
      "Charges that have already been processed and orders that have already shipped are non-refundable based solely on cancellation. Once shipped, a subscription order is treated like any other order under this policy — unopened products may be returned within 30 days of delivery, opened products are not eligible.",
    ),

    h2("Damaged, Defective, or Incorrect Orders"),
    {
      type: "p",
      spans: [
        "If your order arrives damaged, defective, or incorrect, contact us within ",
        { b: "7 days of delivery" },
        ` at ${SUPPORT_EMAIL}.`,
      ],
    },
    p("Please include:"),
    {
      type: "ul",
      items: [
        "Your order number",
        "A description of the issue",
        "Photos of the damaged, defective, or incorrect product and the shipping package (required for damage claims)",
      ],
    },
    p(
      "We will respond within 2 business days and resolve the issue by sending a replacement, providing a prepaid return label for replacement, or issuing a refund — at our discretion based on the situation.",
    ),

    h2("Wrong Addresses & Refused Packages"),
    p(
      "You are responsible for providing an accurate shipping address at checkout. Orders shipped to an incorrect address you provided are not eligible for refund or replacement, although we will assist where reasonably possible.",
    ),
    p(
      "If a package is refused at delivery or returned to us as undeliverable, we will refund the product cost (excluding original shipping) once the package is received back at our warehouse, provided the products are unopened and in resalable condition.",
    ),

    h2("Bundles, Free Gifts & Promotional Items"),
    p(
      "When returning a bundle or order that included a free gift or promotional item, the free or promotional item must also be returned in unopened, original condition. If it is not returned, its retail value will be deducted from your refund.",
    ),

    h2("Wholesale & Ambassador Orders"),
    p(
      `Returns and refunds for wholesale, gym partnership, and ambassador orders are handled under the terms of the applicable partnership agreement, not this policy. Contact your account representative or ${SUPPORT_EMAIL} for assistance.`,
    ),

    h2("International Orders"),
    p(
      "Kimora currently ships within the United States only. This policy applies to orders shipped to U.S. addresses.",
    ),

    h2("Contact"),
    {
      type: "p",
      spans: [
        "For all return or refund inquiries:",
        { br: true },
        { b: "Kimora Co." },
        { br: true },
        "Email: ",
        { b: SUPPORT_EMAIL },
      ],
    },
  ],
};

/**
 * Flatten a paragraph's spans to plain text.
 *
 * Used by the prerender, which carries no styling. A `{ br }` becomes a single
 * space, because the fallback is prose for a machine to read rather than a
 * layout — an address run together on one line is still a correct address, and
 * a newline inside a <p> renders as a space in HTML anyway.
 */
export function legalSpansToText(spans: readonly LegalSpan[]): string {
  return spans
    .map((s) => (typeof s === "string" ? s : "b" in s ? s.b : " "))
    .join("");
}

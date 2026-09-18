// ─────────────────────────────────────────────────────────────────────────
// Legal policy copy — ONE source, rendered by two surfaces.
//
// STATUS: all three legal routes now serve their full policy to crawlers.
// /refunds shipped 2026-09-18 (origin/main 9f624b9); /privacy and /terms
// followed the same day on the identical shape. Playbook finding #39 closed.
//
// WHY THIS FILE EXISTS. Until 2026-09-18 /privacy, /terms and /refunds served
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
export type LegalSpan =
  | string
  | { b: string }
  | { br: true }
  /**
   * A hyperlink.
   *
   * Added 2026-09-18 for /privacy and /terms. /refunds had none, and the
   * playbook's rule is explicit about what happens otherwise: when the block
   * vocabulary cannot express the prose, the transcription does not fail
   * loudly, it quietly produces a worse page. Flattening these to plain text
   * would have silently dropped five third-party privacy-policy links and the
   * Terms -> Refunds cross-reference, on pages whose entire job is to point a
   * reader at their actual rights.
   *
   * `external: true` renders <a target="_blank" rel="noopener noreferrer">;
   * `false` renders wouter's <Link>, for in-app navigation. The prerender
   * emits a plain <a> either way, because a crawler does not route.
   */
  | { link: string; href: string; external: boolean };

/**
 * Narrow a span to its kind.
 *
 * Exists so that BOTH renderers — Refunds.tsx's `Spans` and legalSpansToText
 * below — go through one exhaustive switch instead of two `"b" in span` chains.
 * Adding a fourth variant without handling it is then a compile error here,
 * rather than silently rendering a <br> on the page and a space in the
 * prerender. Found in adversarial review: LegalBlock's switch was guarded and
 * the span union, which carries the inline structure, was not.
 */
export function legalSpanKind(
  span: LegalSpan,
): "text" | "bold" | "break" | "link" {
  if (typeof span === "string") return "text";
  if ("b" in span) return "bold";
  if ("br" in span) return "break";
  if ("link" in span) return "link";
  const exhaustive: never = span;
  return exhaustive;
}

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
  /**
   * List items are SPANS, not plain strings.
   *
   * Widened 2026-09-18. /refunds' three items are plain text, but /privacy has
   * 32 list items carrying 11 bolded runs — the category labels in "what we
   * collect" and "how we use it", which are the most quotable structure on the
   * page. `readonly string[]` would have dropped every one of them.
   */
  | { type: "ul"; items: readonly (readonly LegalSpan[])[] };

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
 * The dateline, as ONE value each.
 *
 * These feed both `REFUNDS_POLICY.effectiveDate` / `.lastUpdated` AND the
 * dateline block that actually renders. The first version of this file
 * declared the two fields and then hardcoded the same dates again in
 * `blocks[0]` — nothing read the fields, so bumping `effectiveDate` to a new
 * date would have shipped a page and a prerender that both still said April
 * 27. Two sources for one date, with the authoritative-looking one inert, in
 * the file whose entire purpose is to have one source. Caught in adversarial
 * review.
 */
const REFUNDS_EFFECTIVE = "April 27, 2026";
const REFUNDS_UPDATED = "April 27, 2026";

/**
 * ONE PAIR PER POLICY, and deliberately not one shared pair.
 *
 * All six values read "April 27, 2026" today, which is exactly what makes
 * collapsing them tempting and wrong: the three policies are amended
 * independently, so a shared constant would mean revising the refund policy
 * silently restated the privacy policy's effective date — a false legal
 * assertion produced by a tidy-up.
 *
 * The first draft of this change did point Privacy and Terms at
 * REFUNDS_EFFECTIVE. That is the same defect the adversarial review caught on
 * `/refunds` one commit earlier, in the same file, committed again within the
 * hour. Deduplication is not free: two values that are equal today are not
 * therefore one value.
 */
const PRIVACY_EFFECTIVE = "April 27, 2026";
const PRIVACY_UPDATED = "April 27, 2026";
const TERMS_EFFECTIVE = "April 27, 2026";
const TERMS_UPDATED = "April 27, 2026";

/**
 * /refunds — Refund & Return Policy.
 *
 * Transcribed verbatim from Refunds.tsx as of origin/main 4d088bb. Every
 * sentence, every bolded run and all THREE line-break groups — the dateline,
 * Return Address and Contact — are preserved; the JSX
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
  effectiveDate: REFUNDS_EFFECTIVE,
  lastUpdated: REFUNDS_UPDATED,
  blocks: [
    {
      type: "p",
      spans: [
        { b: "Effective Date:" },
        ` ${REFUNDS_EFFECTIVE}`,
        { br: true },
        { b: "Last Updated:" },
        ` ${REFUNDS_UPDATED}`,
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
        ["Your order number"],
        ["A description of the issue"],
        [
          "Photos of the damaged, defective, or incorrect product and the shipping package (required for damage claims)",
        ],
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
  const text = spans
    .map((s) => {
      switch (legalSpanKind(s)) {
        case "text":
          return s as string;
        case "bold":
          return (s as { b: string }).b;
        case "break":
          return " ";
        case "link":
          // The label, not the href. This helper feeds plain-text contexts;
          // the prerender renders links as real anchors through its own path.
          return (s as { link: string }).link;
      }
    })
    .join("");

  // Collapse runs of whitespace. The Return Address block opens with two
  // consecutive {br}s — a deliberate blank line on the page — which flattened
  // to "mailed to:  Kimora Co." with a double space. HTML collapses it anyway,
  // so this is tidiness rather than a bug, but the fallback is the copy an
  // answer engine quotes and it should not carry the page's layout artifacts.
  //
  // Accepted and NOT changed: the dateline flattens to "Effective Date: April
  // 27, 2026 Last Updated: April 27, 2026", two labelled values with only a
  // space between them. Both facts are present and unambiguous, and inserting
  // a separator here would be the fallback saying something the page does not.
  return text.replace(/ {2,}/g, " ");
}

/**
 * /privacy — Privacy Policy.
 *
 * Transcribed from Privacy.tsx at origin/main 9f624b9 by a parser, not by
 * hand: `convert.mjs` walks the JSX with the repo's own TypeScript compiler
 * and reimplements Babel's whitespace algorithm, then emits this array.
 * Hand-typing 1+ blocks of published legal text would have been the single
 * most likely place in this change to silently alter a policy.
 *
 * The converter was validated against /refunds first, where a hand-written and
 * adversarially-reviewed answer already existed — and that control immediately
 * caught a real bug (it flattened <br> inside <strong>, welding the return
 * address into one line). Verification here is by a SECOND, independent
 * regex-based extractor, so a shared misunderstanding cannot cancel itself out.
 *
 * ⚠️ Carries five external links to third-party privacy policies (Google,
 * TikTok, Meta) and two ad-industry opt-outs (NAI, DAA). Those are a data
 * subject's actual route to exercising a right, so they are real anchors in
 * both surfaces rather than flattened label text.
 */
export const PRIVACY_POLICY: LegalPage = {
  heading: "Privacy Policy",
  effectiveDate: PRIVACY_EFFECTIVE,
  lastUpdated: PRIVACY_UPDATED,
  blocks: [
    { type: "p", spans: [{ b: "Effective Date:" }, ` ${PRIVACY_EFFECTIVE}`, { br: true }, { b: "Last Updated:" }, ` ${PRIVACY_UPDATED}`] },
    p("Kimora Co. (“Kimora,” “we,” “us,” or “our”) respects your privacy. This Privacy Policy explains how we collect, use, share, and protect personal information when you visit kimoraco.com or interact with our products and services."),
    h2("Information We Collect"),
    p("We collect information you provide directly and information collected automatically through your interactions with our site."),
    { type: "p", spans: [{ b: "Information you provide:" }] },
    { type: "ul", items: [["Name, email address, shipping address, billing address, and phone number (if provided)"], ["Order details, subscription preferences, and account credentials"], ["Customer service communications, survey responses, and product reviews"], ["SMS subscription consent, if you opt in to receive text messages"]] },
    { type: "p", spans: [{ b: "Information collected automatically:" }] },
    { type: "ul", items: [["IP address, device type, browser, and operating system"], ["Pages visited, time on site, referral source, click and scroll behavior"], ["Cookies, pixel tags, and similar tracking technologies (see “Cookies & Tracking Technologies” below)"]] },
    p("We do not collect or store credit card numbers. Payment information is processed directly by Stripe."),
    h2("How We Use Your Information"),
    p("We use your information to:"),
    { type: "ul", items: [["Process and fulfill orders and subscriptions"], ["Communicate about orders, account activity, and customer service inquiries"], ["Send marketing emails and SMS messages (only if you have opted in; you can unsubscribe at any time)"], ["Measure and improve our website performance and user experience"], ["Run targeted advertising on platforms including Google, Meta (Facebook and Instagram), and TikTok"], ["Detect and prevent fraud, abuse, and security incidents"], ["Comply with legal obligations"]] },
    h2("Cookies & Tracking Technologies"),
    p("We use cookies and similar technologies (pixels, web beacons, SDKs) for three purposes:"),
    { type: "p", spans: [{ b: "Strictly necessary —" }, " required for core site functionality such as cart, checkout, and login. These cannot be disabled without breaking the site."] },
    { type: "p", spans: [{ b: "Analytics —" }, " help us understand how visitors use our site. We use Google Analytics 4. Google may set first-party cookies and collect information about your site interactions. Review Google’s privacy practices at ", { link: "policies.google.com/privacy", href: "https://policies.google.com/privacy", external: true }, "."] },
    { type: "p", spans: [{ b: "Advertising —" }, " used to measure ad performance and show you relevant ads on third-party platforms. We use:"] },
    { type: "ul", items: [[{ b: "TikTok Pixel and Events API." }, " Collects information about your interactions with our site and, when you provide it, hashed contact information for ad audience matching. See TikTok’s Privacy Policy at ", { link: "tiktok.com/legal/page/us/privacy-policy/en", href: "https://www.tiktok.com/legal/page/us/privacy-policy/en", external: true }, "."], [{ b: "Meta Pixel and Conversions API" }, " (Facebook and Instagram), when active. Collects similar information for Meta ad targeting and measurement. See Meta’s Privacy Policy at ", { link: "facebook.com/privacy/policy", href: "https://www.facebook.com/privacy/policy", external: true }, "."]] },
    { type: "p", spans: ["You can opt out of pixel-based advertising through your browser settings, the Network Advertising Initiative (", { link: "optout.networkadvertising.org", href: "https://optout.networkadvertising.org/", external: true }, "), the Digital Advertising Alliance (", { link: "optout.aboutads.info", href: "https://optout.aboutads.info/", external: true }, "), or platform-specific settings (Google Ads Settings, Meta ad preferences, TikTok ad settings). We honor Global Privacy Control (GPC) signals where applicable."] },
    h2("Service Providers & Third Parties"),
    p("We share limited information with service providers that help us operate Kimora. These include:"),
    { type: "ul", items: [[{ b: "Stripe" }, " — payment processing"], [{ b: "Shopify" }, " — storefront and order management"], [{ b: "Klaviyo" }, " — email and SMS marketing"], [{ b: "Formspree" }, " — waitlist form processing"], [{ b: "Google (Analytics)" }, " — site analytics"], [{ b: "TikTok" }, " — advertising and analytics"], [{ b: "Meta" }, " — advertising and analytics (when active)"], [{ b: "Render" }, " — website hosting"], [{ b: "Third-party fulfillment partner" }, " — order shipping (when active)"]] },
    p("These providers may collect, store, and process information on our behalf in accordance with their own privacy practices."),
    p("We do not sell your personal information to third parties for monetary value. We may share information when required by law, in connection with a legal proceeding, or to protect Kimora, our customers, or others."),
    h2("Your Rights"),
    p("Depending on your location, you may have rights to:"),
    { type: "ul", items: [[{ b: "Access" }, " the personal information we hold about you"], [{ b: "Correct" }, " inaccurate information"], [{ b: "Delete" }, " your personal information (subject to legal retention requirements)"], [{ b: "Opt out" }, " of marketing communications at any time"], [{ b: "Opt out of “sale” or “sharing”" }, " of personal information for cross-context behavioral advertising (California, Colorado, Connecticut, Virginia, and other state privacy laws)"], [{ b: "Limit use of sensitive personal information" }], [{ b: "Data portability" }, " (in certain jurisdictions)"]] },
    { type: "p", spans: ["To exercise any of these rights, email ", { b: "support@kimoraco.com" }, " or use the unsubscribe links in our marketing emails. We respond to verified requests within 30 days, or as required by applicable law."] },
    p("If you are a resident of the European Economic Area, the United Kingdom, or Switzerland, you may have additional rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with your local data protection authority."),
    h2("Children’s Privacy"),
    p("Kimora’s products and services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, contact us at support@kimoraco.com and we will delete it promptly."),
    h2("Data Retention"),
    p("We retain personal information for as long as necessary to fulfill the purposes described in this Policy, comply with legal obligations, resolve disputes, and enforce agreements. When information is no longer needed, we delete or anonymize it."),
    h2("Data Security"),
    p("We use reasonable administrative, technical, and physical safeguards to protect personal information. However, no system is perfectly secure. If we become aware of a security incident affecting your information, we will notify you in accordance with applicable law."),
    h2("International Data Transfers"),
    p("Kimora is operated from the United States. If you visit our site from outside the U.S., your information may be transferred to, stored, and processed in the U.S. or other countries that may not provide the same level of data protection as your home country."),
    h2("Changes to This Policy"),
    p("We may update this Policy from time to time. The “Last Updated” date above reflects the most recent revision. Material changes will be communicated through our website or by email."),
    h2("Contact"),
    { type: "p", spans: ["Questions or requests about this Privacy Policy:", { br: true }, { b: "Kimora Co." }, { br: true }, "Email: ", { b: "support@kimoraco.com" }] },
  ],
};

/**
 * /terms — Terms of Service.
 *
 * Transcribed from Terms.tsx at origin/main 9f624b9 by a parser, not by
 * hand: `convert.mjs` walks the JSX with the repo's own TypeScript compiler
 * and reimplements Babel's whitespace algorithm, then emits this array.
 * Hand-typing 1+ blocks of published legal text would have been the single
 * most likely place in this change to silently alter a policy.
 *
 * The converter was validated against /refunds first, where a hand-written and
 * adversarially-reviewed answer already existed — and that control immediately
 * caught a real bug (it flattened <br> inside <strong>, welding the return
 * address into one line). Verification here is by a SECOND, independent
 * regex-based extractor, so a shared misunderstanding cannot cancel itself out.
 *
 * ⚠️ Carries one INTERNAL link to /refunds — "incorporated into these Terms by
 * reference." The page renders it through wouter's <Link>; the prerender emits
 * a plain <a href="/refunds">, because a crawler does not route and a relative
 * href is exactly what it should follow.
 */
export const TERMS_POLICY: LegalPage = {
  heading: "Terms of Service",
  effectiveDate: TERMS_EFFECTIVE,
  lastUpdated: TERMS_UPDATED,
  blocks: [
    { type: "p", spans: [{ b: "Effective Date:" }, ` ${TERMS_EFFECTIVE}`, { br: true }, { b: "Last Updated:" }, ` ${TERMS_UPDATED}`] },
    p("These Terms of Service (“Terms”) govern your access to and use of kimoraco.com and the products and services offered by Kimora Co. (“Kimora,” “we,” “us,” or “our”). By accessing the site, creating an account, or placing an order, you agree to these Terms. If you do not agree, do not use our site."),
    { type: "p", spans: [{ b: "These Terms include a binding arbitration provision and class action waiver in the “Dispute Resolution” section. Please read them carefully." }] },
    h2("Eligibility"),
    p("You must be at least 18 years old (or the age of majority in your state of residence) to use our site or purchase our products. By using our site, you represent and warrant that you meet this requirement."),
    h2("Accounts & Registration"),
    p("You may need to create an account to place orders or manage subscriptions. You agree to provide accurate, current, and complete information, and to keep your login credentials confidential. You are responsible for all activity that occurs under your account."),
    p("We may suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose a risk to other users or to Kimora."),
    h2("Products & Supplements"),
    p("Kimora products are dietary supplements. They are not intended to diagnose, treat, cure, or prevent any disease. Statements about our products have not been evaluated by the U.S. Food and Drug Administration. Consult a qualified healthcare professional before starting any supplement, especially if you are pregnant, nursing, taking medication, or have a medical condition."),
    p("We reserve the right to limit quantities, refuse orders, and discontinue products at any time. Product images are representative and may differ slightly from the product delivered."),
    h2("Orders, Pricing & Payments"),
    p("All prices are listed in U.S. dollars and are subject to change without notice. We reserve the right to correct pricing or product description errors and to cancel orders affected by such errors."),
    p("Payments are processed by Stripe. By placing an order, you authorize us (and Stripe) to charge your selected payment method for the order total, including any taxes, shipping, and other applicable fees. Kimora does not store your full payment card number."),
    p("Order confirmation does not constitute acceptance. We may decline or cancel orders for reasons including suspected fraud, unavailable inventory, pricing errors, or violations of these Terms."),
    h2("Subscriptions & Auto-Renewal"),
    p("Kimora offers subscription products that automatically renew monthly until you cancel."),
    { type: "p", spans: [{ b: "By subscribing, you authorize Kimora to charge your payment method on the renewal date for each renewal at the then-current price plus applicable taxes and shipping." }, " You will receive an email reminder before each shipment. Renewal prices may differ from any introductory or promotional price you initially paid."] },
    { type: "p", spans: [{ b: "Cancellation." }, " You may cancel your subscription at any time through your account dashboard, by clicking the manage-subscription link in any subscription email, or by emailing support@kimoraco.com. To stop the next shipment, cancel at least 48 hours before the renewal date. Cancellation takes effect at the end of the current billing cycle; previously shipped orders are not refundable based solely on cancellation."] },
    { type: "p", spans: [{ b: "Skipping, changing flavor, or modifying a shipment." }, " You may skip a shipment or change your subscription flavor through your account dashboard, subject to the same 48-hour cutoff before the next renewal. Flavor changes apply to your next shipment."] },
    p("These auto-renewal terms are intended to comply with the California Automatic Renewal Law, the federal Restore Online Shoppers’ Confidence Act (ROSCA), and similar state laws."),
    h2("Shipping & Delivery"),
    p("We currently ship within the United States. Estimated delivery times are provided at checkout and are estimates only — actual delivery times may vary. Risk of loss and title for products pass to you upon delivery to the carrier."),
    p("You are responsible for providing an accurate shipping address. Kimora is not responsible for orders delayed, lost, or damaged due to incorrect addresses, carrier issues, or theft after delivery confirmation."),
    h2("Returns & Refunds"),
    { type: "p", spans: ["Our return and refund policy is described on our ", { link: "Refunds", href: "/refunds", external: false }, " page and is incorporated into these Terms by reference. Please review it before placing an order."] },
    h2("Promotional Codes & Discounts"),
    p("Promotional codes (including gym partnership codes such as MAT15) are limited to one use per customer unless otherwise stated, may not be combined with other offers unless explicitly permitted, have no cash value, and may be modified or revoked at any time. Promotional pricing applies only to the initial qualifying purchase unless we expressly state otherwise."),
    h2("Email & SMS Communications"),
    p("By providing your email address or phone number and opting in, you consent to receive transactional and marketing communications from Kimora and its service providers. You may unsubscribe from marketing emails at any time using the unsubscribe link in any email."),
    { type: "p", spans: [{ b: "SMS messaging." }, " If you opt in to SMS messages, you agree to receive recurring marketing and transactional text messages from Kimora at the phone number provided. Consent is not a condition of any purchase. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe at any time, or HELP for help. You can also email support@kimoraco.com to opt out."] },
    h2("User Content & Reviews"),
    p("If you submit reviews, photos, comments, or other content to Kimora (including via our site, social media, or in response to our requests), you grant Kimora a worldwide, non-exclusive, royalty-free, transferable, sublicensable license to use, reproduce, modify, publish, and display that content in connection with our products and brand."),
    p("You represent that any content you submit is your own, accurate, and does not infringe the rights of any third party. We may remove or refuse to publish content that violates these Terms or that we determine is inappropriate, in our sole discretion."),
    h2("Intellectual Property"),
    p("All content on kimoraco.com — including text, graphics, logos, images, product designs, packaging, and software — is the property of Kimora Co. or our licensors and is protected by U.S. and international copyright, trademark, and other intellectual property laws. You may not copy, reproduce, distribute, modify, or create derivative works from our content without our prior written permission."),
    p("“Kimora,” the Kimora logo, and our product names and packaging trade dress are trademarks of Kimora Co. All other trademarks are the property of their respective owners."),
    h2("Prohibited Uses"),
    p("You agree not to:"),
    { type: "ul", items: [["Use our site for any unlawful purpose or in violation of these Terms"], ["Reverse engineer, scrape, or extract data from our site without permission"], ["Interfere with the security or operation of our site"], ["Use any automated tool (bot, crawler, scraper) to access our site without our express written consent"], ["Resell our products without an authorized wholesale or retail agreement"], ["Misrepresent your identity or affiliation"], ["Impersonate Kimora or any of our employees, ambassadors, or partners"], ["Submit false, misleading, or fraudulent reviews or content"]] },
    h2("Third-Party Links & Services"),
    p("Our site may contain links to third-party websites or services. Kimora does not control, endorse, or assume responsibility for any third-party site, service, or content. Your use of third-party services is subject to their own terms and policies."),
    h2("Disclaimer of Warranties"),
    p("Our site and products are provided “as is” and “as available” without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. Kimora does not warrant that our site will be uninterrupted, secure, or error-free, or that defects will be corrected."),
    p("Some jurisdictions do not allow the exclusion of certain warranties, so some of the above exclusions may not apply to you."),
    h2("Limitation of Liability"),
    p("To the fullest extent permitted by law, Kimora and its affiliates, officers, employees, agents, and partners will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising out of your access to or use of our site or products."),
    p("Our total liability to you for any claim arising out of or relating to these Terms, our site, or our products will not exceed the greater of (a) the amount you paid Kimora in the 12 months preceding the claim, or (b) one hundred U.S. dollars (US$100)."),
    h2("Indemnification"),
    p("You agree to indemnify, defend, and hold harmless Kimora and our affiliates, officers, employees, agents, and partners from any claims, damages, liabilities, losses, costs, or expenses (including reasonable attorneys’ fees) arising out of your violation of these Terms, your misuse of our site or products, or your violation of any law or third-party right."),
    h2("Dispute Resolution & Arbitration"),
    { type: "p", spans: [{ b: "Please read this section carefully. It affects your legal rights." }] },
    p("Any dispute, claim, or controversy arising out of or relating to these Terms, our site, or our products will be resolved by binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The arbitration will be conducted in Maricopa County, Arizona, or remotely if you prefer, before a single neutral arbitrator. Judgment on the arbitrator’s award may be entered in any court of competent jurisdiction."),
    { type: "p", spans: [{ b: "Class Action Waiver." }, " You and Kimora agree that each may bring claims against the other only in your or our individual capacity and not as a plaintiff or class member in any purported class or representative proceeding."] },
    { type: "p", spans: [{ b: "Exceptions." }, " Either party may bring a claim in small claims court if it qualifies, and either party may seek injunctive or equitable relief in court for the protection of intellectual property rights."] },
    { type: "p", spans: [{ b: "30-Day Right to Opt Out." }, " You may opt out of this arbitration agreement within 30 days of first agreeing to these Terms by emailing support@kimoraco.com with the subject line “Arbitration Opt-Out” and your full name. Opting out will not affect any other provision of these Terms."] },
    h2("Governing Law & Venue"),
    p("These Terms are governed by the laws of the State of Arizona, without regard to its conflict-of-law principles. Subject to the Dispute Resolution section above, any judicial proceeding will be brought in the state or federal courts located in Maricopa County, Arizona, and you consent to personal jurisdiction and venue there."),
    h2("Changes to These Terms"),
    p("We may update these Terms from time to time. The “Last Updated” date above reflects the most recent revision. Material changes will be posted on this page and, where appropriate, communicated by email. Your continued use of our site after the effective date of an update constitutes acceptance of the updated Terms."),
    h2("Termination"),
    p("We may suspend or terminate your access to our site or services at any time, with or without notice, for any reason, including violation of these Terms. The provisions of these Terms that by their nature should survive termination (including Intellectual Property, Limitation of Liability, Indemnification, and Dispute Resolution) will survive."),
    h2("Severability & Entire Agreement"),
    p("If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect. These Terms, together with our Privacy Policy and Refunds policy, constitute the entire agreement between you and Kimora regarding our site and products and supersede any prior agreements."),
    h2("Contact"),
    { type: "p", spans: ["Questions about these Terms:", { br: true }, { b: "Kimora Co." }, { br: true }, "Email: ", { b: "support@kimoraco.com" }] },
  ],
};

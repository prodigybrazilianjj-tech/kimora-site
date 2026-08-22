/**
 * Band surfaces for the alternating cream / sand / ink page rhythm.
 *
 * Ink bands can't use the cream-page text tokens: --foreground and
 * --muted-foreground are near-black and a warm grey, both of which disappear on
 * #211E1A. So ink bands set text as cream (--surface-ink-foreground) at reduced
 * alpha instead of walking the token scale.
 *
 * The eyebrow labels split the same way. Gold #C9A86A measures 7.3:1 on ink but
 * only 1.99:1 on cream, so light bands use --primary-strong (deep gold) and only
 * ink bands use --primary.
 */

/** Section shell for a dark band. */
export const INK = "bg-surface-ink text-surface-ink-foreground";

/** Headings and other full-strength text on ink. */
export const INK_HEAD = "text-surface-ink-foreground";

/** Lead paragraphs on ink — the equivalent of text-foreground/80 on cream. */
export const INK_LEAD = "text-[rgba(247,240,222,0.80)]";

/** Body copy on ink — the equivalent of text-muted-foreground on cream. */
export const INK_BODY = "text-[rgba(247,240,222,0.64)]";

/** Hairlines and dividers on ink. */
export const INK_BORDER = "border-[rgba(247,240,222,0.16)]";

/** A raised panel on ink. */
export const INK_CARD =
  "rounded-xl border border-[rgba(247,240,222,0.16)] bg-[rgba(247,240,222,0.03)]";

/** A raised panel on cream or sand. */
export const LIGHT_CARD = "rounded-xl border border-border bg-card";

/** Eyebrow label — gold that stays readable on its band. */
export const EYEBROW_INK = "text-primary";
export const EYEBROW_LIGHT = "text-primary-strong";

/** Raw cream, for the handful of places that need a literal colour. */
export const CREAM = "#F7F0DE";

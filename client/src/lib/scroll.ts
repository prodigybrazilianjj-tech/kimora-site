/**
 * Scroll a section into view, accounting for the header that covers the top of
 * the viewport.
 *
 * This drives the window rather than calling `element.scrollIntoView`, for two
 * reasons. The header is sticky/fixed, so an element scrolled flush to the top
 * lands underneath it and needs an explicit offset. And `scrollIntoView`
 * resolves its own scroll container by walking ancestors, which is easy to
 * disturb — the pre-launch page's wrapper carries `overflow-x-hidden`, and a
 * hidden axis makes the computed `overflow-y` become `auto`. Positioning the
 * window ourselves keeps both concerns out of the picture.
 */

/** Roughly the header's height, so a section doesn't land underneath it. */
export const HEADER_OFFSET = 84;

export function scrollToId(id: string, offset: number = HEADER_OFFSET) {
  const el = document.getElementById(id);
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function scrollToPageTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

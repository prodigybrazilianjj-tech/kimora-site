/**
 * Ensō-tentacle "O" for the KIMORA wordmark — matches the packaging front panel.
 * Rendered as a CSS mask of the ensō asset and tinted via background color, so it
 * scales crisply at any size and can take any brand color. Usage: KIM<OMark />RA
 */

// Mask cropped to the artwork's ink bounds (495×540). The older enso_o_mask.png
// carried ~1.6% transparent padding in a 514×558 canvas: with a square box and
// mask-size:contain, the rendered ink was always shorter than the box, so no em
// value ever matched the visual height. Cropped + 100% 100% makes the box the art.
const MASK = "url(/assets/brand/enso_o_ink.png)";

// Poppins 700 cap height measured at 0.714em. The ensō is a thin brush ring, so at
// matched height it reads lighter than the solid letters — 1.24x compensates.
const CAP = 0.714;
const SCALE = 1.24;
const H = CAP * SCALE;              // 0.885em
const W = H * (495 / 540);          // 0.811em — the crop's aspect
const DY = (H - CAP) / 2;           // 0.086em — split the overshoot evenly

export function OMark({
  className = "bg-primary",
  tracking = 0.14,
  gap = 0.1,
}: {
  className?: string;
  /** The wordmark's letter-spacing in em. Needed to equalise the optical gaps. */
  tracking?: number;
  /** Target gap on each side of the mark, in em. */
  gap?: number;
}) {
  return (
    <span
      role="img"
      aria-label="O"
      className={`inline-block ${className}`}
      style={{
        width: `${W}em`,
        height: `${H}em`,
        // vertical-align is ignored when the wordmark is a flex row (a flex item with
        // no text content synthesises its baseline from the border-box bottom), so the
        // vertical offset has to come from transform.
        transform: `translateY(${DY}em)`,
        // letter-spacing adds a trailing space after "M" with no counterpart before
        // "R" — cancel it on the left so both gaps read equal.
        marginLeft: `${gap - tracking}em`,
        marginRight: `${gap}em`,
        WebkitMaskImage: MASK,
        WebkitMaskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: MASK,
        maskSize: "100% 100%",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}

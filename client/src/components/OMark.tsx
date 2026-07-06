/**
 * Ensō-tentacle "O" for the KIMORA wordmark — matches the packaging front panel.
 * Rendered as a CSS mask of the transparent ensō asset and tinted via background
 * color (defaults to brass/primary), so it scales crisply at any size and can
 * take any brand color. Usage: KIM<OMark />RA
 */
// Tight-cropped mask (514×558) — the full transparent_enso.png canvas has the
// mark floating in empty space, which made a contain-fit "O" render half-size.
const MASK = "url(/assets/brand/enso_o_mask.png)";

export function OMark({ className = "bg-primary" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="O"
      className={`inline-block w-[0.88em] h-[0.88em] align-[-0.15em] ml-[0.05em] mr-[0.15em] ${className}`}
      style={{
        WebkitMaskImage: MASK,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: MASK,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}

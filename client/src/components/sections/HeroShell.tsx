import type { ReactNode } from "react";
import { INK } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/**
 * The ink hero backdrop: two warm aurora glows, the gym-display illustration
 * bleeding off the right edge, and a scrim that keeps the copy legible where it
 * crosses the artwork.
 *
 * The illustration is a layer rather than a grid column on purpose — as a
 * column it left a block of dead space that the copy had to be balanced
 * against. Bleeding it off the edge means the copy just takes the left 600px
 * and the artwork fills whatever is left.
 */

export function HeroShell({
  className,
  innerClassName,
  children,
}: {
  className?: string;
  /** Extra padding for pages whose header is fixed and overlays this. */
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("relative overflow-hidden", INK, className)}>
      {/* warm aurora glows */}
      <div className="pointer-events-none absolute -left-32 -top-40 h-[34rem] w-[44rem] rounded-full bg-[radial-gradient(circle,rgba(201,168,106,0.22),transparent_70%)] blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 top-24 h-[36rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(168,71,42,0.28),transparent_70%)] blur-[130px]" />

      <img
        src="/assets/brand/octopus-bear-display-red.png"
        alt="Kimora octopus and bear"
        className="pointer-events-none absolute -right-20 top-24 z-[1] w-[680px] max-w-none opacity-30 lg:-right-8 lg:top-10 lg:w-[1020px] lg:opacity-95"
      />

      {/* Ink scrim. Solid under the headline, then thinning early so the
          tentacles stay visible behind the lower copy rather than being
          painted over — the artwork is meant to reach into the text column. */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,#211E1A_0%,#211E1A_10%,rgba(33,30,26,0.62)_26%,rgba(33,30,26,0.32)_44%,rgba(33,30,26,0.08)_64%,rgba(33,30,26,0)_80%)]" />

      <div
        className={cn(
          "relative z-[2] mx-auto w-full max-w-7xl px-6 pb-20 pt-12 md:px-8 lg:px-10 lg:pb-28 lg:pt-16",
          innerClassName
        )}
      >
        <div className="max-w-[600px]">{children}</div>
      </div>
    </section>
  );
}

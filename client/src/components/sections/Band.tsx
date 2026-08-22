import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  INK,
  INK_HEAD,
  INK_BODY,
  INK_CARD,
  LIGHT_CARD,
  EYEBROW_INK,
  EYEBROW_LIGHT,
} from "@/lib/surfaces";

/**
 * The band system behind both the pre-launch page and the homepage.
 *
 * Every section on those pages is the same three parts — a full-bleed surface,
 * a centred header block, and a grid of cards — so they live here once and the
 * two pages compose them instead of restating the recipe. `tone` is the only
 * thing a caller has to think about; the surface, the text colours and the card
 * treatment all follow from it.
 */

export type Tone = "ink" | "cream" | "sand";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Shared inner gutter. Matches the Shop page so the whole site lines up. */
export const WRAP = "mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20";

const SURFACE: Record<Tone, string> = {
  ink: INK,
  cream: "bg-background text-foreground",
  sand: "bg-secondary text-foreground",
};

export const isInk = (tone: Tone) => tone === "ink";

/** Body copy that reads correctly on the given tone. */
export const bodyOn = (tone: Tone) =>
  isInk(tone) ? INK_BODY : "text-muted-foreground";

/** Headings that read correctly on the given tone. */
export const headOn = (tone: Tone) => (isInk(tone) ? INK_HEAD : "text-foreground");

/**
 * Eyebrow colour. Light bands use Red Rock, per the mockup; ink bands cannot —
 * it measures 2.85:1 there — so they keep gold.
 */
export const eyebrowOn = (tone: Tone) =>
  isInk(tone) ? EYEBROW_INK : "text-accent";

export function Band({
  tone,
  id,
  anchor,
  className,
  innerClassName,
  bleed = false,
  children,
}: {
  tone: Tone;
  id?: string;
  /**
   * Renders the sticky-navbar offset spacer ahead of the section — Home scrolls
   * to `#{hash}-anchor` rather than the section itself. It carries the band's
   * own surface so it reads as the top of this band, not a gap before it.
   */
  anchor?: string;
  className?: string;
  innerClassName?: string;
  /** Skip the standard gutter — for sections that paint edge to edge. */
  bleed?: boolean;
  children: ReactNode;
}) {
  const section = (
    <section id={id} className={cn(SURFACE[tone], className)}>
      {bleed ? children : <div className={cn(WRAP, innerClassName)}>{children}</div>}
    </section>
  );

  if (!anchor) return section;

  return (
    <>
      <div
        id={anchor}
        aria-hidden="true"
        className={cn("h-[140px] md:h-[160px]", SURFACE[tone])}
      />
      {section}
    </>
  );
}

export function SectionHead({
  tone,
  eyebrow,
  title,
  lead,
  align = "left",
  className,
}: {
  tone: Tone;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn(
        "mb-10 max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "text-sm font-medium uppercase tracking-[0.26em]",
            eyebrowOn(tone)
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          "mt-4 text-3xl font-display font-extrabold uppercase leading-[1.05] tracking-wide sm:text-4xl",
          headOn(tone)
        )}
      >
        {title}
      </h2>

      {lead ? (
        <p className={cn("mt-5 leading-7", bodyOn(tone))}>{lead}</p>
      ) : null}
    </motion.div>
  );
}

export function SurfaceCard({
  tone,
  className,
  delay = 0,
  children,
}: {
  tone: Tone;
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className={cn(isInk(tone) ? INK_CARD : LIGHT_CARD, className)}
    >
      {children}
    </motion.div>
  );
}

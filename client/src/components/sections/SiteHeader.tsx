import type { ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { OMark } from "@/components/OMark";

/**
 * The header shell both pages share — translucent cream over whatever is
 * behind it, a hairline, and the wordmark on the left. Everything to the right
 * is the caller's, because that is the only part that genuinely differs: the
 * pre-launch page carries a single link, the homepage carries the full nav.
 *
 * `position` exists because the two pages sit differently in flow. The
 * pre-launch page is sticky and takes up space. The homepage's header is fixed
 * and overlays the hero — thirteen pages already compensate for that with
 * `pt-32`, so it stays fixed rather than dragging them all into a reflow.
 */

const POSITION = {
  sticky: "sticky top-0",
  fixed: "fixed top-0 left-0 right-0",
} as const;

export function SiteHeader({
  position = "sticky",
  onWordmarkClick,
  children,
}: {
  position?: keyof typeof POSITION;
  /** Home intercepts this to scroll to top rather than re-navigate. */
  onWordmarkClick?: (e: React.MouseEvent) => void;
  children?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={cn(
        POSITION[position],
        "z-50 border-b border-border bg-background/80 backdrop-blur-md backdrop-saturate-150"
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8 lg:px-10">
        <Link
          href="/"
          onClick={onWordmarkClick}
          className="font-wordmark text-4xl font-bold leading-none tracking-[0.16em] text-foreground transition-colors hover:text-foreground sm:text-5xl"
        >
          KIM
          <OMark className="bg-accent" tracking={0.16} />
          RA
        </Link>

        {children}
      </div>
    </motion.header>
  );
}

/** The height the fixed header occupies, for pages that must clear it. */
export const HEADER_CLEARANCE = "pt-[92px] sm:pt-[104px]";

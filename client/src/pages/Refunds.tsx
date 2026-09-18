import { Fragment } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import {
  REFUNDS_POLICY,
  type LegalBlock,
  type LegalSpan,
} from "@/lib/legal";

/**
 * The policy text lives in client/src/lib/legal.ts, not here.
 *
 * Not a tidy-up. Until 2026-09-18 this route served an empty <div id="root">
 * to every crawler that does not run JavaScript, and shared/prerender.ts now
 * renders the SAME array this component renders — so the crawler-visible
 * policy and the reader-visible policy cannot drift apart. Keeping the prose
 * in JSX here and a copy over there is the arrangement playbook finding #38
 * names as a defect, on the one kind of copy where drift is worst.
 *
 * The markup below is byte-for-byte the classes this page carried before:
 * same wrapper, same h1, same `space-y-6` list of direct children, same h2 and
 * ul classes. Only the source of the words moved.
 */

function Spans({ spans }: { spans: readonly LegalSpan[] }) {
  return (
    <>
      {spans.map((span, i) => {
        if (typeof span === "string") return <Fragment key={i}>{span}</Fragment>;
        if ("b" in span) return <strong key={i}>{span.b}</strong>;
        return <br key={i} />;
      })}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="text-foreground font-bold text-lg mt-8">{block.text}</h2>
      );
    case "ul":
      return (
        <ul className="list-disc pl-6 space-y-1">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "p":
      return (
        <p>
          <Spans spans={block.spans} />
        </p>
      );
  }
}

export default function Refunds() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            {REFUNDS_POLICY.heading}
          </h1>

          <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            {REFUNDS_POLICY.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

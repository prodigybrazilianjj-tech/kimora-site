import { Fragment, type ReactElement } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import {
  REFUNDS_POLICY,
  legalSpanKind,
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

function Spans({ spans }: { spans: readonly LegalSpan[] }): ReactElement {
  return (
    <>
      {spans.map((span, i) => {
        // Routed through legalSpanKind so a new LegalSpan variant is a compile
        // error rather than silently falling through to <br>.
        switch (legalSpanKind(span)) {
          case "text":
            return <Fragment key={i}>{span as string}</Fragment>;
          case "bold":
            return <strong key={i}>{(span as { b: string }).b}</strong>;
          case "break":
            return <br key={i} />;
        }
      })}
    </>
  );
}

/**
 * Return type is annotated ON PURPOSE.
 *
 * Under React 19's types a component returning `undefined` is a valid
 * ReactNode, so an unannotated switch with a missing case compiles clean and
 * the block just vanishes from the page while still appearing in the
 * prerender — a page/prerender divergence, which is the exact failure this
 * whole change exists to make impossible. `renderLegalBlockHtml` in
 * shared/prerender.ts is annotated `: string` for the same reason. Caught in
 * adversarial review.
 */
function Block({ block }: { block: LegalBlock }): ReactElement {
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

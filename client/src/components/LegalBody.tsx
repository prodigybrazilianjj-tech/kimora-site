import { Fragment, type ReactElement } from "react";
import { Link } from "wouter";
import { legalSpanKind, type LegalBlock, type LegalSpan } from "@/lib/legal";

/**
 * Renders a LegalPage's blocks.
 *
 * Extracted from Refunds.tsx on 2026-09-18, when /terms and /privacy joined it.
 * Three pages each carrying their own copy of this switch is the same
 * "somebody has to remember to edit all of them" arrangement that
 * client/src/lib/legal.ts exists to remove — and it would have been worse here
 * than in the data, because a divergence in the RENDERER shows up as one policy
 * quietly dropping its bold runs or its links while the others keep them.
 *
 * The markup is byte-for-byte what all three pages carried before: the same
 * `space-y-6` list of direct children, the same h2 and ul classes.
 */

function Spans({ spans }: { spans: readonly LegalSpan[] }): ReactElement {
  return (
    <>
      {spans.map((span, i) => {
        // Routed through legalSpanKind so a new LegalSpan variant is a compile
        // error rather than silently falling through to one of the branches.
        switch (legalSpanKind(span)) {
          case "text":
            return <Fragment key={i}>{span as string}</Fragment>;
          case "bold":
            return <strong key={i}>{(span as { b: string }).b}</strong>;
          case "break":
            return <br key={i} />;
          case "link": {
            const l = span as { link: string; href: string; external: boolean };
            // Internal links go through wouter so navigation stays client-side;
            // external ones open in a new tab with noopener, which is what the
            // five third-party privacy-policy links carried before this moved.
            return l.external ? (
              <a
                key={i}
                href={l.href}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {l.link}
              </a>
            ) : (
              <Link key={i} href={l.href} className="underline">
                {l.link}
              </Link>
            );
          }
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
 * whole arrangement exists to make impossible. `renderLegalBlockHtml` in
 * shared/prerender.ts is annotated `: string` for the same reason.
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
            <li key={i}>
              <Spans spans={item} />
            </li>
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

export function LegalBody({
  blocks,
}: {
  blocks: readonly LegalBlock[];
}): ReactElement {
  return (
    <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

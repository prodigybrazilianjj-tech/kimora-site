import { Fragment, type ReactElement } from "react";
import { Link } from "wouter";
import {
  legalSpanKind,
  legalHrefKind,
  type LegalBlock,
  type LegalSpan,
} from "@/lib/legal";

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
 * The markup is what /refunds and /privacy carried before, unchanged: the same
 * `space-y-6` list of direct children, the same h2 and ul classes. /terms is
 * the one exception and only in class ORDER — it carried
 * `space-y-6 text-muted-foreground leading-relaxed text-sm` where the other two
 * carried `space-y-6 text-sm text-muted-foreground leading-relaxed`. Same four
 * classes, resolved identically by Tailwind. Stated precisely because the first
 * version of this comment claimed "byte-for-byte what all three pages carried"
 * while Terms.tsx, in the same commit, documented the difference — two comments
 * in one commit contradicting each other.
 */

function Spans({ spans }: { spans: readonly LegalSpan[] }): ReactElement {
  return (
    <>
      {/* The `: ReactElement` annotation on this callback is load-bearing.
          Without it a missing case compiles clean and the span renders as
          nothing — and because the prerender would drop it too, the defect
          would hide even from a diff of the two surfaces. With it, a new
          LegalSpan variant is TS2366 here. Proven by experiment in review. */}
      {spans.map((span, i): ReactElement => {
        switch (legalSpanKind(span)) {
          case "text":
            return <Fragment key={i}>{span as string}</Fragment>;
          case "bold":
            return <strong key={i}>{(span as { b: string }).b}</strong>;
          case "break":
            return <br key={i} />;
          case "link": {
            const l = span as { link: string; href: string };
            // Same guard the prerender uses, so both surfaces accept and
            // reject exactly the same hrefs. A rejected href degrades to plain
            // text here too: the sentence reads, it just isn't clickable.
            switch (legalHrefKind(l.href)) {
              case "external":
                return (
                  <a
                    key={i}
                    href={l.href}
                    className="underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.link}
                  </a>
                );
              case "internal":
                // wouter, so in-app navigation stays client-side.
                return (
                  <Link key={i} href={l.href} className="underline">
                    {l.link}
                  </Link>
                );
              case null:
                return <Fragment key={i}>{l.link}</Fragment>;
            }
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

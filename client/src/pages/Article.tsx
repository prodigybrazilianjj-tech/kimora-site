import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { LEARN_BASE, articleForSlug, type ArticleBlock } from "@/lib/articles";

/**
 * A single /learn/:slug article.
 *
 * Renders the block list from client/src/lib/articles.ts. server/seo.ts renders
 * the same blocks to HTML for crawlers that don't execute JS, so what a reader
 * sees here and what an answer engine retrieves come from one source and cannot
 * disagree.
 */
export default function Article({ params }: { params?: { slug?: string } }) {
  // `params` comes from <Route path="/learn/:slug" component={Article} />,
  // which already ran the pattern match. Calling useRoute here would re-derive
  // state the router just computed.
  //
  // Lower-cased because wouter matches case-INSENSITIVELY — regexparam
  // compiles route patterns with the `i` flag — so this can be handed
  // "Creatine-And-Electrolytes-Together". server/static.ts 301s known routes to
  // lowercase before they get here, but this is the layer that would actually
  // 404, so it should not depend on the redirect having fired.
  const article = params?.slug
    ? articleForSlug(params.slug.toLowerCase())
    : undefined;

  if (!article) return <ArticleNotFound />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <article className="container px-4 mx-auto max-w-3xl">
          <Link
            href={LEARN_BASE}
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> All articles
          </Link>

          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            {article.headline}
          </h1>

          <p className="mt-4 text-lg text-foreground/70 leading-relaxed">
            {article.dek}
          </p>

          <div className="mt-12 space-y-6">
            {article.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}

/**
 * The empty state for an unknown /learn slug.
 *
 * Deliberately not the shared not-found page. That one reads "Did you forget
 * to add the page to the router?" on a bare grey background with no Navbar and
 * no Footer — developer copy, and no DSHEA disclaimer. /learn/:slug is a
 * guessable, linkable, shareable public URL space now, so a stale link or a
 * typo lands a customer there. This keeps them on the site and points them at
 * the corpus.
 */
function ArticleNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            That article doesn’t exist
          </h1>

          <p className="mt-4 text-lg text-foreground/70">
            It may have moved, or the link may have a typo in it.
          </p>

          <Link
            href={LEARN_BASE}
            className="mt-8 inline-flex items-center text-primary-strong hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> See everything we’ve written
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="text-2xl font-display font-bold text-foreground pt-6">
          {block.text}
        </h2>
      );

    case "p":
      return (
        <p className="text-base text-foreground/75 leading-relaxed">
          {block.text}
        </p>
      );

    case "qa":
      return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6">
          <div className="text-foreground font-semibold mb-1">{block.q}</div>
          <p className="text-sm text-foreground/70 leading-relaxed">{block.a}</p>
        </div>
      );

    case "sources":
      return (
        <div className="pt-6">
          <h2 className="text-2xl font-display font-bold text-foreground mb-4">
            Sources
          </h2>
          <ul className="space-y-3 text-sm text-foreground/70">
            {block.items.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  // noopener because target="_blank" otherwise hands the opened
                  // page a live window.opener reference back to this one.
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

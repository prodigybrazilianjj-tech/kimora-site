import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import NotFound from "@/pages/not-found";
import { LEARN_BASE, articleForSlug, type ArticleBlock } from "@/lib/articles";

/**
 * A single /learn/:slug article.
 *
 * Renders the block list from client/src/lib/articles.ts. server/seo.ts renders
 * the same blocks to HTML for crawlers that don't execute JS, so what a reader
 * sees here and what an answer engine retrieves come from one source and cannot
 * disagree.
 */
export default function Article() {
  const [, params] = useRoute(`${LEARN_BASE}/:slug`);
  const article = params?.slug ? articleForSlug(params.slug) : undefined;

  // An unknown slug is a genuine 404, not an empty article page. The route
  // table in shared/seo.ts only lists slugs that exist, so an unknown one also
  // ships noindex — the two have to agree or we would be asking Google to index
  // a page that renders "not found".
  if (!article) return <NotFound />;

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

import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { ARTICLES, articlePath } from "@/lib/articles";

/**
 * The /learn hub.
 *
 * Its job is not to be pretty, it is to be a crawlable index: one internal
 * link per article, with the article's own dek as the link context. A corpus
 * with no index page gives a crawler nothing to discover the second piece
 * from, and gives a reader nothing to do at the end of the first.
 */
export default function Learn() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          {/* Matches the prerendered h1 in shared/prerender.ts verbatim. It
              said "Learn" and the fallback said the full phrase, which broke
              the rule that file states about itself — and the longer version
              is the better h1 anyway, since "Learn" alone tells a crawler
              nothing about what the corpus covers. */}
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Learn — Creatine, Electrolytes and Training
          </h1>

          <p className="mt-4 text-lg text-foreground/70">
            Straight answers about creatine, electrolytes and training. Sourced,
            and honest about where the evidence stops.
          </p>

          <div className="mt-12 space-y-6">
            {ARTICLES.map((article) => (
              <Link
                key={article.slug}
                href={articlePath(article.slug)}
                className="block rounded-2xl border border-foreground/10 bg-foreground/5 p-6 transition-colors hover:bg-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/60"
              >
                <h2 className="text-xl font-display font-bold text-foreground">
                  {article.headline}
                </h2>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">
                  {article.dek}
                </p>
                <span className="mt-4 inline-block text-xs uppercase tracking-wider text-primary-strong">
                  Read
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

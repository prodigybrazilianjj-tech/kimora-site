// ─────────────────────────────────────────────────────────────────────────
// The /learn corpus — one registry, four consumers.
//
//   1. client/src/pages/Learn.tsx     → the hub index
//   2. client/src/pages/Article.tsx   → the rendered article
//   3. shared/seo.ts                  → route table, sitemap, Article JSON-LD
//   4. shared/prerender.ts            → the crawler-visible body
//
// WHY STRUCTURED DATA AND NOT MARKDOWN. The obvious shape for a content
// library is .md files and a parser. Two things rule it out here. First, the
// server has to render the same prose into HTML for crawlers that don't run
// JS, so a client-side markdown renderer would leave the corpus invisible to
// exactly the readers it was written for — the whole point of the /learn
// build. Second, adding a markdown pipeline means adding a dependency, and
// this repo cannot verify a dependency install from the session that writes
// the code. Blocks are plain data: React maps them to elements, the server
// maps them to HTML, and neither can render something the other cannot.
//
// WHY THIS LIVES IN client/src/lib/ AND NOT shared/. It is read by the server,
// so shared/ is where it looks like it belongs. But shared/seo.ts already
// reaches the other direction — into client/src/lib/prelaunch.ts and
// product.ts — and that crossing is proven: esbuild resolves it and the 8/25
// build confirmed it. The reverse crossing, a client file importing @shared/*,
// has never been exercised in this repo, and the alias cannot be confirmed to
// resolve without running a build that this session must not run. Following
// the proven direction costs nothing but a slightly odd filename.
//
// The prose source of record is
// `Kimora - Executive Operator/marketing/seo/<slug>.md`. When a piece is
// edited there, it is edited here in the same pass — see the DRIFT note on
// each article.
//
// CLAIMS DISCIPLINE. This corpus is the most quotable surface Kimora has:
// long-form, cited, and written to be lifted verbatim by an answer engine.
// Every sentence in it should survive being read back by a stranger as a
// product claim, because that is what happens. No disease claims. No spec
// number the lab has not confirmed — sodium, potassium and magnesium amounts
// are pending the production CoA and appear nowhere. No wholesale pricing.
// ─────────────────────────────────────────────────────────────────────────

/** One renderable unit of an article. */
export type ArticleBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  /**
   * A question/answer pair. Rendered as a bolded question and a paragraph, and
   * carried through to the prerendered body the same way.
   *
   * Deliberately NOT emitted as FAQPage structured data. Four of the six
   * questions on the first article overlap /faq, and two FAQPage entities on
   * one site answering the same questions in different words is a drift
   * hazard with nothing on the other side of it — Google deprecated FAQ rich
   * results in May 2026 (playbook finding #14), so there is no rich result to
   * win. The page earns its keep as an Article instead.
   */
  | { type: "qa"; q: string; a: string }
  | { type: "sources"; items: readonly ArticleSource[] };

export interface ArticleSource {
  label: string;
  url: string;
}

export interface Article {
  /** URL segment. `/learn/<slug>`. Lowercase, hyphenated. */
  slug: string;
  /** <title> and the hub card's heading. */
  title: string;
  /** The on-page h1. Usually the title without the brand suffix. */
  headline: string;
  /** One line under the h1, and the hub card's summary. Also the meta description if `description` is absent. */
  dek: string;
  /** Meta description. Keep under ~155 characters. */
  description: string;
  /** ISO date, first publication. Feeds datePublished. */
  published: string;
  /** ISO date, last substantive edit. Feeds dateModified and the sitemap's lastmod. */
  updated: string;
  /** The standing query this piece is aimed at, for the scoreboard. Not rendered. */
  targetQuery: string;
  blocks: readonly ArticleBlock[];
}

// ── The corpus ───────────────────────────────────────────────────────────

const CREATINE_AND_ELECTROLYTES: Article = {
  slug: "creatine-and-electrolytes-together",
  title: "Can You Take Creatine and Electrolytes Together? | Kimora Co.",
  headline: "Can you take creatine and electrolytes together?",
  dek: "Yes. The reason is more boring than the internet says, and the boring reason is the honest one.",
  description:
    "Yes — and the reason is more boring than the internet says. What the sodium-dependent creatine transporter does, what it doesn't, and why one stick beats two scoops.",
  published: "2026-08-26",
  updated: "2026-08-26",
  targetQuery: "Can you take creatine and electrolytes together?",
  // DRIFT: prose source is marketing/seo/creatine-and-electrolytes-together.md.
  // Written 2026-08-25, published here 2026-08-26. Edit both together.
  blocks: [
    {
      type: "p",
      text: "Yes. Put them in the same glass. Nothing dramatic happens, which is the point.",
    },
    {
      type: "p",
      text: "That answer is unsatisfying enough that most of the internet has decided to improve on it. Search this question and you will be told the combination is synergistic, that sodium “unlocks” creatine uptake, that pairing them is the new pre-workout secret. Some of that is a real mechanism described accurately. Some of it is a real mechanism described the way a supplement company would like you to hear it.",
    },
    { type: "p", text: "Here is the version with the marketing taken out." },

    { type: "h2", text: "The mechanism is real" },
    {
      type: "p",
      text: "Creatine does not wander into a muscle cell on its own. It gets carried in by a transporter protein called CreaT, coded by the gene SLC6A8, sitting on the muscle cell membrane. Its full name in the literature is the sodium- and chloride-dependent creatine transporter — sodium and chloride are structurally part of how the thing works, not an optional upgrade.",
    },
    {
      type: "p",
      text: "So when someone tells you “sodium is involved in creatine uptake,” they are not making it up. Skeletal muscle gets essentially all of its creatine this way, from the bloodstream, through that transporter.",
    },

    { type: "h2", text: "The conclusion people draw from it is not" },
    { type: "p", text: "Here is where the reasoning quietly goes sideways." },
    {
      type: "p",
      text: "“The transporter needs sodium” is a fact about physiology. “Therefore adding more sodium to your creatine makes it work better” is a claim about a supplement, and it is a different claim entirely. Your blood sodium is already tightly regulated — your body defends that number hard, because a lot depends on it. The transporter is not sitting there under-supplied, waiting for you to stir in some salt.",
    },
    {
      type: "p",
      text: "The honest version: sodium is a prerequisite, not a dial. A well-fed athlete already has the sodium the transporter needs. Adding electrolytes to your creatine does not fail — it just isn’t doing the heroic thing the headline implies.",
    },
    {
      type: "p",
      text: "We are not going to claim it is. That would be a fun sentence to put on a pouch, and we’d have nothing to hand you if you asked for the study.",
    },

    { type: "h2", text: "So why put them in the same stick at all?" },
    {
      type: "p",
      text: "Because of a much less glamorous problem: people stop taking creatine.",
    },
    {
      type: "p",
      text: "Creatine only works if it is in you. Saturation takes roughly three to four weeks of consistent daily dosing, and then it stays there as long as you keep going. Miss a week and you drift back down. Every real-world creatine failure we have ever heard described — “I tried it, didn’t notice anything” — is a compliance story, not a chemistry story.",
    },
    {
      type: "p",
      text: "Meanwhile, if you train in a gi in August, or roll five rounds in a room with no air conditioning, or cut weight in the two weeks before a tournament, you are already thinking about sodium and potassium. That is not a supplement fantasy; that is just what sweating a lot does to you.",
    },
    {
      type: "p",
      text: "So you have two daily habits. One you’d abandon quietly. One you’d remember on the hot days and forget on the cold ones.",
    },
    {
      type: "p",
      text: "Putting them in one stick is a scheduling fix, not a metabolic one. One thing to remember instead of two. One thing to pack instead of two. That is the entire argument, and it is a better argument than “synergy” because it is true.",
    },

    { type: "h2", text: "What about the taste problem?" },
    {
      type: "p",
      text: "This is the part nobody writes an article about and everybody experiences.",
    },
    {
      type: "p",
      text: "Unflavored creatine monohydrate in water is grit. Electrolyte powder is salt. Combine two things people already hold their nose for and you have built something with a compliance problem baked in — which, given that compliance is the whole game, is a design failure.",
    },
    {
      type: "p",
      text: "Getting a creatine-electrolyte drink to taste like something you’d have on purpose is genuinely the hard part of this category. Salt is loud. Creatine is chalky. You are fighting both while also not reaching for sucralose, artificial colors, or sugar alcohols to paper over it.",
    },
    {
      type: "p",
      text: "Kimora is sweetened with stevia and monk fruit. No sugar, no sugar alcohols, no artificial colors, no silicon dioxide. That constraint is a large part of why the formula took as long as it did.",
    },

    { type: "h2", text: "The practical answers" },
    {
      type: "qa",
      q: "Can I mix them in the same glass?",
      a: "Yes. There is no interaction to avoid.",
    },
    {
      type: "qa",
      q: "Does timing matter?",
      a: "Less than you want it to. Consistency beats timing. Creatine works by being in your muscle, not by being in your bloodstream at a clever moment. Take it at whatever hour you will actually take it every day — with breakfast, after class, whenever. The best time is the one you don’t skip.",
    },
    {
      type: "qa",
      q: "Do I need a loading phase?",
      a: "No. Loading (around 20 g a day for a week) gets you saturated faster and is more likely to upset your stomach. One 5 g dose a day gets you to the same place in three to four weeks. If you are three weeks out from a competition, load. Otherwise don’t bother.",
    },
    {
      type: "qa",
      q: "Won’t creatine make me hold water and blow my weight cut?",
      a: "Creatine draws water into the muscle cell. That is the intended effect, not a side effect. The “puffy” look people describe is usually aggressive loading or low-quality product, not creatine at a normal daily dose. If you compete at a weight, do what you’d do with any variable: start it well outside of fight camp so you know your own numbers, rather than three days before you step on a scale.",
    },
    {
      type: "qa",
      q: "Does creatine cause cramping or dehydration?",
      a: "The International Society of Sports Nutrition’s position stand addresses this directly and reports that the evidence does not support it — studies have found creatine supplementation either has no effect on, or reduces, the incidence of dehydration and muscle cramping. That one has been repeated for twenty years mostly because it sounds plausible.",
    },
    {
      type: "qa",
      q: "Is creatine safe?",
      a: "It is among the most studied supplements in sports nutrition. The ISSN position stand describes short- and long-term supplementation as safe and well tolerated in healthy people. If you have a kidney condition or take prescription medication, that’s a conversation with your doctor, not with a supplement label.",
    },
    {
      type: "qa",
      q: "Can I stack this with pre-workout?",
      a: "Yes. Kimora is stimulant-free, so there’s nothing to double up on.",
    },

    { type: "h2", text: "What we’re not telling you" },
    {
      type: "p",
      text: "We won’t tell you a creatine-electrolyte combination outperforms creatine alone, because we don’t have the evidence to put behind that sentence.",
    },
    {
      type: "p",
      text: "We won’t publish our final sodium, potassium and magnesium numbers until the production Certificate of Analysis confirms them. The targets are set; the lab has the last word. A website that says one number and a pouch that says another is worse than a website that says nothing, so this page will stay quiet on that until the panel is signed off.",
    },
    {
      type: "p",
      text: "What we will say: 5 g creatine monohydrate per stick. Thirty sticks to a pouch, which is a month. Naturally sweetened with stevia and monk fruit. No proprietary blends, because a blend is where a number goes to hide.",
    },

    {
      type: "sources",
      items: [
        {
          label:
            "Kreider et al., International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. JISSN 14:18 (2017)",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5469049/",
        },
        {
          label:
            "Wax et al., Creatine for Exercise and Sports Performance, with Recovery Considerations for Healthy Populations. Nutrients 13:1915 (2021)",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8228369/",
        },
        {
          label:
            "Russell et al., Creatine transporter (SLC6A8) knockout mice display an increased capacity for in vitro creatine biosynthesis in skeletal muscle. Frontiers in Physiology 5:314 (2014)",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4144344/",
        },
        // The download URL, not the /genetics/gene/slc6a8/ page URL. The page
        // URL is the one you would guess and it was not confirmed to resolve;
        // this one came back from a live search. Every URL in this corpus is
        // verified before it ships — a dead citation on a page whose entire
        // argument is "we only say things we can source" is worse than no
        // citation.
        {
          label: "SLC6A8 gene — MedlinePlus Genetics",
          url: "https://medlineplus.gov/download/genetics/gene/slc6a8.pdf",
        },
      ],
    },
  ],
};

/**
 * Every published article, newest first. The hub renders this order and the
 * sitemap follows it.
 *
 * To publish a piece: write it in marketing/seo/, add it here, and it appears
 * on the hub, in the route table, in the sitemap, in the prerendered body and
 * in the Article JSON-LD without touching any of those files.
 */
export const ARTICLES: readonly Article[] = [CREATINE_AND_ELECTROLYTES];

export const LEARN_BASE = "/learn";

/** `/learn/<slug>` for an article. */
export function articlePath(slug: string): string {
  return `${LEARN_BASE}/${slug}`;
}

export function articleForSlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** The most recent `updated` date across the corpus — the hub's lastmod. */
export function corpusLastUpdated(): string {
  return ARTICLES.reduce(
    (latest, a) => (a.updated > latest ? a.updated : latest),
    ARTICLES[0]?.updated ?? "2026-08-26",
  );
}

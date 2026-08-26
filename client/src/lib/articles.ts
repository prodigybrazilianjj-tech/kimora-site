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

import { FLAVORS, LAUNCH_FLAVOR, STICKS_PER_POUCH } from "./product";

// ── Prices, for the pieces that quote them ───────────────────────────────
//
// Read from the catalog, never typed into prose. The stick-packs piece argues
// from Kimora's own per-day cost, so a price change in product.ts that left
// this file asserting the old number would not just be stale — it would make
// the article's arithmetic visibly wrong on the one page whose entire premise
// is that it shows its working. Same rule shared/prerender.ts learned on
// 2026-08-26.
const LAUNCH = FLAVORS.find((f) => f.slug === LAUNCH_FLAVOR) ?? FLAVORS[0];

const PRICE_ONE_TIME = LAUNCH.priceOneTime.toFixed(2);
const PER_DAY_ONE_TIME = (LAUNCH.priceOneTime / STICKS_PER_POUCH).toFixed(2);
const PER_DAY_SUB = (LAUNCH.priceSub / STICKS_PER_POUCH).toFixed(2);

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
  // 148 characters. The ~155 ceiling is a real constraint, not a style note:
  // the previous version ran to 165 and Google truncated it mid-clause.
  description:
    "Yes — and the reason is more boring than the internet says. What the sodium-dependent creatine transporter does, and what it doesn't do for you.",
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
      // Was: "Miss a week and you drift back down. Every real-world creatine
      // failure we have ever heard described … is a compliance story, not a
      // chemistry story." Both halves failed this page's own standard. Washout
      // takes roughly four to six weeks, not a week. And non-response is a
      // documented phenomenon discussed in the ISSN position stand this piece
      // cites two blocks later — so an absolute "every … is a compliance
      // story" was an unsupported claim on a page whose entire argument is
      // that it does not make those. It was also exactly the sentence shape an
      // answer engine lifts.
      text: "Creatine only works if it is in you. Saturation takes roughly three to four weeks of consistent daily dosing, and then it stays there as long as you keep going. Stop and it washes out over the following weeks. Most of the real-world creatine failures we hear described — “I tried it, didn’t notice anything” — are compliance stories rather than chemistry ones, though a minority of people genuinely respond less than others.",
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

const STICK_PACKS: Article = {
  slug: "creatine-stick-packs",
  title: "Creatine Stick Packs: Who Makes Them, What You're Paying For | Kimora Co.",
  headline:
    "Creatine stick packs: who makes them, and what you're actually paying for",
  dek: "A stick pack is not better creatine. Here is who makes them, how they differ, and the cost math with our own price in it.",
  // 149 characters.
  description:
    "Which brands make creatine stick packs, how they differ, and the honest cost math against a tub — including ours. A stick is not better creatine.",
  published: "2026-08-26",
  updated: "2026-08-26",
  targetQuery: "Creatine stick packs — which brands make them?",
  // DRIFT: prose source is marketing/seo/creatine-stick-packs.md. Edit both.
  //
  // Deliberately contains NO competitor price and NO competitor dose. Brands
  // are named — brands are durable — but numbers about them are not, and a
  // stale figure presented as fact on a page whose whole argument is sourcing
  // honesty would be self-defeating. The structural claim carries it instead:
  // the format does not tell you the dose, so read the panel.
  blocks: [
    {
      type: "p",
      text: "A stick pack is not better creatine. It is the same compound in a more expensive wrapper, and anyone selling you one — us included — should be able to say that out loud before they explain why they think it’s worth it.",
    },
    {
      type: "p",
      text: "So: here’s who makes them, what separates them, and the cost math with nothing hidden.",
    },

    { type: "h2", text: "Who makes creatine stick packs" },
    {
      type: "p",
      text: "Two different products are being sold under the same shape, and most roundups blur them together. Worth separating, because they answer different questions.",
    },
    {
      type: "p",
      text: "Plain creatine in a stick. A measured dose of creatine monohydrate, flavored or not, in a single-serve sachet. Orgain, Kaged, Momentous, Nutricost, Transparent Labs and Core Med Science all make a version. These compete with a tub on convenience alone — same ingredient, portable format.",
    },
    {
      type: "p",
      text: "Creatine plus electrolytes in a stick. A newer category, and a crowded one as of 2026: MYOXCIENCE, MHP, Create Wellness, OMNI, Ancient Nutrition and Kimora are all in it. These are trying to be two habits in one sachet rather than a portable version of one habit.",
    },
    {
      type: "p",
      text: "If you are shopping the second group, the useful thing to know is that the format tells you nothing about the dose. Some creatine-and-electrolyte sticks carry a full 5 g of creatine and some carry meaningfully less, because there is only so much room in a stick and electrolytes and flavoring take some of it. The panel is the only place that answers this. Check it on every one of them, ours included.",
    },

    { type: "h2", text: "What you’re actually paying for" },
    {
      type: "p",
      text: "Here is the number nobody in this category volunteers.",
    },
    {
      type: "p",
      text: "Creatine monohydrate in a tub costs somewhere between eight and thirty-five cents per five-gram serving, depending on brand and testing. Bought in bulk it goes lower.",
    },
    {
      type: "p",
      text: `Kimora is $${PRICE_ONE_TIME} for ${STICKS_PER_POUCH} sticks. That is about $${PER_DAY_ONE_TIME} a day, or $${PER_DAY_SUB} on subscription.`,
    },
    {
      type: "p",
      text: "That is not a rounding error. On the creatine alone, a stick pack — ours or anyone’s — costs several times what the same dose costs out of a tub. If someone tells you otherwise, ask them to show their arithmetic.",
    },
    {
      type: "p",
      text: "What the extra actually buys, in descending order of honesty: electrolytes you would otherwise be buying separately, so if you already take an electrolyte drink most days, part of that premium is a product you are already paying for. A dose you cannot get wrong and cannot skip because the tub is at home. Flavor and mixability, which sound like luxuries and are the reason a lot of tubs die half-full in a cupboard. And third-party testing plus a formulation someone had to develop — real cost, and also something a good tub can offer.",
    },
    {
      type: "p",
      text: "What it does not buy is better creatine. It is the same molecule.",
    },

    { type: "h2", text: "About “micronized”" },
    {
      type: "p",
      text: "While we are naming things the category oversells: micronized creatine is a marketing word doing less work than it appears to.",
    },
    {
      type: "p",
      text: "Micronization grinds the particles smaller. Smaller particles dissolve faster and grit less. That is a real, noticeable improvement — to the glass.",
    },
    {
      type: "p",
      text: "It is a physical change, not a chemical one: the molecule that ends up in your bloodstream is identical either way. What the research does not show is a meaningful difference in how much creatine reaches muscle, and both forms take the same three to four weeks to saturate.",
    },
    {
      type: "p",
      text: "Kimora uses micronized creatine monohydrate. We use it because it makes a drinkable product, not because it works better, and we are not going to imply the second thing by leaving the first one vague.",
    },

    { type: "h2", text: "When a tub is the right answer" },
    { type: "p", text: "It genuinely often is. Buy a tub if:" },
    {
      type: "p",
      text: "You train at home or at one gym and take it in the same kitchen every day. Cost per serving is the thing you are optimizing. You do not mind measuring, and you do not mind the taste of unflavored creatine in water. You are already disciplined about a daily supplement and have been for months.",
    },
    {
      type: "p",
      text: "None of that is a failure mode. It is the cheapest correct way to take creatine, and if it describes you, a stick pack is a worse deal.",
    },

    { type: "h2", text: "When a stick is the right answer" },
    {
      type: "p",
      text: "You travel, compete, or train at more than one place. You want electrolytes on the same schedule and would rather not manage two products. Or — the common one, and worth being blunt about — you have bought creatine before and stopped taking it. Creatine only works if it is in you, and saturation decays when you stop.",
    },
    {
      type: "p",
      text: "If the tub is the reason you skip it, a format that gets taken beats a cheaper format that doesn’t. That is the entire argument for this product category, and it is a behavioral argument rather than a biochemical one. We would rather make the honest version of it than dress it up as absorption.",
    },

    { type: "h2", text: "What to check on any stick pack, ours included" },
    {
      type: "qa",
      q: "Grams of creatine monohydrate per stick.",
      a: "Front of pack is marketing; the Supplement Facts panel is the claim.",
    },
    {
      type: "qa",
      q: "Sticks per box, and the resulting cost per day.",
      a: "Boxes come in fifteens, twenties, thirties and forties, which makes headline prices hard to compare on purpose.",
    },
    {
      type: "qa",
      q: "What else is in it, and whether you want it.",
      a: "Some add taurine, some add HMB, some add electrolytes, some add a sweetener you would rather avoid.",
    },
    {
      type: "qa",
      q: "Third-party testing.",
      a: "And whether the results are published or merely mentioned.",
    },
    {
      type: "qa",
      q: "The sweetener, named specifically.",
      a: "“Sugar-free” is not an ingredient.",
    },
    {
      type: "qa",
      q: "Whether it is a subscription trap.",
      a: "Cancellation should take one click.",
    },

    { type: "h2", text: "What we’re not telling you" },
    {
      type: "p",
      text: "We are not going to tell you a stick pack absorbs better, works faster, or delivers more creatine than a tub. It doesn’t, on any of the three.",
    },
    {
      type: "p",
      text: "We are not going to publish our final sodium, potassium and magnesium numbers until the production Certificate of Analysis confirms them. The targets are set and the lab has the last word; a site that says one number while the pouch says another is worse than a site that says nothing.",
    },
    {
      type: "p",
      text: "And we are not going to quote you a competitor’s price or dose on this page. Those change, and a stale number presented as fact would undercut the only thing this page is trying to be useful for. Go read their panel.",
    },
    {
      type: "p",
      text: `What we will say: 5 g creatine monohydrate per stick. ${STICKS_PER_POUCH} sticks to a pouch, which is a month. Naturally sweetened with stevia and monk fruit. No sugar, no artificial colors, no proprietary blends.`,
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
export const ARTICLES: readonly Article[] = [
  STICK_PACKS,
  CREATINE_AND_ELECTROLYTES,
];

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

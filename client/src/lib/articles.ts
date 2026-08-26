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
   * A bulleted list.
   *
   * Added 2026-08-26 because it was missing and its absence was silently
   * corrupting content. The stick-packs piece has four lists in its prose
   * source; without a list type each one was flattened into a run-on
   * paragraph sitting under a colon that promised a list — visibly broken on
   * the page, and worse in the crawler HTML, where a list is one of the few
   * structures an answer engine reliably extracts.
   *
   * The lesson generalises: when the block vocabulary cannot express the
   * prose, the transcription does not fail loudly, it just quietly produces a
   * worse article.
   */
  | { type: "ul"; items: readonly string[] }
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
  /**
   * The <title> tag. **Keep under ~60 characters** — Google truncates around
   * there, and one of these shipped at 73 and another at 61 before anyone
   * measured. `description` has carried a stated ceiling since day one and was
   * checked every time; `title` did not, and drifted twice. It has one now.
   *
   * The full question or claim belongs in `headline`, which has no such limit
   * and is what the h1 and the Article schema use.
   */
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
  // 47 characters. Was "Can You Take Creatine and Electrolytes Together? |
  // Kimora Co." at 61, which Google truncates. The full question survives as
  // the h1 and in `headline`, which is where query matching actually matters.
  title: "Creatine and Electrolytes Together | Kimora Co.",
  headline: "Can you take creatine and electrolytes together?",
  dek: "Yes. The reason is more boring than the internet says, and the boring reason is the honest one.",
  // 144 characters. The ~155 ceiling is a real constraint, not a style note:
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
      // "or low-quality product" removed 2026-08-26: an unsourced inferiority
      // claim about unnamed competitors, and one that sits badly against the
      // stick-packs piece's "it is the same molecule."
      a: "Creatine draws water into the muscle cell. That is the intended effect, not a side effect. The “puffy” look people describe is generally associated with aggressive loading rather than a standard daily dose. If you compete at a weight, do what you’d do with any variable: start it well outside of fight camp so you know your own numbers, rather than three days before you step on a scale.",
    },
    {
      type: "qa",
      q: "Does creatine cause cramping or dehydration?",
      // Trimmed to the defensive half 2026-08-26. It previously said studies
      // found creatine "either has no effect on, or reduces, the incidence of
      // dehydration and muscle cramping" — the "or reduces" clause is a
      // positive claim carried on someone else's citation, and it is exactly
      // the claim class /learn/training-in-arizona makes a virtue of refusing.
      // An engine retrieving both pages would have found Kimora saying its own
      // ingredient reduces cramp incidence, and two clicks away that nothing
      // in a sachet addresses cramp. Rebutting the myth does not require
      // claiming the opposite.
      a: "The International Society of Sports Nutrition’s position stand addresses this directly and reports that the evidence does not support creatine causing either one. That claim has been repeated for twenty years mostly because it sounds plausible. What causes exercise cramps is a separate question, and a less settled one — see our piece on training in Arizona.",
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
  // 49 characters. The first version was 73 and Google truncated it around
  // "…What You're Pay". There is no length check on titles the way there is on
  // descriptions, which is how it got through.
  title: "Creatine Stick Packs: Who Makes Them | Kimora Co.",
  headline:
    "Creatine stick packs: who makes them, and what you’re actually paying for",
  dek: "A stick pack is not better creatine. Here is who makes them, how they differ, and the cost math with our own price in it.",
  // 145 characters.
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
      // An extractable one-liner. Answer engines lift sentences of exactly this
      // shape for "which brands make X", and without one the page relies on an
      // engine assembling the list itself from three bullets.
      type: "p",
      text: "Brands making creatine stick packs as of August 2026 include Thorne, Orgain, Momentous, Nutricost, Core Med Science, Transparent Labs, Kaged, mindbodygreen, MYOXCIENCE, MHP, Create Wellness, OMNI, Ancient Nutrition and Kimora.",
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
      text: "Three different products are being sold under the same shape, and most roundups blur them together. Worth separating, because they answer different questions. Checked August 2026 — this is a category that moves.",
    },
    {
      type: "ul",
      items: [
        "Plain creatine in a stick. A measured dose of creatine monohydrate and nothing else of consequence, flavored or not. Thorne, Orgain, Momentous, Nutricost and Core Med Science. These compete with a tub on convenience alone — same ingredient, portable format.",
        "Creatine plus a performance additive. Transparent Labs adds HMB, Kaged adds an absorption complex, mindbodygreen adds taurine. Same creatine, plus something else you are also buying and should decide you want.",
        "Creatine plus electrolytes. The newest of the three and the most crowded: MYOXCIENCE, MHP, Create Wellness, OMNI, Ancient Nutrition and Kimora. These are trying to be two habits in one sachet rather than a portable version of one habit.",
      ],
    },
    {
      // Was: "…some carry meaningfully less, because there is only so much room
      // in a stick and electrolytes and flavoring take some of it." Deleted the
      // causal clause. It is refuted by our own product — Kimora fits 5 g plus
      // three minerals into the same stick size — so it was a charitable
      // physical explanation invented for what is a formulation-cost decision.
      // Inventing a generous motive for a competitor is the same failure as
      // inventing an unkind one; the page's whole posture is not doing that.
      //
      // Also replaced the implied "some of THEM under-dose, we don't" with a
      // dated market statement that is substantiable without singling anyone
      // out. Substantiation is recorded in
      // marketing/seo/substantiation/creatine-stick-packs-2026-08-26.md.
      type: "p",
      text: "If you are shopping the third group, the useful thing to know is that the format tells you nothing about the dose. Checking six creatine-and-electrolyte panels in August 2026, the creatine ranged from under 3 g to a full 5 g per stick. The panel is the only place that answers this. Check it on every one of them, ours included.",
    },

    { type: "h2", text: "What you’re actually paying for" },
    {
      type: "p",
      text: "Here is the number nobody in this category volunteers.",
    },
    {
      // The published range was "eight and thirty-five cents", which was a bulk
      // -bag floor and a ceiling roughly half of reality for the certified tier
      // the sentence claimed to cover. It was also the only hard number on the
      // page — the one thing a reader can check in thirty seconds — on a page
      // whose entire thesis is that it does not do that. Widened, tiered, and
      // dated.
      type: "p",
      text: "Creatine monohydrate in a tub runs roughly ten to seventy cents per five-gram serving. Uncertified bulk powder sits at the bottom; a third-party-tested brand sits near the top. Checked August 2026.",
    },
    {
      type: "p",
      text: `Kimora will be $${PRICE_ONE_TIME} for ${STICKS_PER_POUCH} sticks. That is about $${PER_DAY_ONE_TIME} a day, or $${PER_DAY_SUB} on subscription.`,
    },
    {
      // "Several times" was true against a bulk tub and false against a
      // certified one — at seventy cents it is under double. Stating both ends
      // is more precise, more checkable, and more credible than the round
      // number that flattered the argument.
      type: "p",
      text: "That is not a rounding error. Against cheap bulk powder, a stick pack — ours or anyone’s — costs something like ten times per dose. Against a premium third-party-tested tub it is closer to double. Either way you are paying more per gram of creatine, and other stick packs land in much the same place we do. If someone in this category tells you otherwise, ask them to show their arithmetic.",
    },
    {
      type: "p",
      text: "What the extra actually buys, in descending order of honesty:",
    },
    {
      type: "ul",
      items: [
        "Electrolytes you would otherwise be buying separately. If you already take an electrolyte drink most days, part of that premium is a product you are already paying for, moved into the same sachet.",
        "A dose you cannot get wrong, and cannot skip because the tub is at home.",
        "Flavor and mixability — which sound like luxuries, and are the reason a lot of tubs die half-full in a cupboard.",
        "Third-party testing and a formulation someone had to develop. Real cost, and also something a good tub can offer.",
      ],
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
      // Was: "…and both forms take the same three to four weeks to saturate."
      // That converted an absence of evidence into a positive finding, in the
      // same breath as correctly framing the adjacent claim as an absence. No
      // study has compared micronized against standard on saturation timeline;
      // the three-to-four-week figure comes from standard daily-dosing work.
      type: "p",
      text: "It is a physical change, not a chemical one: the molecule that ends up in your bloodstream is identical either way. What the research does not show is a meaningful difference in how much creatine reaches muscle, and there is no evidence either form saturates faster than the other — both get there on the three-to-four-week timeline a standard daily dose takes.",
    },
    {
      type: "p",
      text: "Kimora uses micronized creatine monohydrate. We use it because it makes a drinkable product, not because it works better, and we are not going to imply the second thing by leaving the first one vague.",
    },

    { type: "h2", text: "When a tub is the right answer" },
    { type: "p", text: "It genuinely often is. Buy a tub if:" },
    {
      type: "ul",
      items: [
        "You train at home or at one gym, and take it in the same kitchen every day.",
        "Cost per serving is the thing you are optimizing.",
        "You do not mind measuring, and you do not mind the taste of unflavored creatine in water.",
        "You are already disciplined about a daily supplement, and have been for months.",
      ],
    },
    {
      type: "p",
      text: "None of that is a failure mode. It is the cheapest correct way to take creatine, and if it describes you, a stick pack is a worse deal.",
    },

    { type: "h2", text: "When a stick is the right answer" },
    {
      type: "ul",
      items: [
        "You travel, compete, or train at more than one place.",
        "You want electrolytes on the same schedule and would rather not manage two products.",
        "You have bought creatine before and stopped taking it. This is the common one, and worth being blunt about: creatine only works if it is in you, and saturation decays when you stop.",
      ],
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
      // Was "fifteens, twenties, thirties and forties". No 40-count appears to
      // exist, and the two most common small sizes — 12 and 14 — were missing.
      // An invented enumeration in the sentence telling people how to compare
      // prices is a bad place to be approximately right.
      type: "qa",
      q: "Sticks per box, and the resulting cost per day.",
      a: "Boxes run anywhere from twelve sticks to sixty, which makes headline prices hard to compare on purpose.",
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
      // Was: "Whether it is a subscription trap." / "Cancellation should take
      // one click." Two problems, both ours. Kimora's own cancellation is an
      // email round-trip plus a magic link plus the Stripe portal — four steps,
      // not one — so the page was publishing a standard it fails, in a section
      // headed "ours included." And "subscription trap" is a pejorative sitting
      // two sections below a list of eleven named competitors, with nothing in
      // the text scoping it away from them.
      type: "qa",
      q: "How cancelling actually works.",
      a: "Check it before you subscribe, not after. Ours takes a few steps — you request a link by email and cancel through the billing portal — and we would rather you know that now than discover it in month three.",
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
      text: "And we are not going to pin a price or a dose to a named competitor. Those change, and a stale number presented as fact would undercut the only thing this page is trying to be useful for. The ranges above are dated and are the honest version; for any specific product, go read its panel.",
    },
    {
      // The article quotes Kimora's retail price. Without this it reads, in the
      // crawler-visible HTML and inside an Article entity naming Kimora as
      // publisher, as though the product is on sale today — contradicting the
      // PreOrder availability in the Product schema. Prose is what gets lifted,
      // so prose has to carry the qualifier.
      type: "p",
      text: "One more: Kimora has not launched. Nothing on this site is purchasable today, consumer launch is targeted for December 2026, and the prices above are the announced ones rather than something you can go and pay right now.",
    },
    {
      type: "p",
      text: `What we will say: 5 g creatine monohydrate per stick. ${STICKS_PER_POUCH} sticks to a pouch, which is a month. Naturally sweetened with stevia and monk fruit. No sugar, no artificial colors, no proprietary blends.`,
    },

    {
      // The two papers support the micronized/uptake and saturation material.
      // Nothing in a journal supports the brand list, the tub price range or
      // the box counts — those are market claims, and saying how they were
      // checked is the citation. A bibliography that does not match the
      // article's actual load-bearing claims is decoration.
      type: "p",
      text: "How we checked the market claims: brand list, formats and panel doses read off manufacturer and major-retailer listings in August 2026. Tub cost per serving compared across uncertified bulk powder and third-party-tested brands over the same period. Prices and formulations move; the dates are there so you can tell how stale this is.",
    },
    {
      type: "sources",
      items: [
        {
          label:
            "Kreider et al., International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. JISSN 14:18 (2017) — on creatine forms and muscle uptake",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5469049/",
        },
        {
          label:
            "Wax et al., Creatine for Exercise and Sports Performance, with Recovery Considerations for Healthy Populations. Nutrients 13:1915 (2021) — on dosing and saturation",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8228369/",
        },
      ],
    },
  ],
};

const TRAINING_IN_ARIZONA: Article = {
  slug: "training-in-arizona",
  // 55 characters. The first version was "Training in Arizona: Heat, Altitude,
  // Hydration" — which optimised for a query nobody typed. targetQuery is
  // "BJJ supplement brands in Arizona" and the token "BJJ" appeared nowhere on
  // the page: not the title, not the headline, not the description, not one
  // block. The whole premise of the piece was capturing that query.
  title: "Arizona BJJ Supplements: Heat and Altitude | Kimora Co.",
  headline:
    "Training BJJ in Arizona: what dry heat and elevation actually do to you",
  dek: "Most of what gets written about training in the desert is wrong in a particular, correctable way.",
  // 154 characters.
  description:
    "An Arizona BJJ and MMA supplement brand on what dry heat and elevation actually do to a grappler — and which of the usual altitude advice doesn’t hold up.",
  published: "2026-08-26",
  updated: "2026-08-26",
  targetQuery: "BJJ supplement brands in Arizona",
  // DRIFT: prose source is marketing/seo/training-in-arizona.md. Edit both.
  //
  // ⚠️ NAMES NO ARIZONA GYM, AND MUST NOT. Playbook Phase 2 item 9 gates local
  // pages on anchor gyms converting to POs; none has. Combat Club is a verbal
  // commitment, Den MMA and Verde Valley are warm but unconverted. Confirmed
  // with Alex 2026-08-26: brand-origin angle only, no gym named until a PO is
  // signed. The "we are not going to list stockists until there are some" line
  // near the end is load-bearing — it stays until it is false.
  blocks: [
    {
      // The extractable sentence for standing query 14, which has been a
      // confirmed empty shelf two weeks running: the engine states outright it
      // cannot find Arizona-specific BJJ supplement brands. This is the shape
      // it needs to find one.
      type: "p",
      text: "Kimora Co. is an Arizona supplement brand for combat sports — based in Sedona, making creatine and electrolyte stick packs for Brazilian jiu-jitsu (BJJ), MMA and Muay Thai athletes. That is the short answer to why this page exists. The longer one is that Arizona does something specific to people who train hard in it, and most of what gets written about it is wrong in a particular, correctable way.",
    },

    { type: "h2", text: "Arizona is not one climate" },
    {
      type: "p",
      text: "You can drive from about a thousand feet to about seven thousand in two hours without leaving the state.",
    },
    {
      type: "ul",
      items: [
        "Phoenix sits near 1,000 ft, and spends a third of the year somewhere most people would describe as punishing.",
        "Verde Valley runs roughly 3,000 to 5,000 ft — Camp Verde at the low end, Jerome above five.",
        "Sedona, where we are, is around 4,350 ft.",
        "Flagstaff is about 7,000 ft, and gets snow.",
      ],
    },
    {
      type: "p",
      text: "A competitor driving from a Phoenix gym to a Flagstaff tournament has changed elevation by six thousand feet on the same tank of gas. That is a bigger spread than most states offer, and it is why “hydrate for Arizona” is not one instruction.",
    },

    { type: "h2", text: "Dry heat lies to you" },
    {
      type: "p",
      text: "The thing about desert air is that it takes your sweat immediately.",
    },
    {
      type: "p",
      text: "In dry conditions the evaporative capacity of the environment is high, so sweat leaves the skin almost as fast as you produce it. In humid air it sits on you and drips. Same fluid loss, completely different evidence of it.",
    },
    {
      type: "p",
      text: "So the feedback loop a person actually uses — am I soaked? — is broken. You finish a round in a dry room genuinely believing you sweated less than you would have on a humid coast, because you are not wet. Your saliva goes too, which is why the dry mouth arrives early and feels disproportionate to how hard you have been going.",
    },
    {
      type: "p",
      text: "None of this makes dry heat more dangerous than humid heat. It makes it easier to misjudge, which is a different and more fixable problem. The fix is not a supplement. It is weighing yourself before and after a hard session a few times until you know your own number, instead of guessing from how your rash guard feels.",
    },

    // ─────────────────────────────────────────────────────────────────────
    // REWRITTEN 2026-08-26, before publication, after review.
    //
    // The first version of this section was the article's headline claim and
    // it was wrong. It said altitude diuresis lasts "twelve to forty-eight
    // hours" — a number taken from a hydration brand's blog — and cited two
    // papers that say three to four days. It then built an H2, a meta
    // description and a two-audience split on top of it.
    //
    // Checking the sources properly broke more than the number. Both scope
    // the diuresis AND the respiratory loss to the same acute window, so the
    // asymmetry the section was built on ("the diuresis stops, the breathing
    // loss is ongoing") is not in either of them. The human data is at
    // 3,500–4,500 m; Arizona tops out at 2,105 m. And in the one condition
    // closest to a visiting competitor — ascent combined with physical
    // activity — subjects RETAINED sodium and water rather than losing it,
    // which inverts the advice the old version gave its highest-stakes reader.
    //
    // Third time the "don't repeat a number sourced only from someone else's
    // blog copy" rule has caught something on this program. The honest version
    // below is a better refusal than the one it replaces.
    // ─────────────────────────────────────────────────────────────────────
    { type: "h2", text: "What altitude actually does, and what nobody knows" },
    {
      type: "p",
      text: "Here is the part the category gets wrong, and we got it wrong too before we read our own sources properly.",
    },
    {
      type: "p",
      text: "Go up high enough and two real things happen. You breathe more, and you breathe air that is colder and drier, so you lose more water through respiration. And you urinate more — altitude diuresis, part of how the body begins acclimatising. Pooled across 57 studies, that diuresis lasts three to four days on average and then settles.",
    },
    {
      type: "p",
      text: "So far so good. The problem is where the research was done. The human work behind almost all of this sits at roughly 3,500 to 4,500 metres — eleven to fifteen thousand feet. Flagstaff, the highest town in this state most people train in, is 2,105 metres. Sedona is 1,326. Every confident sentence you have read about hydrating for altitude is extrapolating down from more than twice the elevation, onto a population that mostly lives there already.",
    },
    {
      type: "p",
      text: "There is a further wrinkle that cuts against the obvious advice. The diuresis findings come largely from people who went up and rested. In the studies where ascent was combined with physical activity, subjects retained sodium and water instead of shedding them. A competitor who flies in and immediately trains is closer to that second condition than the first.",
    },
    {
      type: "p",
      text: "Which leaves an honest position rather than a tidy one: at Arizona elevations, nobody has characterised this well, the effect is smaller than the literature's headline numbers, and it is transient rather than permanent. If you live and train here you acclimatised long ago. If you are flying in, the first few days are the window where anything is happening at all — which is unhelpfully also the window in which you are cutting weight and sleeping badly in a hotel, so pay attention to the arrival rather than only the weigh-in.",
    },
    {
      type: "p",
      text: "We would sell more product with the confident version. It is just not a thing we can show you.",
    },

    { type: "h2", text: "What this means on the mat" },
    {
      type: "p",
      text: "Rolling in a gi is close to the worst case for heat: you are wearing insulation, working at high intensity in bursts, and often in a room where the air conditioning is either aspirational or off. Add dry air and elevation and you have a session where fluid loss is high and the usual cues under-report it.",
    },
    {
      type: "p",
      text: "Practical, and none of it requires buying anything:",
    },
    {
      type: "ul",
      items: [
        "Weigh in before and after a hard class occasionally. A pound is roughly a pint. Do it three or four times and you will know your own sweat rate better than any calculator.",
        "Drink somewhat more than that over the following hours — a bit above what you lost, not exactly it, and spread out rather than sunk at once.",
        "Sodium is the electrolyte you lose most of in sweat, and individual sweat sodium varies a lot between people. Yours is not the same as your training partner’s.",
        "If you are cutting, do the arithmetic in the weeks before, not the days.",
      ],
    },

    { type: "h2", text: "The claim we’re not going to make" },
    {
      type: "p",
      text: "We sell electrolytes. So this is the sentence that costs us something: we are not going to tell you that electrolytes stop cramp.",
    },
    {
      type: "p",
      text: "Exercise-associated muscle cramps are the single most common thing electrolytes are sold for, and the balance of the current evidence does not support the electrolyte-depletion explanation. The better-supported model is altered neuromuscular control — muscle overload and fatigue producing an imbalance between excitatory input from muscle spindles and inhibitory input from Golgi tendon organs. Cramps also happen in people who are neither dehydrated nor electrolyte-depleted, which is difficult to reconcile with the salt story.",
    },
    {
      type: "p",
      text: "What the literature actually points at for cramp: stretching to treat one, and managing fatigue to reduce them. Not a sachet.",
    },
    {
      type: "p",
      text: "Electrolytes are worth replacing because you lose them in sweat and they do jobs in the body. That is a sufficient reason to make this product. “It will stop your calf seizing in the third round” is not a reason we can evidence, so we are not going to say it, and you should be suspicious of the brands that do.",
    },

    { type: "h2", text: "Why the brand is here" },
    {
      type: "p",
      text: "Because the founder trains here, which is a less impressive answer than a marketing department would like, and a more honest one.",
    },
    {
      type: "p",
      text: "The useful version: a product designed by someone who rolls in a dry room at 4,350 feet is going to take the hydration side of a creatine product more seriously than one designed by someone who doesn’t. That is not a performance claim. It is just where the attention went.",
    },
    {
      type: "p",
      text: "Kimora is pre-launch — nothing on this site is purchasable today, and consumer launch is targeted for December 2026. Wholesale is open to Arizona academies and to gyms nationwide; there is an application on the wholesale page. We are not going to list stockists until there are some.",
    },

    { type: "h2", text: "What we’re not telling you" },
    {
      // Two fixes here, both from review, and the second one matters more than
      // anything else on this page.
      //
      // 1. The refusal was shaped so that stripping the leading negation — which
      //    is exactly what verbatim extraction into an answer-engine snippet
      //    does — left "our electrolytes prevent cramping, prevent dehydration,
      //    or protect you from heat illness." The product noun and three
      //    DSHEA-critical verbs were in one clause held together by a single
      //    "not". Product moved out of the claim clause.
      //
      // 2. The original led with "stops sweating" as a heat-stroke red flag.
      //    That is the classic myth: exertional heat stroke patients are
      //    usually STILL SWEATING, and people have been downgraded to "heat
      //    exhaustion" on exactly that cue. Altered mental status is the
      //    reliable sign. Leading with the myth buried it. Cooling also has to
      //    start in parallel with the call, not after it — survival tracks
      //    time-to-cooling.
      type: "p",
      text: "Nobody should be telling you an electrolyte sachet prevents cramp, prevents dehydration, or protects you against heat illness. We aren’t going to.",
    },
    {
      type: "p",
      text: "And heat illness is a medical emergency, not a hydration-strategy conversation. If a training partner gets confused, disoriented or stops making sense, call 911 and start cooling them immediately — cold water, both at once, not one and then the other. Do not wait for them to stop sweating. People having heat stroke are usually still sweating, and waiting for that sign is how it gets missed.",
    },
    {
      type: "p",
      text: "We are not going to publish our final sodium, potassium and magnesium numbers until the production Certificate of Analysis confirms them.",
    },
    {
      type: "p",
      text: "And we are not going to name a gym as a stockist before one is. Arizona has an excellent combat sports scene and we would like to be in it; saying so is different from claiming we already are.",
    },

    {
      type: "sources",
      items: [
        {
          label:
            "Nelson & Churilla, A narrative review of exercise-associated muscle cramps: factors that contribute to neuromuscular fatigue and management implications. Muscle & Nerve (2016) — on cramp aetiology",
          url: "https://pubmed.ncbi.nlm.nih.gov/27159592/",
        },
        {
          label:
            "Fluid Metabolism at High Altitudes, in Nutritional Needs in Cold and in High-Altitude Environments (National Academies Press) — on respiratory water loss and altitude diuresis",
          url: "https://www.ncbi.nlm.nih.gov/books/NBK232881/",
        },
        {
          label:
            "Dietary Recommendations for Cyclists during Altitude Training. Nutrients (2016) — on fluid needs at elevation",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4924218/",
        },
        {
          label:
            "Elevated Humidity Impairs Evaporative Heat Loss and Self-Paced Exercise Performance in the Heat — on evaporative capacity in dry versus humid air",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11922688/",
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
  TRAINING_IN_ARIZONA,
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

import { useState } from "react";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // TODO: hook this into backend / email capture later
    console.log("Email submitted:", email);

    setSubmitted(true);
    setEmail("");
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        {/* Brand */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          KIMORA CO.
        </h1>

        {/* Tagline */}
        <p className="mt-4 text-lg text-zinc-400">
          Creatine + Electrolytes for Performance
        </p>

        {/* Divider */}
        <div className="mt-6 h-[1px] bg-zinc-800 w-full" />

        {/* Main message */}
        <div className="mt-8">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Launching Soon
          </h2>

          <p className="mt-3 text-zinc-400 text-sm md:text-base">
            We’re dialing everything in — flavor, performance, and experience.
            Be the first to know when we go live.
          </p>
        </div>

        {/* Email capture */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-12 rounded-md bg-zinc-900 border border-zinc-800 px-4 text-sm focus:outline-none focus:border-white"
          />

          <button
            type="submit"
            className="h-12 px-6 rounded-md bg-white text-black text-sm font-medium hover:opacity-90 transition"
          >
            Notify Me
          </button>
        </form>

        {/* Success message */}
        {submitted && (
          <p className="mt-4 text-green-400 text-sm">
            You’re on the list. We’ll let you know first.
          </p>
        )}

        {/* Subtle brand note */}
        <p className="mt-10 text-xs text-zinc-600">
          Built for fighters. Designed for everyday performance.
        </p>

        {/* Optional hidden access */}
        <div className="mt-6 text-xs text-zinc-700">
          <a href="/home" className="hover:text-zinc-400 transition">
            Continue to site →
          </a>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Something went wrong");
      }

      setSubmitted(true);
      setEmail("");
    } catch (err: any) {
      console.error("Waitlist submit failed:", err);
      alert(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          
          {/* LEFT SIDE */}
          <div>
            <div className="max-w-xl">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                KIMORA CO.
              </h1>

              <p className="mt-4 text-lg text-zinc-400">
                Creatine + Electrolytes for Performance
              </p>

              <div className="mt-6 h-px bg-zinc-800 w-full" />

              <div className="mt-8">
                <h2 className="text-2xl md:text-3xl font-semibold">
                  Launching Soon
                </h2>

                <p className="mt-3 text-zinc-400 text-sm md:text-base">
                  We’re dialing everything in — flavor, performance, and experience.
                  Be the first to know when we go live.
                </p>

                <p className="mt-3 text-sm text-zinc-300 font-medium">
                  Limited first drop. Early access only.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="flex-1 h-12 rounded-md bg-zinc-900 border border-zinc-800 px-4 text-sm focus:outline-none focus:border-white disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 px-6 rounded-md bg-white text-black text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Notify Me"}
                </button>
              </form>

              {submitted && (
                <p className="mt-4 text-green-400 text-sm">
                  You’re on the list. We’ll let you know first.
                </p>
              )}

              <p className="mt-10 text-xs text-zinc-600">
                Built for fighters. Designed for everyday performance.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE (PRODUCT IMAGES) */}
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* HERO */}
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:col-span-2">
                <img
                  src="/assets/products/strawberry-guava/pouchandstick.png"
                  alt="Kimora Co Strawberry Guava"
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>

              {/* SUPPORTING */}
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <img
                  src="/assets/products/raspberry-dragonfruit/pouchandstick.png"
                  alt="Kimora Co Raspberry Dragonfruit"
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <img
                  src="/assets/products/lemon-yuzu/pouchandstick.png"
                  alt="Kimora Co Lemon Yuzu"
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
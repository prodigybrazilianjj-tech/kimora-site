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
          <div className="order-2 lg:order-1">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">KIMORA CO.</h1>

              <p className="mt-4 text-lg text-zinc-400">
                Creatine + Electrolytes for Performance
              </p>

              <div className="mt-6 h-px w-full bg-zinc-800" />

              <div className="mt-8">
                <h2 className="text-2xl font-semibold md:text-3xl">Launching Soon</h2>

                <p className="mt-3 text-sm text-zinc-400 md:text-base">
                  We’re dialing everything in — flavor, performance, and experience. Be the
                  first to know when we go live.
                </p>

                <p className="mt-3 text-sm font-medium text-zinc-300 md:text-base">
                  Early access will be limited.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="h-12 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-4 text-sm focus:border-white focus:outline-none disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 rounded-md bg-white px-6 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Notify Me"}
                </button>
              </form>

              {submitted && (
                <p className="mt-4 text-sm text-green-400">
                  You’re on the list. We’ll let you know first.
                </p>
              )}

              <p className="mt-10 text-xs text-zinc-600">
                Built for fighters. Designed for everyday performance.
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:col-span-2">
                <img
                  src="/images/kimora-pouch-hero.png"
                  alt="Kimora Co pouch"
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <img
                  src="/images/kimora-stick-1.png"
                  alt="Kimora Co stick pack"
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <img
                  src="/images/kimora-stick-2.png"
                  alt="Kimora Co product detail"
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
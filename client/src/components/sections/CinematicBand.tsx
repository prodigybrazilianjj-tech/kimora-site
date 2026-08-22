import { motion } from "framer-motion";
import { INK, INK_BODY } from "@/lib/surfaces";

/**
 * CinematicBand — full-bleed dark break in the cream page rhythm
 * (approved mockup 2026-07-05). Ships as a styled static band; the video loop
 * (6–10s muted no-gi drilling, webm ≤4MB) drops into the <video> slot when the
 * asset exists — see VIDEO_SRC below. Autoplays muted and pauses off-screen
 * via the browser's native handling of `autoPlay` + `playsInline` + poster.
 */

// TODO(asset): set to e.g. "/assets/video/mats_loop.webm" once the loop exists.
const VIDEO_SRC: string | null = null;

export function CinematicBand() {
  return (
    <section className={`relative min-h-[70vh] flex items-center justify-center text-center overflow-hidden ${INK}`}>
      {VIDEO_SRC ? (
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 50% 62%, hsl(var(--accent)/0.22), transparent 65%), radial-gradient(700px 300px at 25% 30%, hsl(var(--primary)/0.14), transparent 60%)",
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 px-4 py-24"
      >
        <h2 className="font-display font-black uppercase leading-[0.96] text-[clamp(2.5rem,6vw,5.25rem)] text-surface-ink-foreground">
          Built on
          <br />
          the <span className="text-primary">Mats.</span>
        </h2>
        <p className={`mt-6 mx-auto max-w-lg leading-relaxed ${INK_BODY}`}>
          Not made in a marketing meeting. Kimora exists because daily creatine
          should be as automatic as showing up to train.
        </p>
      </motion.div>
    </section>
  );
}

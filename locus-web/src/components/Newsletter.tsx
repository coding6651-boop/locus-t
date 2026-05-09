import { useState } from "react";
import { FadeUp } from "./Animations";
import { motion } from "framer-motion";

export function Newsletter() {
  const [email, setEmail] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <FadeUp>
          <motion.div className="glass-card overflow-hidden">
            <div className="p-6 sm:p-10 text-center">
              <div className="section-label">Stay Updated</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-tight mb-2">
                Get Locus updates
              </h2>
              <p className="text-xs sm:text-sm text-black/40 mb-6 sm:mb-8 max-w-md mx-auto">
                Release notes, new features, and tips delivered to your inbox. No spam, ever.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-black/60"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    You're in. Watch your inbox.
                  </span>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 px-4 py-2.5 rounded-full bg-white/60 border border-black/10 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/20 focus:bg-white/80 transition-all"
                  />
                  <button
                    type="submit"
                    className="ios-button px-6 py-2.5 text-sm whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </FadeUp>
      </div>
    </section>
  );
}

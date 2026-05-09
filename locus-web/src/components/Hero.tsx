import { motion } from "framer-motion";
import { useParallax } from "./ParallaxContext";
import { Link } from "react-router-dom";

const headingWords = ["Your", "AI", "Agent", "for", "the", "Terminal"] as const;

export function Hero() {
  const { heroY, heroOpacity, heroScale, terminalY, terminalOpacity, orbY1, orbY2 } = useParallax();

  return (
    <section className="pt-20 pb-16 sm:pt-24 sm:pb-20 px-4 sm:px-6 relative overflow-hidden min-h-screen flex items-center">
      <motion.div
        className="absolute top-20 right-0 w-48 sm:w-72 h-48 sm:h-72 bg-black/[0.02] rounded-full blur-3xl"
        style={{ y: orbY1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-10 w-32 sm:w-48 h-32 sm:h-48 bg-black/[0.02] rounded-full blur-3xl"
        style={{ y: orbY2 }}
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12 relative w-full"
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
      >
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 glass-card px-3 py-1.5 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="w-1.5 h-1.5 bg-black rounded-full" />
            <motion.span
              className="text-xs sm:text-sm text-black/60 font-medium"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Offline-First Coding Agent
            </motion.span>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] sm:leading-[1.1] tracking-[-0.03em] text-black">
            {headingWords.map((word, i) => {
              const isLight = i >= 3;
              return (
                <motion.span
                  key={i}
                  className="inline-block mr-1.5"
                  style={{ color: isLight ? "rgba(0,0,0,0.3)" : undefined }}
                  initial={{ opacity: 0, y: 20, rotateX: -40 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2 + i * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {word}
                </motion.span>
              );
            })}
          </h1>

          <motion.p
            className="mt-4 sm:mt-5 text-base sm:text-lg text-black/40 max-w-lg mx-auto lg:mx-0 leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            Locus is a terminal agent that keeps your workflow local. Fully offline support, private by default, and built for developers who care about speed, control, and data privacy.
          </motion.p>
          <motion.div
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <a href="#terminal" className="ios-button px-5 sm:px-6 py-2.5 sm:py-3 text-sm">
              See it in action
            </a>
            <Link to="/login" className="ios-button-outline px-5 sm:px-6 py-2.5 sm:py-3 text-sm">
              Get a License
            </Link>
          </motion.div>
          <motion.p
            className="mt-4 sm:mt-5 text-xs text-black/25 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            npm install -g @locus/cli
          </motion.p>
        </motion.div>

        <motion.div
          className="flex-1 flex justify-center lg:justify-end w-full"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ y: terminalY, opacity: terminalOpacity }}
        >
          <div className="glass-dark rounded-2xl overflow-hidden w-full max-w-sm sm:max-w-md lg:max-w-lg shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border-b border-white/10">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/20" />
              <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs text-white/30 font-mono">locus</span>
            </div>
            <div className="p-3 sm:p-5 font-mono text-[10px] sm:text-xs min-h-[160px] sm:min-h-[180px]">
              <p className="text-white mb-1">
                <span className="text-white/40">$</span> locus ask "explain this codebase"
              </p>
              <p className="text-white/40 mb-1">Analyzing repository structure...</p>
              <p className="text-white/40 mb-1">Found 47 TypeScript files across 12 modules.</p>
              <p className="text-white/40">
                <span className="text-white/30">$</span> <span className="animate-pulse">_</span>
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

import { motion } from "framer-motion";

const groups = [
  "Solo developers",
  "Startup teams",
  "Privacy advocates",
  "Enterprise engineers",
  "Students",
  "Freelancers",
] as const;

export function TrustLogos() {
  const items = [...groups, ...groups];
  return (
    <section className="py-10 sm:py-14 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-center text-[10px] sm:text-xs text-black/25 tracking-[0.15em] uppercase mb-5 sm:mb-6">
            Trusted by developers worldwide
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />

          <div className="flex">
            <motion.div
              className="flex gap-6 sm:gap-10 lg:gap-14"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                repeat: Infinity,
                ease: "linear",
                duration: 20,
              }}
            >
              {items.map((group, i) => (
                <div
                  key={`${group}-${i}`}
                  className="flex items-center gap-2 shrink-0 text-black/50"
                >
                  <svg className="w-3.5 h-3.5 shrink-0 text-black/30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap">
                    {group}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

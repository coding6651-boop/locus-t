import { FadeUp, staggerFast } from "./Animations";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useSectionParallax } from "./ParallaxContext";

interface Mode {
  icon: ReactNode;
  label: string;
  description: string;
  tags: string[];
}

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

const modes: Mode[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    label: "Plan Mode",
    description: "Think before you build. Analyze codebases, research solutions, and architect changes without modifying any files. Perfect for exploring ideas and understanding complex systems.",
    tags: ["Read-only", "Research", "Architecture"],
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.38-3.06a1.5 1.5 0 010-2.6l5.38-3.06a1.5 1.5 0 011.56 0l5.38 3.06a1.5 1.5 0 010 2.6l-5.38 3.06a1.5 1.5 0 01-1.56 0zM6.75 7.125h10.5m-10.5 4.5h10.5m-10.5 4.5h10.5M3 3h18v18H3V3z" />
      </svg>
    ),
    label: "Build Mode",
    description: "Ship fast. Write code, run commands, and execute changes directly in your workspace. Locus handles the heavy lifting while you review and approve each step.",
    tags: ["Write", "Execute", "Ship"],
  },
];

const features: Feature[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Offline-First by Design",
    description: "Built to run even when internet access is unavailable. Core startup and model loading support local fallbacks so the CLI boots reliably offline.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Terminal-Native Speed",
    description: "Optimized for low-friction usage in CLI/TUI workflows. Command-based operations, streamlined local tooling, and zero IDE overhead.",
  },
];

export function Features() {
  const { ref, headerY, headerOpacity } = useSectionParallax();

  return (
    <section id="features" ref={ref} className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div style={{ y: headerY, opacity: headerOpacity }}>
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-label">Features</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
              Two modes, built for how you work
            </h2>
            <p className="mt-2 sm:mt-3 text-black/40 max-w-lg text-xs sm:text-sm leading-relaxed mx-auto">
              Plan to think. Build to ship. Switch instantly between modes without losing context.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"
          variants={staggerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {modes.map((mode) => (
            <FadeUp key={mode.label}>
              <div className="bg-black text-white rounded-2xl p-5 sm:p-6 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 rounded-xl flex items-center justify-center text-white mb-3 sm:mb-4">
                    {mode.icon}
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{mode.label}</h3>
                  <p className="text-white/50 text-xs leading-relaxed mb-3">
                    {mode.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mode.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </motion.div>

        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="h-px flex-1 bg-black/6" />
          <span className="text-xs font-medium text-black/25 uppercase tracking-wider">And more</span>
          <div className="h-px flex-1 bg-black/6" />
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          variants={staggerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {features.map((feature) => (
            <FadeUp key={feature.title}>
              <div className="glass-card glass-card-hover p-4 sm:p-6 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black/5 rounded-xl flex items-center justify-center text-black mb-3 sm:mb-4 group-hover:bg-black/10 transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold mb-1 sm:mb-1.5 text-black">{feature.title}</h3>
                <p className="text-black/40 text-xs leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

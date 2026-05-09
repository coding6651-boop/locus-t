import { FadeUp, staggerFast } from "./Animations";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface UseCase {
  icon: ReactNode;
  title: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    title: "Offline & Air-Gapped",
    description: "Locus runs without internet access. Local model loading, offline workspace initialization, and zero external dependencies when you need it most.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Privacy-First Teams",
    description: "Your code never leaves your machine. No telemetry, no cloud sync, no data collection. Built for developers and organizations that take privacy seriously.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
    title: "Low-Spec Hardware",
    description: "Optimized for laptops with as little as 2GB RAM and zero GPU. That old laptop collecting dust? It's all you need. No expensive rigs required.",
  },
  {
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "Terminal-Native Devs",
    description: "If you live in the CLI, Locus is for you. No IDE plugins, no browser tabs. Just your terminal, your workflow, and an agent that keeps up.",
  },
];

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <FadeUp>
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-label">Who It's For</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
              Built for teams that need control
            </h2>
            <p className="mt-2 sm:mt-3 text-black/40 max-w-lg text-xs sm:text-sm leading-relaxed mx-auto">
              Whether you're in a secure data center or just prefer the terminal, Locus adapts to your workflow.
            </p>
          </div>
        </FadeUp>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          variants={staggerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {useCases.map((useCase) => (
            <FadeUp key={useCase.title}>
              <div className="glass-card glass-card-hover p-4 sm:p-6 group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/5 rounded-xl flex items-center justify-center text-black mb-3 sm:mb-4 group-hover:bg-black/10 transition-colors duration-300 group-hover:scale-105 transform">
                  {useCase.icon}
                </div>
                <h3 className="text-sm font-semibold mb-1 sm:mb-1.5 text-black">{useCase.title}</h3>
                <p className="text-black/40 text-xs leading-relaxed">
                  {useCase.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

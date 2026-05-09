import { useRef } from "react";
import { SlideLeft, SlideRight, staggerContainer, staggerFast } from "./Animations";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ReactNode } from "react";

interface Capability {
  icon: ReactNode;
  label: string;
}

interface CodeExample {
  label: string;
  cmd: string;
  output: string;
}

const capabilities: Capability[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: "Read & understand codebases",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    label: "Apply code changes safely",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "Run checks & tests",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.384 3.146A.75.75 0 015 17.748V6.252a.75.75 0 011.036-.568l5.384 3.146a.75.75 0 010 1.28zM19.42 15.17l-5.384 3.146a.75.75 0 01-1.036-.568V6.252a.75.75 0 011.036-.568l5.384 3.146a.75.75 0 010 1.28z" />
      </svg>
    ),
    label: "Debug, refactor & deliver",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
    label: "Work in zero-internet environments",
  },
];

const codeExamples: CodeExample[] = [
  { label: "# Quick start", cmd: "$ locus init", output: "Workspace ready. Run `locus ask` to begin." },
  { label: "# Offline mode", cmd: "$ locus init --offline", output: "Local model loaded. No network required." },
  { label: "# Ask Locus to work", cmd: "$ locus ask \"Add rate limiting\"", output: "Analyzing... Applying changes... Done." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function WhatIsLocus() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const textY = useTransform(smoothProgress, [0, 1], [40, -40]);
  const codeY = useTransform(smoothProgress, [0, 1], [60, -60]);
  const textRotate = useTransform(smoothProgress, [0, 1], [0, -2]);
  const codeRotate = useTransform(smoothProgress, [0, 1], [0, 2]);

  return (
    <section id="what-is-locus" ref={ref} className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <SlideRight>
            <motion.div style={{ y: textY, rotateX: textRotate }}>
              <div className="section-label">What is Locus</div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight mb-3 sm:mb-4">
                A developer agent that stays in your terminal
              </h2>
              <p className="text-black/40 leading-relaxed mb-6 sm:mb-8 text-sm">
                Locus is a developer agent you run from your terminal to read and understand codebases, apply code changes safely, run checks and tests, and help with debugging, refactors, and delivery workflows — even in restricted or zero-internet environments.
              </p>
              <motion.div
                className="space-y-2.5 sm:space-y-3"
                variants={staggerFast}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {capabilities.map((cap) => (
                  <motion.div
                    key={cap.label}
                    className="flex items-center gap-3"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 },
                    }}
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black/5 rounded-lg flex items-center justify-center text-black/60 flex-shrink-0">
                      {cap.icon}
                    </div>
                    <span className="text-xs sm:text-sm text-black/60">{cap.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </SlideRight>

          <SlideLeft>
            <motion.div style={{ y: codeY, rotateX: codeRotate }}>
              <div className="glass-card p-4 sm:p-6">
                <motion.div
                  className="font-mono text-[10px] sm:text-xs space-y-3 sm:space-y-4"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {codeExamples.map((ex, i) => (
                    <motion.div key={i} variants={fadeUp}>
                      <p className="text-black/20 mb-1.5 sm:mb-2">{ex.label}</p>
                      <div className="glass-dark rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white overflow-x-auto">
                        <p className="text-white whitespace-nowrap">{ex.cmd}</p>
                        <p className="text-white/40 mt-1 text-[9px] sm:text-[11px]">{ex.output}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </SlideLeft>
        </div>
      </div>
    </section>
  );
}

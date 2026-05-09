import { useRef } from "react";
import { SlideLeft, SlideRight } from "./Animations";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const reasons = [
  {
    number: "01",
    title: "Program Anywhere",
    description:
      "Deep in the Amazon forest. Middle of the ocean. On a 12-hour flight. No internet? No problem. Locus runs 100% offline — your terminal, your AI, wherever you are.",
    code: "$ locus init --offline\nLoading local models...\nWorkspace ready. No network required.",
  },
  {
    number: "02",
    title: "Tiny Hardware",
    description:
      "Runs on machines with just 2GB RAM and zero GPU. Old laptop gathering dust? That's all you need. No cloud servers, no expensive rigs — your existing hardware is enough.",
    code: "$ locus status\nRAM: 1.8GB used\nModel: qwen-coder-3b (quantized)\nGPU: none (CPU mode)\nReady. No cloud required.",
  },
  {
    number: "03",
    title: "Save Your Bandwidth",
    description:
      "No cloud API calls, no model downloads at runtime, no data uploading. Every megabyte of bandwidth stays yours — for streaming, calls, updates, and games.",
    code: "$ locus config network --mode offline\nNetwork: disconnected\nAll outbound blocked.\nYour bandwidth: 100% yours.",
  },
  {
    number: "04",
    title: "Privacy by Design",
    description:
      "No telemetry, no cloud sync, no data collection. What happens on your terminal stays on your terminal. Built for developers who take privacy seriously.",
    code: "$ locus ask \"Refactor auth module\"\nScanning src/auth/ (842 lines)...\nProcessing locally...\nDone. 0 bytes transmitted.",
  },
];

export function WhyLocus() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const headerY = useTransform(smooth, [0, 0.25], [30, -15]);
  const headerOpacity = useTransform(smooth, [0, 0.15], [0.5, 1]);

  return (
    <section id="why-locus" ref={ref} className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div style={{ y: headerY, opacity: headerOpacity }}>
          <div className="text-center mb-10 sm:mb-16">
            <div className="section-label">Why Locus</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
              Why developers choose Locus
            </h2>
            <p className="mt-2 sm:mt-3 text-black/40 max-w-lg text-xs sm:text-sm leading-relaxed mx-auto">
              Four pillars that make Locus different from every other AI coding tool.
            </p>
          </div>
        </motion.div>

        <div className="space-y-3 sm:space-y-4">
          {reasons.map((reason, index) => {
            const isEven = index % 2 === 0;
            return (
              <div key={reason.number}>
                {isEven ? (
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6 glass-card overflow-hidden">
                    <SlideRight delay={index * 0.1}>
                      <div className="p-4 sm:p-6">
                        <div className="text-black/10 font-mono text-2xl sm:text-3xl font-bold mb-1.5 sm:mb-2 tracking-widest">
                          {reason.number}
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 text-black">{reason.title}</h3>
                        <p className="text-black/40 text-xs sm:text-sm leading-relaxed">
                          {reason.description}
                        </p>
                      </div>
                    </SlideRight>
                    <SlideLeft delay={index * 0.1}>
                      <div className="flex items-center px-4 sm:px-6 pb-4 sm:pb-6 md:px-6 md:pb-6">
                        <div className="glass-dark rounded-xl px-3 sm:px-5 py-2.5 sm:py-4 font-mono text-[10px] sm:text-xs text-white w-full">
                          {reason.code.split("\n").map((line, i) => (
                            <p key={i} className={i === 0 ? "text-white" : "text-white/40"}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    </SlideLeft>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6 glass-card overflow-hidden">
                    <SlideRight delay={index * 0.1}>
                      <div className="flex items-center px-4 sm:px-6 pb-4 sm:pb-6 md:px-6 md:pb-6 md:order-2">
                        <div className="glass-dark rounded-xl px-3 sm:px-5 py-2.5 sm:py-4 font-mono text-[10px] sm:text-xs text-white w-full">
                          {reason.code.split("\n").map((line, i) => (
                            <p key={i} className={i === 0 ? "text-white" : "text-white/40"}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    </SlideRight>
                    <SlideLeft delay={index * 0.1}>
                      <div className="p-4 sm:p-6 md:order-1">
                        <div className="text-black/10 font-mono text-2xl sm:text-3xl font-bold mb-1.5 sm:mb-2 tracking-widest">
                          {reason.number}
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 text-black">{reason.title}</h3>
                        <p className="text-black/40 text-xs sm:text-sm leading-relaxed">
                          {reason.description}
                        </p>
                      </div>
                    </SlideLeft>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { FadeUp, staggerFast } from "./Animations";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Install & Launch",
    description:
      "Install Locus via npm, point it at your local LLM, and start the terminal. No sign-up, no account, no cloud setup.",
  },
  {
    number: "02",
    title: "Activate Your License",
    description:
      "One-time license activation unlocks the full agentic capabilities. Use your token and you're set — permanently, on your machine.",
  },
  {
    number: "03",
    title: "Code with AI",
    description:
      "Chat with the AI, refactor code, run bash commands, search files, and manage your entire workflow — all from the terminal, all offline.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <FadeUp>
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-label">How It Works</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
              Get Started in Minutes
            </h2>
            <p className="mt-2 sm:mt-3 text-black/40 max-w-lg text-xs sm:text-sm leading-relaxed mx-auto">
              From install to AI-powered coding — three simple steps.
            </p>
          </div>
        </FadeUp>

        <motion.div
          className="space-y-3 sm:space-y-4"
          variants={staggerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {steps.map((step) => (
            <FadeUp key={step.number}>
              <div className="glass-card glass-card-hover flex items-start gap-4 sm:gap-6 p-5 sm:p-6 group">
                <span className="text-2xl sm:text-4xl font-bold text-gray-200 group-hover:text-gray-300 transition-colors duration-500 leading-none mt-0.5 flex-shrink-0">
                  {step.number}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-lg font-semibold text-black mb-1 sm:mb-1.5">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-black/40 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

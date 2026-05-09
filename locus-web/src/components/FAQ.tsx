import { useState, useRef, useEffect } from "react";
import { FadeUp } from "./Animations";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItemType {
  question: string;
  answer: string;
}

const faqs: FAQItemType[] = [
  {
    question: "Does Locus work without internet access?",
    answer: "Yes. Locus is designed to be offline-first. It supports local model loading via Ollama, LM Studio, or any compatible local inference server. Core CLI functionality works entirely offline with no internet connection required.",
  },
  {
    question: "What models does Locus support?",
    answer: "Locus supports any OpenAI-compatible API endpoint, Ollama models, LM Studio, and custom inference servers. This includes GPT, Claude, Qwen, DeepSeek, Llama, and 50+ more through flexible provider configuration.",
  },
  {
    question: "Is my code sent to external servers?",
    answer: "No. Locus runs entirely on your machine. Your code, your conversations, and your data never leave your computer. When you configure an external model endpoint, you control exactly which provider receives requests.",
  },
  {
    question: "What hardware do I need?",
    answer: "Locus runs on machines with as little as 2GB RAM and zero GPU. It's optimized for laptops and low-spec hardware with support for quantized models. No cloud servers or expensive rigs required.",
  },
  {
    question: "How does Locus differ from other AI coding tools?",
    answer: "Locus is terminal-native, 100% offline, and privacy-first by design. Unlike IDE plugins or cloud-dependent tools, Locus runs in your terminal with no vendor lock-in, supports local models, and works entirely without internet.",
  },
  {
    question: "How do I activate my license?",
    answer: "After installing Locus, run `locus activate <your-token>` in your terminal. The activation is one-time and permanent on your machine. No recurring subscriptions or cloud dependencies.",
  },
];

function FAQItem({ faq, isOpen, onToggle }: { faq: FAQItemType; isOpen: boolean; onToggle: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [isOpen]);

  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 sm:py-5 text-left group"
      >
        <span className="text-sm sm:text-base font-medium text-black pr-4 group-hover:text-black/70 transition-colors">
          {faq.question}
        </span>
        <motion.div
          className="w-6 h-6 sm:w-7 sm:h-7 bg-black/5 rounded-full flex items-center justify-center shrink-0 group-hover:bg-black/10 transition-colors"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div ref={contentRef} className="pb-4 sm:pb-5">
              <p className="text-xs sm:text-sm text-black/40 leading-relaxed pr-10">
                {faq.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <FadeUp>
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-label">FAQ</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
              Common questions
            </h2>
            <p className="mt-2 sm:mt-3 text-black/40 max-w-lg text-xs sm:text-sm leading-relaxed mx-auto">
              Everything you need to know about Locus.
            </p>
          </div>
        </FadeUp>

        <FadeUp>
          <div className="glass-card overflow-hidden">
            <div className="px-5 sm:px-8">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  faq={faq}
                  isOpen={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
                />
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

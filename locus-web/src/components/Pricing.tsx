import { useRef, useState } from "react";
import { FadeUp, staggerFast } from "./Animations";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";

interface Currency {
  symbol: string;
  code: string;
}

interface Plan {
  name: string;
  priceUSD: number | string;
  priceRWF: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  period?: string;
}

interface PriceDisplayProps {
  value: string | number;
  highlighted?: boolean;
}

const currencies: { USD: Currency; RWF: Currency } = {
  USD: { symbol: "$", code: "USD" },
  RWF: { symbol: "RF", code: "RWF" },
};

const plans: Plan[] = [
  {
    name: "Starter",
    priceUSD: 7,
    priceRWF: "10,000",
    description: "For individual developers",
    features: [
      "Offline-first local models",
      "Community support",
      "Basic terminal workflow",
      "Local sandbox execution",
      "Core agent capabilities",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    priceUSD: 19,
    priceRWF: "25,000",
    period: "/mo",
    description: "For professionals and small teams",
    features: [
      "Everything in Starter",
      "Private model endpoints",
      "Priority support",
      "Advanced agent workflows",
      "Multi-session management",
      "Custom provider configuration",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    priceUSD: "Custom",
    priceRWF: "Custom",
    description: "For organizations at scale",
    features: [
      "Everything in Pro",
      "Air-gapped deployment",
      "SSO & SAML integration",
      "Audit logging",
      "Custom model training",
      "Dedicated infrastructure",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

function PriceDisplay({ value }: PriceDisplayProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={`${value}`}
        className="text-2xl sm:text-3xl font-bold tabular-nums"
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {value === "Custom" ? "Custom" : value}
      </motion.span>
    </AnimatePresence>
  );
}

export function Pricing() {
  const ref = useRef(null);
  const [currency, setCurrency] = useState<"USD" | "RWF">("USD");
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const headerY = useTransform(smooth, [0, 0.25], [30, -15]);
  const headerOpacity = useTransform(smooth, [0, 0.12], [0.5, 1]);

  const symbol = currencies[currency].symbol;
  const priceKey = currency === "RWF" ? "priceRWF" : "priceUSD";

  return (
    <section id="pricing" ref={ref} className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div style={{ y: headerY, opacity: headerOpacity }}>
          <div className="text-center mb-8 sm:mb-10">
            <div className="section-label">Pricing</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-black tracking-[-0.03em]">
              Plans that scale with you
            </h2>
            <p className="mt-2 sm:mt-3 text-black/40 max-w-lg text-xs sm:text-sm leading-relaxed mx-auto">
              Start with Starter. Upgrade when your team needs private endpoints and enterprise controls.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex justify-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="inline-flex items-center bg-black/5 backdrop-blur-md rounded-full p-1 border border-black/8">
            {["USD", "RWF"].map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr as "USD" | "RWF")}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
                  currency === curr
                    ? "bg-black text-white shadow-sm"
                    : "text-black/40 hover:text-black/60"
                }`}
              >
                {curr === "USD" ? "USD" : "RWF"}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
          variants={staggerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {plans.map((plan) => (
            <FadeUp key={plan.name}>
              <div
                className={`rounded-2xl p-5 sm:p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? "bg-black text-white shadow-[0_16px_48px_rgba(0,0,0,0.12)] sm:scale-[1.02]"
                    : "glass-card glass-card-hover"
                }`}
              >
                {plan.highlighted && (
                  <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-2">
                    Most Popular
                  </span>
                )}
                <h3 className={`text-sm font-semibold ${plan.highlighted ? "text-white" : "text-black"}`}>
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-0.5">
                  {plan[priceKey] !== "Custom" && (
                    <span className={`text-lg sm:text-xl font-semibold ${plan.highlighted ? "text-white/60" : "text-black/40"}`}>
                      {symbol}
                    </span>
                  )}
                  <PriceDisplay value={plan[priceKey]} highlighted={plan.highlighted} />
                  {plan.period && (
                    <span className={`text-xs ${plan.highlighted ? "text-white/40" : "text-black/30"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`mt-1.5 text-xs ${plan.highlighted ? "text-white/40" : "text-black/30"}`}>
                  {plan.description}
                </p>
                <ul className="mt-4 sm:mt-5 space-y-2 sm:space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs">
                      <svg
                        className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${plan.highlighted ? "text-white/60" : "text-black/40"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.highlighted ? "text-white/70" : "text-black/50"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.highlighted ? "/login" : "#"}
                  className={`mt-5 sm:mt-6 block text-center py-2.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                    plan.highlighted
                      ? "bg-white text-black hover:bg-white/90"
                      : "ios-button-outline"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            </FadeUp>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

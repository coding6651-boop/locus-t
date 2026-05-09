import { useRef, useState, useEffect } from "react";
import { FadeUp, staggerFast } from "./Animations";
import { motion } from "framer-motion";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}

interface CountUpProps {
  target: number;
  suffix?: string;
  decimals?: number;
}

const stats: Stat[] = [
  { value: 10, suffix: "K+", label: "Active users" },
  { value: 99.9, suffix: "%", label: "Uptime", decimals: 1 },
  { value: 50, suffix: "+", label: "Supported models" },
];

function CountUp({ target, suffix = "", decimals = 0 }: CountUpProps) {
  const [count, setCount] = useState<number>(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState<boolean>(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target, decimals]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="glass-card overflow-hidden"
          variants={staggerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <div className="p-6 sm:p-10">
            <FadeUp>
              <div className="text-center mb-8 sm:mb-10">
                <div className="section-label">By the Numbers</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
                  Trusted by developers worldwide
                </h2>
              </div>
            </FadeUp>
            <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10">
              {stats.map((stat, i) => (
                <FadeUp key={stat.label} delay={i * 0.1}>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
                      <CountUp target={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                    </div>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-black/40">
                      {stat.label}
                    </p>
                  </div>
                </FadeUp>
              ))}
            </div>
            <FadeUp>
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 bg-black/5 rounded-full px-4 py-2">
                  <span className="text-black font-mono font-bold text-sm">{">"}</span>
                  <span className="text-xs font-medium text-black/60">Built by Locus itself</span>
                </div>
              </div>
            </FadeUp>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

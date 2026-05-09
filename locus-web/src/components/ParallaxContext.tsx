import { createContext, useContext, useRef, ReactNode } from "react";
import { useScroll, useSpring, useTransform, MotionValue } from "framer-motion";

interface ParallaxContextValue {
  scrollYProgress: MotionValue<number>;
  smoothY: MotionValue<number>;
  y1: MotionValue<number>;
  y2: MotionValue<number>;
  y3: MotionValue<number>;
  scale1: MotionValue<number>;
  scale2: MotionValue<number>;
  opacity1: MotionValue<number>;
  opacity2: MotionValue<number>;
  opacity3: MotionValue<number>;
  heroY: MotionValue<number>;
  heroOpacity: MotionValue<number>;
  heroScale: MotionValue<number>;
  terminalY: MotionValue<number>;
  terminalOpacity: MotionValue<number>;
  orbY1: MotionValue<number>;
  orbY2: MotionValue<number>;
}

const ParallaxContext = createContext<ParallaxContextValue | null>(null);

export function useParallax(): ParallaxContextValue {
  const ctx = useContext(ParallaxContext);
  if (!ctx) throw new Error("useParallax must be used within ParallaxProvider");
  return ctx;
}

interface ParallaxProviderProps {
  children: ReactNode;
}

export function ParallaxProvider({ children }: ParallaxProviderProps) {
  const { scrollY, scrollYProgress } = useScroll();

  const smoothY = useSpring(scrollY, { stiffness: 80, damping: 25, restDelta: 0.001 });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const y1 = useTransform(smoothY, [0, 2000], [0, -120]);
  const y2 = useTransform(smoothY, [0, 2000], [0, -80]);
  const y3 = useTransform(smoothY, [0, 2000], [0, -50]);
  const scale1 = useTransform(smoothY, [0, 1500], [1, 0.8]);
  const scale2 = useTransform(smoothY, [0, 1500], [1, 1.1]);
  const opacity1 = useTransform(smoothY, [0, 800, 2000], [1, 0.5, 0]);
  const opacity2 = useTransform(smoothY, [500, 1500, 2500], [0, 0.6, 0]);
  const opacity3 = useTransform(smoothY, [1000, 2000, 3000], [0, 0.5, 0.8]);

  const heroY = useTransform(smoothY, [0, 400], [0, -80]);
  const heroOpacity = useTransform(smoothY, [0, 200], [1, 0]);
  const heroScale = useTransform(smoothY, [0, 400], [1, 0.97]);
  const terminalY = useTransform(smoothY, [0, 400], [0, -120]);
  const terminalOpacity = useTransform(smoothY, [0, 250], [1, 0.3]);
  const orbY1 = useTransform(smoothY, [0, 400], [0, -60]);
  const orbY2 = useTransform(smoothY, [0, 400], [0, -40]);

  const value: ParallaxContextValue = {
    scrollYProgress: smoothProgress,
    smoothY,
    y1, y2, y3, scale1, scale2, opacity1, opacity2, opacity3,
    heroY, heroOpacity, heroScale, terminalY, terminalOpacity, orbY1, orbY2,
  };

  return (
    <ParallaxContext.Provider value={value}>
      {children}
    </ParallaxContext.Provider>
  );
}

export function useSectionParallax() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const headerY = useTransform(smooth, [0, 0.3], [30, -20]);
  const headerOpacity = useTransform(smooth, [0, 0.2], [0.5, 1]);
  return { ref, smooth, headerY, headerOpacity };
}

import { motion } from "framer-motion";
import { useParallax } from "./ParallaxContext";

export function ScrollProgress() {
  const { scrollYProgress } = useParallax();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-black origin-left z-[60]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

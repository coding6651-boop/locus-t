import { useEffect, useState } from "react";

export function CursorLight() {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let rafId: number;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 -z-5 pointer-events-none"
      style={{
        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(0,0,0,0.015), transparent 40%)`,
      }}
    />
  );
}

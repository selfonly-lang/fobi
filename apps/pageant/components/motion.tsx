"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reduced ? 0 : 0.55, delay }}
    >
      {children}
    </motion.div>
  );
}

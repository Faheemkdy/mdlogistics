import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  delay?: number;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick, hoverEffect = false, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }} // Smooth spring-like easing
      whileHover={hoverEffect ? { 
        y: -6, 
        scale: 1.01,
        boxShadow: "15px 15px 30px rgba(163,177,198,0.7), -15px -15px 30px rgba(255,255,255,0.8)"
      } : {}}
      onClick={onClick}
      className={clsx(
        // Enhanced 3D Neumorphic Style: Convex gradient + white highlight border
        "bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-2xl p-6 border border-white/50",
        "shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.7)]",
        hoverEffect && "cursor-pointer transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

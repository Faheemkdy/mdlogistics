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
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }} 
      whileHover={hoverEffect ? { 
        y: -8, 
        scale: 1.02,
        boxShadow: "0 20px 40px rgba(0,0,0,0.08)"
      } : {}}
      onClick={onClick}
      className={clsx(
        "bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 border border-white",
        "shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        hoverEffect && "cursor-pointer transition-all duration-500",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary', 
  isLoading, 
  ...props 
}) => {
  const baseStyles = "relative px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 outline-none border border-white/40 overflow-hidden";
  
  const variants = {
    // 3D Convex Gradient with deep press effect
    primary: "bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] text-slate-700 shadow-[6px_6px_12px_rgb(163,177,198,0.6),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:text-blue-600 hover:shadow-[8px_8px_16px_rgb(163,177,198,0.7),-8px_-8px_16px_rgba(255,255,255,0.9)]",
    secondary: "bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] text-slate-600 shadow-[5px_5px_10px_rgb(163,177,198,0.5),-5px_-5px_10px_rgba(255,255,255,0.7)] hover:shadow-[7px_7px_14px_rgb(163,177,198,0.6),-7px_-7px_14px_rgba(255,255,255,0.8)]",
    danger: "bg-gradient-to-br from-[#fee2e2] to-[#fca5a5] text-red-600 shadow-[5px_5px_10px_rgb(163,177,198,0.5),-5px_-5px_10px_rgba(255,255,255,0.7)] hover:shadow-[7px_7px_14px_rgb(163,177,198,0.6),-7px_-7px_14px_rgba(255,255,255,0.8)] border-white/60",
    ghost: "bg-transparent hover:bg-slate-200/50 text-slate-600 border-transparent shadow-none"
  };

  const tapEffect = variant === 'ghost' 
    ? { scale: 0.95 } 
    : { 
        scale: 0.96, 
        boxShadow: "inset 6px 6px 10px rgb(163,177,198,0.6), inset -6px -6px 10px rgba(255,255,255,0.7)" 
      };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={tapEffect}
      className={clsx(baseStyles, variants[variant], className, isLoading && "opacity-70 cursor-not-allowed")}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
      ) : children}
    </motion.button>
  );
};

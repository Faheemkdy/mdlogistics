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
  const baseStyles = "relative px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 outline-none border border-transparent overflow-hidden";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02]",
    secondary: "bg-white/80 backdrop-blur-md text-slate-700 border border-slate-200 shadow-sm hover:bg-white hover:border-slate-300",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 border-transparent shadow-none"
  };

  const tapEffect = { scale: 0.96 };

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

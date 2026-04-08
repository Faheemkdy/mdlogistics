import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-bold text-slate-600 mb-2 ml-1">{label}</label>}
      <motion.input
        whileFocus={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "w-full px-5 py-4 rounded-[1.25rem] bg-white/60 text-slate-800 placeholder-slate-400 outline-none transition-all text-base border-2 border-transparent",
          "shadow-[0_4px_12px_rgb(0,0,0,0.02)]",
          "focus:shadow-[0_8px_20px_rgb(59,130,246,0.1)] focus:border-blue-500/20 focus:bg-white",
          error && "border-red-400/50 bg-red-50/50",
          className
        )}
        {...props}
      />
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-xs text-red-500 mt-1 ml-1 font-medium"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

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
          // Deep inset shadow for 3D carved-out effect
          "w-full px-4 py-3 rounded-xl bg-[#e0e5ec] text-slate-700 placeholder-slate-400 outline-none transition-all text-base border border-transparent",
          "shadow-[inset_5px_5px_10px_rgb(163,177,198,0.6),inset_-5px_-5px_10px_rgba(255,255,255,0.7)]",
          "focus:shadow-[inset_7px_7px_14px_rgb(163,177,198,0.7),inset_-7px_-7px_14px_rgba(255,255,255,0.8)] focus:border-white/40 focus:bg-[#e6ebf0]",
          error && "border-red-400/50 shadow-[inset_5px_5px_10px_rgba(248,113,113,0.2)]",
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

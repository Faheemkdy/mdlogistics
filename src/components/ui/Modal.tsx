import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100]"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={clsx(
                "w-full max-w-md bg-[#e0e5ec] rounded-[2rem] shadow-[20px_20px_40px_rgba(163,177,198,0.5),-20px_-20px_40px_rgba(255,255,255,0.8)] border border-white/40 overflow-hidden pointer-events-auto",
                className
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                {title && <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>}
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

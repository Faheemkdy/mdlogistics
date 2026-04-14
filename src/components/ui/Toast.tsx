import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

const STYLES: Record<ToastType, { bg: string; icon: string; border: string; title: string }> = {
  success: {
    bg: 'bg-gradient-to-br from-emerald-900/95 to-emerald-800/95',
    icon: 'text-emerald-300',
    border: 'border-emerald-500/40',
    title: 'text-emerald-100',
  },
  error: {
    bg: 'bg-gradient-to-br from-red-900/95 to-red-800/95',
    icon: 'text-red-300',
    border: 'border-red-500/40',
    title: 'text-red-100',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-900/95 to-amber-800/95',
    icon: 'text-amber-300',
    border: 'border-amber-500/40',
    title: 'text-amber-100',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-900/95 to-blue-800/95',
    icon: 'text-blue-300',
    border: 'border-blue-500/40',
    title: 'text-blue-100',
  },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const s = STYLES[toast.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative flex items-start gap-3 w-72 rounded-2xl p-4 border shadow-2xl backdrop-blur-xl ${s.bg} ${s.border}`}
    >
      <div className={`flex-shrink-0 mt-0.5 ${s.icon}`}>{ICONS[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm leading-tight ${s.title}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-white/60 text-xs mt-1 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-white/40 hover:text-white/80 transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 rounded-b-2xl ${s.icon.replace('text-', 'bg-')}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
      />
    </motion.div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerMap = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timerMap.current[id]);
    delete timerMap.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-3), { id, type, title, message }]);
    timerMap.current[id] = setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const toast = {
    success: (title: string, message?: string) => addToast('success', title, message),
    error: (title: string, message?: string) => addToast('error', title, message),
    warning: (title: string, message?: string) => addToast('warning', title, message),
    info: (title: string, message?: string) => addToast('info', title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
};

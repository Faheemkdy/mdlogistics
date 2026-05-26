import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Palette, Check, Laptop } from 'lucide-react';
import { useTheme, ThemeColor, ThemeMode, DesignStyle } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

export const ThemeSwitcher = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { mode, themeColor, designStyle, setMode, setThemeColor, setDesignStyle } = useTheme();

  const colors: { id: ThemeColor; name: string; hex: string }[] = [
    { id: 'blue', name: 'Blue (Default)', hex: '#3b82f6' },
    { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
    { id: 'purple', name: 'Purple', hex: '#a855f7' },
    { id: 'rose', name: 'Rose', hex: '#f43f5e' },
    { id: 'emerald', name: 'Emerald', hex: '#10b981' },
    { id: 'teal', name: 'Teal', hex: '#14b8a6' },
    { id: 'cyan', name: 'Cyan', hex: '#06b6d4' },
    { id: 'orange', name: 'Orange', hex: '#f97316' },
    { id: 'zinc', name: 'Zinc', hex: '#71717a' },
    { id: 'slate', name: 'Slate', hex: '#64748b' },
    { id: 'red', name: 'Red', hex: '#ef4444' },
    { id: 'amber', name: 'Amber', hex: '#f59e0b' },
    { id: 'yellow', name: 'Yellow', hex: '#eab308' },
    { id: 'lime', name: 'Lime', hex: '#84cc16' },
    { id: 'green', name: 'Green', hex: '#22c55e' },
    { id: 'sky', name: 'Sky', hex: '#0ea5e9' },
    { id: 'violet', name: 'Violet', hex: '#8b5cf6' },
    { id: 'fuchsia', name: 'Fuchsia', hex: '#d946ef' },
    { id: 'pink', name: 'Pink', hex: '#ec4899' },
  ];

  const styles: { id: DesignStyle; name: string }[] = [
    { id: 'modern', name: 'Normal (Default)' }, { id: 'minimalist', name: 'Minimalist' }, { id: 'glassmorphism', name: 'Glass' },
    { id: 'material', name: 'Material' }, { id: 'neumorphism', name: 'Neumorphism' },
    { id: 'corporate', name: 'Corporate' }, { id: 'playful', name: 'Playful' }, { id: 'elegance', name: 'Elegance' },
    { id: 'terminal', name: 'Terminal' }, { id: 'macos', name: 'MacOS' }, { id: 'windows', name: 'Windows' },
    { id: 'mobile', name: 'Mobile' }, { id: 'card-heavy', name: 'Card Heavy' }, { id: 'flat', name: 'Flat' },
    { id: 'soft', name: 'Soft' }, { id: 'cyberpunk', name: 'Cyberpunk' }, { id: '3d', name: '3D' }, { id: 'zen', name: 'Zen' },
  ];

  const handleColorChange = async (color: ThemeColor) => {
    setThemeColor(color);
    await supabase.from('app_settings').update({ theme_color: color }).neq('id', '0');
  };

  const handleStyleChange = async (style: DesignStyle) => {
    setDesignStyle(style);
    await supabase.from('app_settings').update({ design_style: style }).neq('id', '0');
  };

  const handleReset = async () => {
    setThemeColor('blue');
    setDesignStyle('modern');
    await supabase.from('app_settings').update({ theme_color: 'blue', design_style: 'modern' }).neq('id', '0');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="theme-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-surface-950/40 backdrop-blur-md z-[110]"
        />
      )}
      {isOpen && (
        <motion.div
          key="theme-sidebar"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className="fixed inset-y-0 right-0 w-full sm:w-96 bg-surface-50/95 dark:bg-surface-900/95 backdrop-blur-2xl shadow-2xl z-[120] flex flex-col border-l border-surface-200/40 dark:border-surface-800/40"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-surface-200/60 dark:border-surface-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Palette size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-black text-surface-900 dark:text-white leading-tight">Theme Customizer</h2>
                <p className="text-[10px] font-bold text-surface-500 dark:text-surface-400">Personalize your logistics app</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-surface-500 hover:text-surface-800 dark:hover:text-white bg-surface-100 dark:bg-surface-800 rounded-xl active:scale-95 transition-all border border-surface-200/40 dark:border-surface-700/40"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
            {/* Design Style Selection */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-surface-400 uppercase tracking-widest">Layout Style</h3>
                <span className="text-[10px] font-bold text-surface-400">
                  {styles.length} Styles Available
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-1.5">
                {styles.map((s) => {
                  const isActive = designStyle === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleStyleChange(s.id)}
                      className={clsx(
                        "py-2 px-1.5 rounded-xl border-2 transition-all font-bold active:scale-95 flex items-center justify-center text-center",
                        isActive
                          ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm"
                          : "border-surface-200/60 dark:border-surface-800/60 text-surface-500 hover:bg-surface-100 hover:text-surface-700"
                      )}
                    >
                      <span className="text-[10px] leading-tight tracking-tight">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-surface-400 uppercase tracking-widest">Primary Color</h3>
                <span className="text-[10px] font-bold text-surface-400">
                  {colors.length} Themes Available
                </span>
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3.5 pt-1.5">
                {colors.map((c) => {
                  const isActive = themeColor === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleColorChange(c.id)}
                      className="group flex flex-col items-center gap-1.5 transition-all relative focus:outline-none"
                    >
                      <div
                        className={clsx(
                          "w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 relative group-hover:scale-105 active:scale-90",
                          isActive 
                            ? "ring-4 ring-offset-4 ring-offset-surface-50 dark:ring-offset-surface-900 ring-primary-500" 
                            : "ring-0"
                        )}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-white/20 backdrop-blur-sm w-6 h-6 rounded-lg flex items-center justify-center shadow-sm"
                          >
                            <Check size={14} className="text-white" strokeWidth={3.5} />
                          </motion.div>
                        )}
                      </div>
                      <span className={clsx(
                        "text-[10px] font-black tracking-tight transition-colors",
                        isActive 
                          ? "text-primary-600 dark:text-primary-400" 
                          : "text-surface-500 group-hover:text-surface-800 dark:group-hover:text-surface-200"
                      )}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-4 border-t border-surface-200/60 dark:border-surface-800/60">
              <button
                onClick={handleReset}
                className="w-full py-3 px-4 rounded-xl font-black text-sm text-surface-600 dark:text-surface-300 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Reset to Default
              </button>
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="p-5 border-t border-surface-200/60 dark:border-surface-800/60 text-center bg-surface-100/30 dark:bg-surface-800/10">
            <p className="text-[10px] text-surface-400 font-bold tracking-tight">
              Preferences are saved globally for all users via Supabase.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ThemeMode = 'light';

export type ThemeColor = 
  | 'blue' 
  | 'indigo' 
  | 'purple' 
  | 'rose' 
  | 'orange' 
  | 'emerald' 
  | 'teal' 
  | 'cyan' 
  | 'slate' 
  | 'zinc'
  | 'red'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'sky'
  | 'violet'
  | 'fuchsia'
  | 'pink';

export type DesignStyle = 
  | 'modern' | 'minimalist' | 'glassmorphism' | 'material' 
  | 'neumorphism' | 'corporate' | 'playful' | 'elegance' | 'terminal' 
  | 'macos' | 'windows' | 'mobile' | 'card-heavy' | 'flat' | 'soft' 
  | 'cyberpunk' | '3d' | 'zen';

interface ThemeContextType {
  mode: ThemeMode;
  themeColor: ThemeColor;
  designStyle: DesignStyle;
  setMode: (mode: ThemeMode) => void;
  setThemeColor: (color: ThemeColor) => void;
  setDesignStyle: (style: DesignStyle) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  const [themeColor, setThemeColor] = useState<ThemeColor>('blue');
  const [designStyle, setDesignStyle] = useState<DesignStyle>('modern');

  // Fetch initial global settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('theme_color, design_style')
          .single();
          
        if (data && !error) {
          setThemeColor(data.theme_color as ThemeColor);
          setDesignStyle(data.design_style as DesignStyle);
        }
      } catch (err) {
        console.error("Failed to fetch app settings", err);
      }
    };
    
    fetchSettings();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove previous color themes and mode classes
    const colorClasses = [
      'theme-blue', 'theme-indigo', 'theme-purple', 'theme-rose', 'theme-orange',
      'theme-emerald', 'theme-teal', 'theme-cyan', 'theme-slate', 'theme-zinc',
      'theme-red', 'theme-amber', 'theme-yellow', 'theme-lime', 'theme-green',
      'theme-sky', 'theme-violet', 'theme-fuchsia', 'theme-pink'
    ];
    const styleClasses = [
      'style-modern', 'style-minimalist', 'style-glassmorphism', 'style-material',
      'style-neumorphism', 'style-corporate', 'style-playful', 'style-elegance', 'style-terminal',
      'style-macos', 'style-windows', 'style-mobile', 'style-card-heavy', 'style-flat', 'style-soft',
      'style-cyberpunk', 'style-3d', 'style-zen'
    ];
    root.classList.remove('light', 'dark', ...colorClasses, ...styleClasses);

    // Apply color theme and design style classes
    root.classList.add(`theme-${themeColor}`);
    root.classList.add(`style-${designStyle}`);

    // Determine actual mode based on state or system
    let activeMode: 'light' | 'dark' = 'light';
    
    root.classList.add(activeMode);
  }, [mode, themeColor, designStyle]);

  // Listener for system color scheme changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [mode]);

  const toggleMode = () => {
    setMode('light');
  };

  return (
    <ThemeContext.Provider value={{ mode, themeColor, designStyle, setMode, setThemeColor, setDesignStyle, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

import React from 'react';
import { clsx } from 'clsx';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'dark' | 'light';
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true, variant = 'dark' }) => {
  const textColor = variant === 'dark' ? 'text-slate-800' : 'text-white';
  const subTextColor = variant === 'dark' ? 'text-slate-500' : 'text-slate-300';
  const fillColor = variant === 'dark' ? '#0f172a' : '#ffffff';

  return (
    <div className={clsx("flex flex-col items-center justify-center", className)}>
      {/* MD Monogram SVG */}
      <svg 
        viewBox="0 0 100 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-[120px]"
      >
        {/* M Left Leg */}
        <path d="M10 10 L10 70 L25 70 L25 30 L10 10Z" fill={fillColor} />
        
        {/* M Middle Diagonal */}
        <path d="M28 10 L45 50 L62 10 L50 10 L45 25 L40 10 Z" fill={fillColor} />
        
        {/* D Curve merged with M Right */}
        <path d="M65 10 H80 C95 10 95 70 80 70 H65 V10 Z M75 25 V55 H80 C85 55 85 25 80 25 H75Z" fill={fillColor} fillRule="evenodd" />
        
        {/* Stylized Cuts/Accents to match the 3D feel */}
        <path d="M25 70 L45 50 L48 55 L28 75 Z" fill={fillColor} opacity="0.8" />
      </svg>

      {showText && (
        <div className="text-center mt-1">
          <h1 className={clsx("text-2xl font-black tracking-widest leading-none", textColor)}>MD</h1>
          <p className={clsx("text-[0.6rem] tracking-[0.3em] font-bold uppercase mt-1", subTextColor)}>
            Courier Service
          </p>
        </div>
      )}
    </div>
  );
};

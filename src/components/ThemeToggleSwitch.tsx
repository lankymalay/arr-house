import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeToggleSwitchProps {
  id?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggleSwitch: React.FC<ThemeToggleSwitchProps> = ({
  id = 'theme-toggle-switch',
  size = 'md',
  showLabel = false,
  className = ''
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const isSmall = size === 'sm';
  const trackWidth = isSmall ? 'w-14 h-7' : 'w-16 h-8';
  const thumbSize = isSmall ? 'w-5 h-5' : 'w-6 h-6';
  const translateClass = isSmall
    ? (isDark ? 'translate-x-7' : 'translate-x-0')
    : (isDark ? 'translate-x-8' : 'translate-x-0');

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {showLabel && (
        <span className="text-xs font-semibold theme-text-secondary">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        onClick={toggleTheme}
        className={`relative ${trackWidth} p-1 rounded-full cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 border ${
          isDark
            ? 'bg-[#141a29] border-[#2c374f] shadow-inner shadow-black/40'
            : 'bg-[#e2e8f0] border-[#cbd5e1] shadow-inner shadow-slate-400/20'
        }`}
      >
        {/* Track Icons for intuitive context */}
        <div className="absolute inset-0 px-2 flex items-center justify-between pointer-events-none">
          <Sun
            className={`w-3.5 h-3.5 transition-opacity duration-200 ${
              isDark ? 'opacity-30 text-amber-300' : 'opacity-80 text-amber-500'
            }`}
          />
          <Moon
            className={`w-3.5 h-3.5 transition-opacity duration-200 ${
              isDark ? 'opacity-80 text-indigo-300' : 'opacity-30 text-slate-400'
            }`}
          />
        </div>

        {/* Smooth Sliding Thumb */}
        <span
          className={`absolute top-1 left-1 ${thumbSize} rounded-full flex items-center justify-center transform transition-transform duration-300 ease-out shadow-md ${translateClass} ${
            isDark
              ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-indigo-950/70'
              : 'bg-gradient-to-tr from-amber-400 to-orange-400 text-slate-950 shadow-amber-500/40'
          }`}
        >
          {isDark ? (
            <Moon className="w-3.5 h-3.5 fill-current text-white" />
          ) : (
            <Sun className="w-3.5 h-3.5 fill-current text-slate-950" />
          )}
        </span>
      </button>
    </div>
  );
};

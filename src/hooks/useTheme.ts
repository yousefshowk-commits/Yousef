import { useEffect } from 'react';
import type { Theme } from '../types';

export function useThemeClass(theme: Theme) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1020' : '#7c3aed');
  }, [theme]);
}

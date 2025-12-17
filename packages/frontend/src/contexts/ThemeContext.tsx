import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'guru_theme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // TEMPORÁRIO: Forçar light mode até dark mode ser implementado em todas as páginas
  const [theme, setThemeState] = useState<Theme>('light');

  const isDark = theme === 'dark';

  useEffect(() => {
    // IMPORTANTE: Sempre remover classe dark para evitar tela preta
    // Dark mode está desabilitado temporariamente
    document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_KEY, 'light');
  }, []);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

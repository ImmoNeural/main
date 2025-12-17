import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // TEMPORÁRIO: Forçar light mode - dark mode desabilitado
  const [theme] = useState<Theme>('light');
  const isDark = false;

  useEffect(() => {
    // Garantir que não há classe dark
    try {
      document.documentElement.classList.remove('dark');
    } catch (e) {
      // Ignorar erro se document não disponível
    }
  }, []);

  // Funções desabilitadas temporariamente
  const toggleTheme = () => {
    // Desabilitado
  };

  const setTheme = () => {
    // Desabilitado
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

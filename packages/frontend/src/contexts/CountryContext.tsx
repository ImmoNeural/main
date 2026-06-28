import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Country = 'BR' | 'DE';

interface CountryContextType {
  country: Country;
  setCountry: (country: Country) => void;
  toggleCountry: () => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const COUNTRY_KEY = 'guru_country';

export const CountryProvider = ({ children }: { children: ReactNode }) => {
  const [country, setCountryState] = useState<Country>('BR');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COUNTRY_KEY);
      if (stored === 'DE') {
        setCountryState('DE');
      }
    } catch {
      // Ignorar erro de localStorage
    }
  }, []);

  const setCountry = (c: Country) => {
    setCountryState(c);
    try {
      localStorage.setItem(COUNTRY_KEY, c);
    } catch {
      // Ignorar erro
    }
  };

  const toggleCountry = () => {
    setCountry(country === 'BR' ? 'DE' : 'BR');
  };

  return (
    <CountryContext.Provider value={{ country, setCountry, toggleCountry }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

export default CountryContext;

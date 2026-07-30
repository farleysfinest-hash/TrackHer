import { createContext, useContext } from 'react';
import { useDosesDue } from '../../hooks/useDosesDue';

interface NavDueValue {
  needsDoses: boolean;
  dosesLoading: boolean;
}

const NavDueContext = createContext<NavDueValue | null>(null);

/** One dose-due subscription for MobileNav + Sidebar. */
export function NavDueProvider({ children }: { children: React.ReactNode }) {
  const { needsDoses, isLoading } = useDosesDue();
  return (
    <NavDueContext.Provider value={{ needsDoses, dosesLoading: isLoading }}>
      {children}
    </NavDueContext.Provider>
  );
}

export function useNavDosesDue(): NavDueValue {
  const ctx = useContext(NavDueContext);
  if (!ctx) {
    throw new Error('useNavDosesDue must be used within NavDueProvider');
  }
  return ctx;
}

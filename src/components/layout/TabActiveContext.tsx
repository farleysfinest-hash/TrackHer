import { createContext, useContext } from 'react';

/** Whether the current PersistentTabs page is the visible tab. */
const TabActiveContext = createContext(true);

export function TabActiveProvider({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return <TabActiveContext.Provider value={active}>{children}</TabActiveContext.Provider>;
}

export function useTabActive(): boolean {
  return useContext(TabActiveContext);
}

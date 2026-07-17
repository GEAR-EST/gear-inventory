import * as React from "react";

type SidebarLayoutContextProps = {
  isExpanded: boolean;
  toggleSidebar: () => void;
};

const SidebarLayoutContext = React.createContext<SidebarLayoutContextProps | null>(null);

export function SidebarLayoutProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const toggleSidebar = React.useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const value = React.useMemo(() => ({
    isExpanded,
    toggleSidebar,
  }), [isExpanded, toggleSidebar]);

  return (
    <SidebarLayoutContext.Provider value={value}>
      {children}
    </SidebarLayoutContext.Provider>
  );
}

export function useSidebarLayout() {
  const context = React.useContext(SidebarLayoutContext);
  if (!context) {
    throw new Error("useSidebarLayout must be used within a SidebarLayoutProvider.");
  }
  return context;
}

import {
  createContext,
  useContext,
} from "react";

export interface TabsValueOrderContextValue {
  valueOrder: string[];
  setValueOrder: (order: string[]) => void;
  selectedValue: string | undefined;
}

export const TabsValueOrderContext =
  createContext<TabsValueOrderContextValue | null>(null);

export interface TabsListContextValue {
  registerTab: (index: number, value: string, el: HTMLElement | null) => void;
  hoveredIndex: number | null;
  selectedValue: string | undefined;
  setOptimisticIdx: (index: number) => void;
}

export const TabsListContext = createContext<TabsListContextValue | null>(null);

export function useTabsList() {
  const context = useContext(TabsListContext);
  if (!context) throw new Error("TabItem must be used within a TabsList");
  return context;
}

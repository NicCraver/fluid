"use client";

import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import {
  TabItem,
  TabPanel,
  type TabItemProps,
  type TabPanelProps,
} from "~/components/ui/tabs-items";
import {
  TabsList,
  type TabsListProps,
} from "~/components/ui/tabs-list";
import { TabsValueOrderContext } from "~/components/ui/tabs-context";

export interface TabsProps extends Omit<
    ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
    "onValueChange" | "onSelect"
  > {
  value?: string;
  onValueChange?: (value: string) => void;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value,
      onValueChange,
      selectedIndex,
      onSelect,
      defaultValue,
      children,
      ...props
    },
    ref
  ) => {
    const [valueOrder, setValueOrder] = useState<string[]>([]);
    const [uncontrolledValue, setUncontrolledValue] = useState<
      string | undefined
    >(defaultValue);
    const updateValueOrder = useCallback((order: string[]) => {
      setValueOrder((current) => {
        if (
          current.length === order.length &&
          current.every((currentValue, index) => currentValue === order[index])
        ) {
          return current;
        }
        return order;
      });
    }, []);

    const resolvedValue =
      value ??
      (selectedIndex != null
        ? valueOrder[selectedIndex]
        : (uncontrolledValue ?? valueOrder[0]));

    const handleValueChange = useCallback(
      (newValue: string) => {
        if (value === undefined && selectedIndex == null) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
        if (onSelect) {
          const index = valueOrder.indexOf(newValue);
          if (index !== -1) onSelect(index);
        }
      },
      [onValueChange, onSelect, valueOrder, value, selectedIndex]
    );
    const contextValue = useMemo(
      () => ({
        valueOrder,
        setValueOrder: updateValueOrder,
        selectedValue: resolvedValue,
      }),
      [valueOrder, updateValueOrder, resolvedValue]
    );

    return (
      <TabsValueOrderContext.Provider value={contextValue}>
        <TabsPrimitive.Root
          ref={ref}
          value={resolvedValue ?? ""}
          onValueChange={handleValueChange}
          activationMode="automatic"
          {...props}
        >
          {children}
        </TabsPrimitive.Root>
      </TabsValueOrderContext.Provider>
    );
  }
);

Tabs.displayName = "Tabs";

export { Tabs, TabsList, TabItem, TabPanel };
export type { TabsListProps, TabItemProps, TabPanelProps };

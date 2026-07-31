"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { useTabsList } from "~/components/ui/tabs-context";
import { fontWeights } from "~/lib/font-weight";
import { type IconComponent } from "~/lib/icon-context";
import { cn } from "~/lib/utils";

export interface TabItemProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  value: string;
  icon?: IconComponent;
  label: string;
  /** @internal Auto-assigned by TabsList. */
  _index?: number;
}

export const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  (
    { value, icon: Icon, label, _index = 0, className, onClick, ...props },
    ref
  ) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const { registerTab, hoveredIndex, selectedValue, setOptimisticIdx } =
      useTabsList();

    useEffect(() => {
      registerTab(_index, value, internalRef.current);
      return () => registerTab(_index, value, null);
    }, [_index, value, registerTab]);

    const isSelected = selectedValue === value;
    const isActive = hoveredIndex === _index || isSelected;

    return (
      <TabsPrimitive.Trigger
        onClick={(event) => {
          setOptimisticIdx(_index);
          onClick?.(event);
        }}
        ref={(node) => {
          (
            internalRef as React.MutableRefObject<HTMLButtonElement | null>
          ).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) {
            (
              ref as React.MutableRefObject<HTMLButtonElement | null>
            ).current = node;
          }
        }}
        value={value}
        data-proximity-index={_index}
        className={cn(
          "relative z-10 flex h-8 items-center gap-2 px-3 cursor-pointer bg-transparent border-none outline-none",
          className
        )}
        {...props}
      >
        {Icon && (
          <Icon
            size={16}
            strokeWidth={isActive ? 2 : 1.5}
            className={cn(
              "transition-[color,stroke-width] duration-80",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          />
        )}
        <span className="inline-grid text-[13px] whitespace-nowrap">
          <span
            className="col-start-1 row-start-1 invisible [text-box:trim-both_cap_alphabetic]"
            style={{ fontVariationSettings: fontWeights.semibold }}
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
            style={{
              fontVariationSettings: isSelected
                ? fontWeights.semibold
                : fontWeights.normal,
            }}
          >
            {label}
          </span>
        </span>
      </TabsPrimitive.Trigger>
    );
  }
);

TabItem.displayName = "TabItem";

export interface TabPanelProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  value: string;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn("outline-none", className)}
      {...props}
    />
  )
);

TabPanel.displayName = "TabPanel";

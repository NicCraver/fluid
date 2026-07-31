"use client";

import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  createContext,
  useContext,
  forwardRef,
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { m, AnimatePresence } from "framer-motion";
import type { IconComponent } from "~/lib/icon-context";
import { cn } from "~/lib/utils";
import { spring } from "~/lib/springs";
import { fontWeights } from "~/lib/font-weight";
import { useShape } from "~/lib/shape-context";
import { useSurface } from "~/lib/surface-context";
import { surfaceClasses } from "~/lib/surface-classes";
import { useProximityHover } from "~/hooks/use-proximity-hover";

/* ─────────────────────── Contexts ─────────────────────── */

interface TabsValueOrderContextValue {
  valueOrder: string[];
  setValueOrder: (order: string[]) => void;
  selectedValue: string | undefined;
}

const TabsValueOrderContext = createContext<TabsValueOrderContextValue | null>(null);

interface TabsListContextValue {
  registerTab: (index: number, value: string, el: HTMLElement | null) => void;
  hoveredIndex: number | null;
  selectedValue: string | undefined;
  /** Optimistically set selectedIdx so the indicator moves immediately on click. */
  setOptimisticIdx: (index: number) => void;
}

const TabsListContext = createContext<TabsListContextValue | null>(null);

function useTabsList() {
  const ctx = useContext(TabsListContext);
  if (!ctx) throw new Error("TabItem must be used within a TabsList");
  return ctx;
}

/* ─────────────────────── Tabs (Root) ─────────────────────── */

interface TabsProps
  extends Omit<
    ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
    "onValueChange" | "onSelect"
  > {
  /** Controlled value (takes precedence over selectedIndex). */
  value?: string;
  /** Called when the active tab changes. */
  onValueChange?: (value: string) => void;
  /** Index-based controlled alternative. */
  selectedIndex?: number;
  /** Called with the new index when the active tab changes. */
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
    const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(
      defaultValue
    );
    const updateValueOrder = useCallback((order: string[]) => {
      setValueOrder((current) => {
        if (
          current.length === order.length &&
          current.every((value, index) => value === order[index])
        ) {
          return current;
        }
        return order;
      });
    }, []);

    // Resolve value: explicit value > selectedIndex lookup > uncontrolled state.
    // Uncontrolled with no defaultValue falls back to the first tab so the
    // FF layer's selectedValue matches what the primitive shows.
    const resolvedValue =
      value ??
      (selectedIndex != null
        ? valueOrder[selectedIndex]
        : uncontrolledValue ?? valueOrder[0]);

    const handleValueChange = useCallback(
      (newValue: string) => {
        if (value === undefined && selectedIndex == null) {
          setUncontrolledValue(newValue);
        }
        onValueChange?.(newValue);
        if (onSelect) {
          const idx = valueOrder.indexOf(newValue);
          if (idx !== -1) onSelect(idx);
        }
      },
      [onValueChange, onSelect, valueOrder, value, selectedIndex]
    );

    const valueOrderContextValue = useMemo(
      () => ({
        valueOrder,
        setValueOrder: updateValueOrder,
        selectedValue: resolvedValue,
      }),
      [valueOrder, updateValueOrder, resolvedValue]
    );

    return (
      <TabsValueOrderContext.Provider value={valueOrderContextValue}>
        {/*
          Always controlled: feeding the primitive an undefined-then-defined
          value flips it from uncontrolled to controlled, which Radix warns
          about in dev. valueOrder is empty on the first commit, so fall back
          to an empty-string sentinel — TabsList's layout effect populates
          valueOrder pre-paint, so the corrected value lands before anything
          is visible.
        */}
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

/* ─────────────────────── TabsList ─────────────────────── */

type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List>;

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isMouseInside = useRef(false);
    const shape = useShape();
    const substrate = useSurface();
    // Active pill lifts 3 levels above substrate (1 above the muted track + 2 for pop).
    // On the page (substrate 1) this lands on surface 4 — matches the original design.
    // Inside a dialog (substrate 5) it lifts to surface 8 instead of staying at 4.
    const indicatorLevel = Math.min(substrate + 3, 8);
    const valueOrderCtx = useContext(TabsValueOrderContext);
    const [optimisticIdx, setOptimisticIdx] = useState<number | null>(null);

    // Derive value order from children synchronously
    const values = Children.toArray(children).reduce<string[]>((acc, child) => {
      if (isValidElement(child)) {
        const childValue = (child.props as { value?: string }).value;
        if (typeof childValue === "string") acc.push(childValue);
      }
      return acc;
    }, []);
    const valueOrderKey = values.join(",");
    const setValueOrder = valueOrderCtx?.setValueOrder;

    // Report value order up to Tabs root. valueOrderKey is the stable proxy for
    // `values`, so the effect only needs to depend on it; useEffectEvent reads
    // the latest `values`/`setValueOrder` without widening the dependency array.
    const emitOrder = useEffectEvent(() => setValueOrder?.(values));
    useLayoutEffect(() => {
      emitOrder();
    }, [valueOrderKey]);

    // Proximity hover
    const {
      activeIndex: hoveredIndex,
      setActiveIndex: setHoveredIndex,
      itemRects,
      handlers,
      registerItem,
      measureItems,
    } = useProximityHover(containerRef, { axis: "x" });

    // Register items: bridge from (index, value, el) → registerItem(index, el)
    const registerTab = useCallback(
      (index: number, _value: string, el: HTMLElement | null) => {
        registerItem(index, el);
      },
      [registerItem]
    );

    // Measure on children change (resizes are covered by useProximityHover's
    // own container ResizeObserver)
    useEffect(() => {
      measureItems();
    }, [measureItems, children]);

    // Track mouse inside
    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        isMouseInside.current = true;
        handlers.onMouseMove(e);
      },
      [handlers]
    );

    const handleMouseLeave = useCallback(() => {
      isMouseInside.current = false;
      handlers.onMouseLeave();
    }, [handlers]);

    // Focus ring
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const selectedValue = valueOrderCtx?.selectedValue;
    const selectedIdx =
      selectedValue !== undefined ? values.indexOf(selectedValue) : -1;

    useEffect(() => {
      setOptimisticIdx(selectedIdx >= 0 ? selectedIdx : null);
    }, [selectedIdx]);

    const activeSelectedIdx = optimisticIdx;
    const selectedRect =
      activeSelectedIdx !== null ? itemRects[activeSelectedIdx] : null;
    const hoverRect = hoveredIndex !== null ? itemRects[hoveredIndex] : null;
    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
    const isHoveringSelected = hoveredIndex === activeSelectedIdx;
    const isHovering = hoveredIndex !== null && !isHoveringSelected;

    // Auto-assign _index to children.
    // Skip plain DOM elements — injecting _index into e.g. a <div>
    // triggers React's unknown-prop warning.
    const indexedChildren = Children.map(children, (child, i) => {
      if (isValidElement(child) && typeof child.type !== "string") {
        return cloneElement(child, { _index: i } as Record<string, unknown>);
      }
      return child;
    });

    const listContextValue = useMemo(
      () => ({
        registerTab,
        hoveredIndex,
        selectedValue,
        setOptimisticIdx,
      }),
      [registerTab, hoveredIndex, selectedValue, setOptimisticIdx]
    );

    return (
      <TabsListContext.Provider value={listContextValue}>
        <TabsPrimitive.List
          ref={(node) => {
            (
              containerRef as React.MutableRefObject<HTMLDivElement | null>
            ).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref)
              (
                ref as React.MutableRefObject<HTMLDivElement | null>
              ).current = node;
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onFocus={(e) => {
            const trigger = (e.target as HTMLElement).closest('[role="tab"]');
            if (!trigger) return;
            const indexAttr = trigger.getAttribute("data-proximity-index");
            if (indexAttr != null) {
              const idx = Number(indexAttr);
              setHoveredIndex(idx);
              setFocusedIndex(
                (e.target as HTMLElement).matches(":focus-visible") ? idx : null
              );
            }
          }}
          onBlur={(e) => {
            if (containerRef.current?.contains(e.relatedTarget as Node)) return;
            setFocusedIndex(null);
            if (isMouseInside.current) return;
            setHoveredIndex(null);
          }}
          className={cn(
            "relative inline-flex items-center gap-0.5 p-1 select-none bg-muted",
            shape.container,
            className
          )}
          {...props}
        >
          {/* Active segment indicator */}
          {selectedRect && (
            <m.div
              className={cn(
                "absolute top-0 left-0 pointer-events-none",
                surfaceClasses(indicatorLevel),
                shape.bg
              )}
              style={{ width: selectedRect.width, height: selectedRect.height }}
              initial={false}
              animate={{
                x: selectedRect.left,
                y: selectedRect.top,
                opacity: isHovering ? 0.85 : 1,
              }}
              transition={{
                ...spring.moderate,
                opacity: { duration: 0.08 },
              }}
            />
          )}

          {/* Hover indicator */}
          <AnimatePresence>
            {hoverRect && !isHoveringSelected && selectedRect && (
              <m.div
                className={cn(
                  "absolute top-0 left-0 pointer-events-none bg-hover",
                  shape.bg
                )}
                style={{ width: hoverRect.width, height: hoverRect.height }}
                initial={{
                  opacity: 0,
                  x: selectedRect.left,
                  y: selectedRect.top,
                }}
                animate={{
                  opacity: 0.4,
                  x: hoverRect.left,
                  y: hoverRect.top,
                }}
                exit={
                  !isMouseInside.current && selectedRect
                    ? {
                        opacity: 0,
                        x: selectedRect.left,
                        y: selectedRect.top,
                        transition: {
                          ...spring.moderate,
                          opacity: { duration: 0.06 },
                        },
                      }
                    : { opacity: 0, transition: spring.fast.exit }
                }
                transition={{
                  ...spring.fast,
                  opacity: { duration: 0.08 },
                }}
              />
            )}
          </AnimatePresence>

          {/* Focus ring */}
          <AnimatePresence>
            {focusRect && (
              <m.div
                className={cn(
                  "absolute top-0 left-0 pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]",
                  shape.focusRing
                )}
                style={{ width: focusRect.width + 4, height: focusRect.height + 4 }}
                initial={false}
                animate={{
                  x: focusRect.left - 2,
                  y: focusRect.top - 2,
                }}
                exit={{ opacity: 0, transition: spring.fast.exit }}
                transition={{
                  ...spring.fast,
                  opacity: { duration: 0.08 },
                }}
              />
            )}
          </AnimatePresence>

          {indexedChildren}
        </TabsPrimitive.List>
      </TabsListContext.Provider>
    );
  }
);

TabsList.displayName = "TabsList";

/* ─────────────────────── TabItem ─────────────────────── */

interface TabItemProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  /** Unique value for this tab. */
  value: string;
  /** Optional leading icon. */
  icon?: IconComponent;
  /** Text label. */
  label: string;
  /** @internal Auto-assigned by TabsList. */
  _index?: number;
}

const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ value, icon: Icon, label, _index = 0, className, onClick, ...props }, ref) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const { registerTab, hoveredIndex, selectedValue, setOptimisticIdx } = useTabsList();

    useEffect(() => {
      registerTab(_index, value, internalRef.current);
      return () => registerTab(_index, value, null);
    }, [_index, value, registerTab]);

    const isSelected = selectedValue === value;
    const isActive = hoveredIndex === _index || isSelected;

    return (
      <TabsPrimitive.Trigger
        // Composed (not spread-overridable): a consumer onClick must not
        // replace the optimistic indicator jump.
        onClick={(e) => {
          setOptimisticIdx(_index);
          onClick?.(e);
        }}
        ref={(node) => {
          (
            internalRef as React.MutableRefObject<HTMLButtonElement | null>
          ).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref)
            (
              ref as React.MutableRefObject<HTMLButtonElement | null>
            ).current = node;
        }}
        value={value}
        data-proximity-index={_index}
        className={cn(
          // Fixed height (not py) so the text-box trim below doesn't shrink
          // the tab — browsers without text-box support render identically.
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
        {/* Both stacked spans carry the text-box trim so the invisible bold
            sizer and the visible label keep identical boxes. */}
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

/* ─────────────────────── TabPanel ─────────────────────── */

interface TabPanelProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  /** Must match a TabItem value. */
  value: string;
}

const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ className, ...props }, ref) => {
    return (
      <TabsPrimitive.Content
        ref={ref}
        className={cn("outline-none", className)}
        {...props}
      />
    );
  }
);

TabPanel.displayName = "TabPanel";

/* ─────────────────────── Exports ─────────────────────── */

export { Tabs, TabsList, TabItem, TabPanel };
export type { TabsProps, TabsListProps, TabItemProps, TabPanelProps };

"use client";

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { AnimatePresence, domAnimation, LazyMotion, m } from "framer-motion";

import {
  TabsListContext,
  TabsValueOrderContext,
} from "~/components/ui/tabs-context";
import { useProximityHover } from "~/hooks/use-proximity-hover";
import { useShape } from "~/lib/shape-context";
import { spring } from "~/lib/springs";
import { surfaceClasses } from "~/lib/surface-classes";
import { useSurface } from "~/lib/surface-context";
import { cn } from "~/lib/utils";

export type TabsListProps = ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
>;

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isMouseInside = useRef(false);
    const shape = useShape();
    const substrate = useSurface();
    const indicatorLevel = Math.min(substrate + 3, 8);
    const valueOrderCtx = useContext(TabsValueOrderContext);
    const [optimisticIdx, setOptimisticIdx] = useState<number | null>(null);

    const values = useMemo(
      () =>
        Children.toArray(children).reduce<string[]>((result, child) => {
          if (isValidElement(child)) {
            const value = (child.props as { value?: string }).value;
            if (typeof value === "string") result.push(value);
          }
          return result;
        }, []),
      [children]
    );
    const setValueOrder = valueOrderCtx?.setValueOrder;

    useLayoutEffect(() => {
      setValueOrder?.(values);
    }, [setValueOrder, values]);

    const {
      activeIndex: hoveredIndex,
      setActiveIndex: setHoveredIndex,
      itemRects,
      handlers,
      registerItem,
      measureItems,
    } = useProximityHover(containerRef, { axis: "x" });

    const registerTab = useCallback(
      (index: number, _value: string, element: HTMLElement | null) => {
        registerItem(index, element);
      },
      [registerItem]
    );

    useEffect(() => {
      measureItems();
    }, [measureItems, children]);

    const handleMouseMove = useCallback(
      (event: React.MouseEvent) => {
        isMouseInside.current = true;
        handlers.onMouseMove(event);
      },
      [handlers]
    );

    const handleMouseLeave = useCallback(() => {
      isMouseInside.current = false;
      handlers.onMouseLeave();
    }, [handlers]);

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

    const indexedChildren = Children.map(children, (child, index) => {
      if (isValidElement(child) && typeof child.type !== "string") {
        return cloneElement(child, {
          _index: index,
        } as Record<string, unknown>);
      }
      return child;
    });
    const contextValue = useMemo(
      () => ({
        registerTab,
        hoveredIndex,
        selectedValue,
        setOptimisticIdx,
      }),
      [registerTab, hoveredIndex, selectedValue]
    );

    return (
      <LazyMotion features={domAnimation} strict>
        <TabsListContext.Provider value={contextValue}>
          <TabsPrimitive.List
            ref={(node) => {
              (
                containerRef as React.MutableRefObject<HTMLDivElement | null>
              ).current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) {
                (
                  ref as React.MutableRefObject<HTMLDivElement | null>
                ).current = node;
              }
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onFocus={(event) => {
              const trigger = (event.target as HTMLElement).closest(
                '[role="tab"]'
              );
              if (!trigger) return;
              const indexAttr = trigger.getAttribute("data-proximity-index");
              if (indexAttr != null) {
                const index = Number(indexAttr);
                setHoveredIndex(index);
                setFocusedIndex(
                  (event.target as HTMLElement).matches(":focus-visible")
                    ? index
                    : null
                );
              }
            }}
            onBlur={(event) => {
              if (
                containerRef.current?.contains(event.relatedTarget as Node)
              ) {
                return;
              }
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
            {selectedRect && (
              <m.div
                layout
                className={cn(
                  "absolute pointer-events-none",
                  surfaceClasses(indicatorLevel),
                  shape.bg
                )}
                style={{
                  left: selectedRect.left,
                  width: selectedRect.width,
                  top: selectedRect.top,
                  height: selectedRect.height,
                }}
                initial={false}
                animate={{ opacity: isHovering ? 0.85 : 1 }}
                transition={{
                  ...spring.moderate,
                  opacity: { duration: 0.08 },
                }}
              />
            )}

            <AnimatePresence>
              {hoverRect && !isHoveringSelected && selectedRect && (
                <m.div
                  layout
                  className={cn(
                    "absolute pointer-events-none bg-hover",
                    shape.bg
                  )}
                  style={{
                    left: hoverRect.left,
                    width: hoverRect.width,
                    top: hoverRect.top,
                    height: hoverRect.height,
                    transformOrigin: "top left",
                  }}
                  initial={{
                    x: selectedRect.left - hoverRect.left,
                    y: selectedRect.top - hoverRect.top,
                    scaleX: selectedRect.width / hoverRect.width,
                    scaleY: selectedRect.height / hoverRect.height,
                    opacity: 0,
                  }}
                  animate={{
                    x: 0,
                    y: 0,
                    scaleX: 1,
                    scaleY: 1,
                    opacity: 0.4,
                  }}
                  exit={
                    !isMouseInside.current
                      ? {
                          x: selectedRect.left - hoverRect.left,
                          y: selectedRect.top - hoverRect.top,
                          scaleX: selectedRect.width / hoverRect.width,
                          scaleY: selectedRect.height / hoverRect.height,
                          opacity: 0,
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

            <AnimatePresence>
              {focusRect && (
                <m.div
                  layout
                  className={cn(
                    "absolute pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]",
                    shape.focusRing
                  )}
                  style={{
                    left: focusRect.left - 2,
                    top: focusRect.top - 2,
                    width: focusRect.width + 4,
                    height: focusRect.height + 4,
                  }}
                  initial={false}
                  animate={{ opacity: 1 }}
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
      </LazyMotion>
    );
  }
);

TabsList.displayName = "TabsList";

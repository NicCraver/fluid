"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { domAnimation, LazyMotion } from "framer-motion";

import { DropdownHighlights } from "~/components/ui/dropdown-highlights";
import {
  DropdownContext,
} from "~/components/ui/menu-item";
import { useProximityHover } from "~/hooks/use-proximity-hover";
import { Elevated } from "~/lib/elevated";
import { shapeMap } from "~/lib/shape-context";
import { cn } from "~/lib/utils";

const shape = shapeMap.rounded;

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  checkedIndex?: number;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  ({ children, checkedIndex, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
      activeIndex,
      setActiveIndex,
      itemRects,
      sessionRef,
      handlers,
      registerItem,
      measureItems,
    } = useProximityHover(containerRef);

    useEffect(() => {
      measureItems();
    }, [measureItems, children]);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
    const checkedRect = checkedIndex != null ? itemRects[checkedIndex] : null;
    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
    const contextValue = useMemo(
      () => ({ registerItem, activeIndex, checkedIndex }),
      [registerItem, activeIndex, checkedIndex]
    );

    return (
      <LazyMotion features={domAnimation} strict>
        <DropdownContext.Provider value={contextValue}>
          <Elevated
            offset={2}
            shadowLevel={3}
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
            onMouseEnter={handlers.onMouseEnter}
            onMouseMove={handlers.onMouseMove}
            onMouseLeave={handlers.onMouseLeave}
            onFocus={(event) => {
              const indexAttr = (event.target as HTMLElement)
                .closest("[data-proximity-index]")
                ?.getAttribute("data-proximity-index");
              if (indexAttr != null) {
                const index = Number(indexAttr);
                setActiveIndex(index);
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
              setActiveIndex(null);
            }}
            onKeyDown={(event) => {
              const items = Array.from(
                containerRef.current?.querySelectorAll(
                  '[role="menuitem"], [role="menuitemradio"]'
                ) ?? []
              ) as HTMLElement[];
              const currentIndex = items.indexOf(event.target as HTMLElement);
              if (currentIndex === -1) return;

              if (
                ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(
                  event.key
                )
              ) {
                event.preventDefault();
                const next = ["ArrowDown", "ArrowRight"].includes(event.key)
                  ? (currentIndex + 1) % items.length
                  : (currentIndex - 1 + items.length) % items.length;
                items[next].focus();
              } else if (event.key === "Home") {
                event.preventDefault();
                items[0]?.focus();
              } else if (event.key === "End") {
                event.preventDefault();
                items[items.length - 1]?.focus();
              }
            }}
            role="group"
            className={cn(
              `relative flex flex-col gap-0.5 w-72 max-w-full ${shape.container} p-1 select-none`,
              className
            )}
            {...props}
          >
            <DropdownHighlights
              activeRect={activeRect}
              checkedRect={checkedRect}
              focusRect={focusRect}
              sessionKey={sessionRef.current}
            />
            {children}
          </Elevated>
        </DropdownContext.Provider>
      </LazyMotion>
    );
  }
);

Dropdown.displayName = "Dropdown";

export {
  DropdownContent,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
} from "~/components/ui/dropdown-menu";
export { Dropdown };
export type {
  DropdownContentProps,
  DropdownMenuProps,
  DropdownTriggerProps,
} from "~/components/ui/dropdown-menu";
export type {
  DropdownContextValue,
  MenuItemRenderOptions,
} from "~/components/ui/menu-item";
export default Dropdown;

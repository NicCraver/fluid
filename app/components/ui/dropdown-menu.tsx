"use client";

import {
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { domAnimation, LazyMotion, m } from "framer-motion";

import { DropdownHighlights } from "~/components/ui/dropdown-highlights";
import {
  DropdownContext,
  type MenuItemRenderOptions,
} from "~/components/ui/menu-item";
import { useProximityHover } from "~/hooks/use-proximity-hover";
import { Elevated } from "~/lib/elevated";
import { shapeMap } from "~/lib/shape-context";
import { exitFallbackMs, spring } from "~/lib/springs";
import { cn } from "~/lib/utils";

const shape = shapeMap.rounded;

interface DropdownMenuContextValue {
  open: boolean;
  disabled: boolean;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error(
      "DropdownMenu compound components must be inside <DropdownMenu>"
    );
  }
  return ctx;
}

export interface DropdownMenuProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function DropdownMenu({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp !== undefined ? openProp : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );

  const ctx = useMemo(() => ({ open, disabled }), [open, disabled]);

  return (
    <DropdownMenuContext.Provider value={ctx}>
      <DropdownMenuPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        modal={false}
      >
        {children}
      </DropdownMenuPrimitive.Root>
    </DropdownMenuContext.Provider>
  );
}

DropdownMenu.displayName = "DropdownMenu";

export interface DropdownTriggerProps extends Omit<
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>,
    "asChild"
  > {
  /** Element to render as the trigger using Radix composition. */
  render?: ReactElement;
}

export const DropdownTrigger = forwardRef<
  HTMLButtonElement,
  DropdownTriggerProps
>(({ render, children, disabled, ...props }, ref) => {
  const { disabled: rootDisabled } = useDropdownMenuContext();
  const isDisabled = disabled || rootDisabled;

  if (render) {
    return (
      <DropdownMenuPrimitive.Trigger
        ref={ref}
        asChild
        disabled={isDisabled}
        {...props}
      >
        {render}
      </DropdownMenuPrimitive.Trigger>
    );
  }
  return (
    <DropdownMenuPrimitive.Trigger
      ref={ref}
      disabled={isDisabled}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
});

DropdownTrigger.displayName = "DropdownTrigger";

type RadixContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
>;

export interface DropdownContentProps {
  children: ReactNode;
  className?: string;
  checkedIndex?: number;
  side?: RadixContentProps["side"];
  align?: RadixContentProps["align"];
  sideOffset?: number;
}

export const DropdownContent = forwardRef<
  HTMLDivElement,
  DropdownContentProps
>(
  (
    {
      className,
      children,
      checkedIndex,
      side = "bottom",
      align = "start",
      sideOffset = 6,
    },
    ref
  ) => {
    const { open } = useDropdownMenuContext();
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

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      if (open) setMounted(true);
    }, [open]);

    useEffect(() => {
      if (open) return;
      const id = setTimeout(
        () => setMounted(false),
        exitFallbackMs(spring.fast)
      );
      return () => clearTimeout(id);
    }, [open]);

    useEffect(() => {
      if (!open || !mounted) return;
      let inner: number;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          measureItems();
        });
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }, [open, mounted, measureItems]);

    const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
    const checkedRect = checkedIndex != null ? itemRects[checkedIndex] : null;
    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;

    const renderMenuItem = useCallback(
      ({
        radio,
        value,
        disabled,
        label,
        closeOnClick,
        element,
        children,
      }: MenuItemRenderOptions) => {
        const commonProps = {
          asChild: true,
          disabled,
          textValue: label,
          onSelect: closeOnClick
            ? undefined
            : (event: Event) => event.preventDefault(),
        };
        const item = cloneElement(element, {}, children);
        return radio ? (
          <DropdownMenuPrimitive.RadioItem
            value={String(value)}
            {...commonProps}
          >
            {item}
          </DropdownMenuPrimitive.RadioItem>
        ) : (
          <DropdownMenuPrimitive.Item {...commonProps}>
            {item}
          </DropdownMenuPrimitive.Item>
        );
      },
      []
    );

    const contentCtx = useMemo(
      () => ({
        registerItem,
        activeIndex,
        checkedIndex,
        inMenu: true,
        renderMenuItem,
      }),
      [registerItem, activeIndex, checkedIndex, renderMenuItem]
    );

    if (!mounted) return null;

    return (
      <LazyMotion features={domAnimation} strict>
        <DropdownMenuPrimitive.Portal forceMount>
          <DropdownMenuPrimitive.Content
            asChild
            forceMount
            side={side}
            align={align}
            sideOffset={sideOffset}
          >
            <m.div
              className="z-50 outline-none"
              initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
              animate={
                open
                  ? { opacity: 1, y: 0, scaleY: 1 }
                  : { opacity: 0, y: -4, scaleY: 0.96 }
              }
              transition={open ? spring.fast : spring.fast.exit}
              style={{ transformOrigin: "top center" }}
              onAnimationComplete={() => {
                if (!open) setMounted(false);
              }}
            >
              <DropdownContext.Provider value={contentCtx}>
                <Elevated
                  offset={2}
                  shadowLevel={3}
                  ref={(node: HTMLDivElement | null) => {
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
                  onMouseEnter={() => {
                    handlers.onMouseEnter();
                    setFocusedIndex(null);
                  }}
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
                      containerRef.current?.contains(
                        event.relatedTarget as Node
                      )
                    ) {
                      return;
                    }
                    setFocusedIndex(null);
                    setActiveIndex(null);
                  }}
                  className={cn(
                    `relative flex flex-col gap-0.5 w-72 max-w-full min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[min(480px,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto ${shape.container} p-1 select-none outline-none`,
                    className
                  )}
                >
                  <DropdownHighlights
                    activeRect={activeRect}
                    checkedRect={checkedRect}
                    focusRect={focusRect}
                    sessionKey={sessionRef.current}
                  />
                  <DropdownMenuPrimitive.RadioGroup
                    value={
                      checkedIndex != null ? String(checkedIndex) : undefined
                    }
                    className="contents"
                  >
                    {children}
                  </DropdownMenuPrimitive.RadioGroup>
                </Elevated>
              </DropdownContext.Provider>
            </m.div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </LazyMotion>
    );
  }
);

DropdownContent.displayName = "DropdownContent";

export const DropdownLabel = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-2 py-1.5 shrink-0 text-[11px] text-muted-foreground",
      className
    )}
    {...props}
  />
));

DropdownLabel.displayName = "DropdownLabel";

export const DropdownSeparator = forwardRef<
  HTMLHRElement,
  ComponentPropsWithoutRef<"hr">
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn(
      "my-1 -mx-1 h-px shrink-0 border-0 bg-border/60",
      className
    )}
    {...props}
  />
));

DropdownSeparator.displayName = "DropdownSeparator";

"use client";

import {
  Children,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { CardContext, CardGroupContext } from "./card-context";
import { CardLink, isCardImage } from "./card-helpers";
import { CardLayers } from "./card-highlight";
import type { CardContextValue, CardProps } from "./card-types";
import { useIcon } from "~/lib/icon-context";
import { useShape } from "~/lib/shape-context";
import { cn } from "~/lib/utils";

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      onClick,
      href,
      external,
      label,
      selected = false,
      disabled = false,
      dismissible = false,
      onDismiss,
      index,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const shape = useShape();
    const group = useContext(CardGroupContext);
    const XIcon = useIcon("x");

    const orientation = group?.orientation ?? "card";
    const columns = group?.columns ?? 1;
    const count = group?.count ?? 1;
    const separated = group?.separated ?? true;
    const divided = group?.divided ?? false;
    const outlined = group?.outlined ?? false;
    const activeIndex = group?.activeIndex ?? null;
    const selectedIndex = group?.selectedIndex ?? -1;

    // Register against the stable callback rather than changing context values.
    const registerItem = group?.registerItem;
    useEffect(() => {
      if (index === undefined || !registerItem) return;
      registerItem(index, internalRef.current);
      return () => registerItem(index, null);
    }, [index, registerItem]);

    const col = index !== undefined ? index % columns : 0;
    const hasBelow = index !== undefined && index + columns < count;
    const hasRight =
      index !== undefined && col < columns - 1 && index + 1 < count;
    const self = index ?? -1;
    const touchesBelow = (candidate: number) =>
      candidate === self || candidate === self + columns;
    const touchesRight = (candidate: number) =>
      candidate === self || candidate === self + 1;
    const showBottom =
      divided &&
      hasBelow &&
      !(touchesBelow(activeIndex ?? -1) || touchesBelow(selectedIndex));
    const showRight =
      divided &&
      hasRight &&
      !(touchesRight(activeIndex ?? -1) || touchesRight(selectedIndex));

    const isInline = orientation === "inline";
    const hasImage = Children.toArray(children).some(isCardImage);
    const inlineImage = isInline && hasImage;
    const clickable = !!href || !!onClick;
    const emphasized = selected;

    // Standalone cards own their shape. Grouped tiles only own it when framed.
    const tileShape = !group
      ? cn(shape.container, "overflow-hidden")
      : separated && outlined
        ? cn(shape.container, "overflow-hidden border border-border/60")
        : "";

    // A stretched overlay keeps nested action controls independently clickable.
    const overlay = clickable && !disabled ? (
      href ? (
        <CardLink
          href={href}
          onClick={onClick}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          aria-label={label}
          className="absolute inset-0 z-20 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] rounded-[inherit]"
        />
      ) : (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={selected || undefined}
          className="absolute inset-0 z-20 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] rounded-[inherit]"
        />
      )
    ) : null;

    const cardContext = useMemo<CardContextValue>(
      () => ({ emphasized, orientation, clickable, hasImage }),
      [emphasized, orientation, clickable, hasImage]
    );

    let body: ReactNode = children;
    if (inlineImage) {
      const parts = Children.toArray(children);
      const image = parts.find(isCardImage);
      const rest = parts.filter((part) => part !== image);
      body = (
        <>
          {image}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-3.5 pr-4">
            {rest}
          </div>
        </>
      );
    }

    return (
      <CardContext.Provider value={cardContext}>
        <div
          ref={(node) => {
            (internalRef as MutableRefObject<HTMLDivElement | null>).current =
              node;
            if (typeof ref === "function") ref(node);
            else if (ref)
              (ref as MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          data-slot="card"
          data-proximity-index={index}
          data-selected={selected || undefined}
          data-orientation={orientation}
          aria-disabled={disabled || undefined}
          className={cn(
            "group/card relative z-10 min-w-0 min-h-[60px]",
            inlineImage
              ? "flex flex-row items-center gap-3"
              : isInline
                ? "flex flex-row items-center gap-3 pl-4"
                : "flex flex-col pb-4",
            !group &&
              clickable &&
              !disabled &&
              "transition-colors duration-80 hover:bg-hover",
            tileShape,
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          {...props}
        >
          <CardLayers
            selected={selected}
            showBottom={showBottom}
            showRight={showRight}
            shapeClass={shape.container}
          />
          {overlay}
          {body}
          {dismissible && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className={cn(
                "absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-hover cursor-pointer outline-none transition-colors duration-80 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]",
                shape.button
              )}
            >
              <XIcon size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </CardContext.Provider>
    );
  }
);

Card.displayName = "Card";

export { Card };

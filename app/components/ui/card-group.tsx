"use client";

import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactElement,
} from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { CardGroupContext } from "./card-context";
import { CardGroupHighlight } from "./card-highlight";
import type {
  CardGroupContextValue,
  CardGroupProps,
} from "./card-types";
import { useProximityHover } from "~/hooks/use-proximity-hover";
import { useShape } from "~/lib/shape-context";
import { cn } from "~/lib/utils";

const CardGroup = forwardRef<HTMLDivElement, CardGroupProps>(
  (
    {
      orientation = "card",
      columns = 1,
      border = "none",
      separated = false,
      proximityHover = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const shape = useShape();
    const axis = columns > 1 ? "xy" : "y";
    const {
      activeIndex,
      itemRects,
      sessionRef,
      handlers,
      registerItem,
      measureItems,
    } = useProximityHover(containerRef, { axis });

    // The group owns stable proximity indexes; callers never thread them.
    const childArray = Children.toArray(children).filter(isValidElement);
    const count = childArray.length;
    const indexed = childArray.map((child, index) =>
      cloneElement(child as ReactElement<{ index?: number }>, { index })
    );
    const selectedIndex = childArray.findIndex(
      (child) => (child.props as { selected?: boolean }).selected
    );

    useEffect(() => {
      measureItems();
    }, [measureItems, count, columns, orientation, separated, border]);

    const outlined = border === "outlined";
    const divided = !separated;
    const contextValue = useMemo<CardGroupContextValue>(
      () => ({
        registerItem,
        activeIndex,
        selectedIndex,
        orientation,
        columns,
        count,
        separated,
        divided,
        outlined,
      }),
      [
        registerItem,
        activeIndex,
        selectedIndex,
        orientation,
        columns,
        count,
        separated,
        divided,
        outlined,
      ]
    );
    const activeRect =
      proximityHover && activeIndex !== null ? itemRects[activeIndex] : null;

    return (
      <LazyMotion features={domAnimation}>
        <CardGroupContext.Provider value={contextValue}>
          <div
            ref={(node) => {
              (containerRef as MutableRefObject<HTMLDivElement | null>).current =
                node;
              if (typeof ref === "function") ref(node);
              else if (ref)
                (ref as MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            {...props}
            data-slot="card-group"
            data-orientation={orientation}
            className={cn(
              "relative grid",
              outlined &&
                !separated &&
                `border border-border/60 overflow-hidden ${shape.container}`,
              separated ? "gap-2" : "gap-0",
              className
            )}
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
            }}
            onMouseEnter={proximityHover ? handlers.onMouseEnter : undefined}
            onMouseMove={proximityHover ? handlers.onMouseMove : undefined}
            onMouseLeave={proximityHover ? handlers.onMouseLeave : undefined}
          >
            <CardGroupHighlight
              activeRect={activeRect}
              session={sessionRef.current}
              shapeClass={shape.container}
            />
            {indexed}
          </div>
        </CardGroupContext.Provider>
      </LazyMotion>
    );
  }
);

CardGroup.displayName = "CardGroup";

export { CardGroup };

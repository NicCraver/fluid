"use client";

import {
  forwardRef,
  useContext,
  type HTMLAttributes,
} from "react";
import { CardContext } from "./card-context";
import { fontWeights } from "~/lib/font-weight";
import { cn } from "~/lib/utils";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation, hasImage } = useContext(CardContext);
    const inlineImage = orientation === "inline" && hasImage;

    return (
      <div
        ref={ref}
        data-slot="card-header"
        className={cn(
          "grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
          inlineImage
            ? "min-w-0"
            : orientation === "inline"
              ? "min-w-0 flex-1 py-3.5"
              : "px-4 pt-4",
          className
        )}
        {...props}
      />
    );
  }
);

CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => {
  const { emphasized, orientation } = useContext(CardContext);
  const trim =
    orientation === "inline" ? "[text-box:trim-both_cap_alphabetic]" : "";

  return (
    <span
      ref={ref}
      data-slot="card-title"
      className={cn("inline-grid text-[14px] leading-snug", className)}
      {...props}
    >
      <span
        className={cn("col-start-1 row-start-1 invisible", trim)}
        style={{ fontVariationSettings: fontWeights.semibold }}
        aria-hidden="true"
      >
        {children}
      </span>
      <span
        className={cn(
          "col-start-1 row-start-1 text-foreground transition-[font-variation-settings] duration-80",
          trim
        )}
        style={{
          fontVariationSettings: emphasized
            ? fontWeights.semibold
            : fontWeights.normal,
        }}
      >
        {children}
      </span>
    </span>
  );
});

CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="card-description"
    className={cn("text-[14px] leading-normal text-muted-foreground", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

const CardAction = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(
        "relative z-30 col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
);

CardAction.displayName = "CardAction";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useContext(CardContext);

    return (
      <div
        ref={ref}
        data-slot="card-content"
        className={cn(orientation === "inline" ? "" : "px-4 pt-3", className)}
        {...props}
      />
    );
  }
);

CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation, hasImage } = useContext(CardContext);
    const inlineImage = orientation === "inline" && hasImage;

    return (
      <div
        ref={ref}
        data-slot="card-footer"
        className={cn(
          "relative z-30 flex items-center gap-1",
          inlineImage
            ? "flex-wrap"
            : orientation === "inline"
              ? "shrink-0 ml-auto pr-4"
              : "flex-wrap px-4 pt-3",
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = "CardFooter";

export {
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};

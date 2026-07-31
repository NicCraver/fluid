"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { CardLink } from "./card-helpers";
import type {
  CardButtonProps,
  CardButtonVariant,
  CardFeatureProps,
} from "./card-types";
import { fontWeights } from "~/lib/font-weight";
import { useIcon } from "~/lib/icon-context";
import { useShape } from "~/lib/shape-context";
import { cn } from "~/lib/utils";

const CardEyebrow = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    data-slot="card-eyebrow"
    className={cn(
      "text-[11px] uppercase tracking-wide text-muted-foreground",
      className
    )}
    style={{ fontVariationSettings: fontWeights.semibold }}
    {...props}
  />
));

CardEyebrow.displayName = "CardEyebrow";

function CardFeature({ icon: Icon, title, description }: CardFeatureProps) {
  return (
    <div data-slot="card-feature" className="flex items-start gap-2.5">
      {Icon && (
        <Icon
          size={16}
          strokeWidth={1.5}
          className="mt-0.5 shrink-0 text-muted-foreground"
        />
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-[13px] text-foreground [text-box:trim-both_cap_alphabetic]"
          style={{ fontVariationSettings: fontWeights.medium }}
        >
          {title}
        </span>
        {description && (
          <span className="text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}

const CARD_BUTTON_VARIANTS: Record<CardButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80",
  secondary:
    "bg-accent text-foreground hover:bg-accent/80 active:bg-accent",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-hover active:bg-active",
  link: "text-foreground underline-offset-4 hover:underline !px-0 !h-auto",
};

function CardButton({
  children,
  onClick,
  href,
  variant = "ghost",
  icon: Icon,
  iconPosition,
  external = false,
  disabled = false,
}: CardButtonProps) {
  const shape = useShape();
  const ArrowRight = useIcon("arrow-right");
  const position = iconPosition ?? (external ? "end" : "start");
  const glyph = Icon ? (
    <Icon
      size={14}
      strokeWidth={1.5}
      className="shrink-0 transition-[stroke-width] duration-80 group-hover/action:stroke-[2]"
    />
  ) : null;
  const externalGlyph = external ? (
    <ArrowRight
      size={13}
      strokeWidth={1.5}
      className="shrink-0 -rotate-45 transition-[stroke-width] duration-80 group-hover/action:stroke-[2]"
    />
  ) : null;
  const inner = (
    <>
      {position === "start" && glyph}
      <span className="[text-box:trim-both_cap_alphabetic]">{children}</span>
      {position === "end" && glyph}
      {externalGlyph}
    </>
  );
  const classes = cn(
    "group/action relative z-30 inline-flex items-center justify-center gap-1.5 h-7 px-2.5 text-[12px] cursor-pointer outline-none",
    "transition-colors duration-80",
    "focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]",
    "disabled:opacity-50 disabled:pointer-events-none",
    shape.button,
    CARD_BUTTON_VARIANTS[variant]
  );

  if (href) {
    return (
      <CardLink
        href={href}
        onClick={onClick}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={classes}
        style={{ fontVariationSettings: fontWeights.medium }}
      >
        {inner}
      </CardLink>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      style={{ fontVariationSettings: fontWeights.medium }}
    >
      {inner}
    </button>
  );
}

export { CardButton, CardEyebrow, CardFeature };

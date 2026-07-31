"use client";

import { useContext } from "react";
import { CardContext } from "./card-context";
import type { CardImageProps, CardMediaProps } from "./card-types";
import { useShape } from "~/lib/shape-context";
import { cn } from "~/lib/utils";

/** A leading icon, brand logo, or connected logo pair. */
function CardMedia({
  logo,
  logoAlt,
  icon: Icon,
  size = 22,
  className,
}: CardMediaProps) {
  const { orientation } = useContext(CardContext);
  const shape = useShape();
  const wrap = cn(orientation === "inline" ? "" : "mb-2", className);

  if (logo) {
    const logos = Array.isArray(logo)
      ? [
          { position: "primary", src: logo[0] },
          { position: "secondary", src: logo[1] },
        ]
      : [{ position: "primary", src: logo }];

    return (
      <span
        data-slot="card-media"
        className={cn("inline-flex items-center gap-1.5 shrink-0", wrap)}
      >
        {logos.map(({ position, src }) => (
          <span
            key={`${position}-${src}`}
            className="inline-flex items-center gap-1.5"
          >
            {position === "secondary" && (
              <span aria-hidden className="w-2 h-px bg-border" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={logoAlt ?? ""}
              width={size}
              height={size}
              className={cn("object-contain", shape.bg)}
              style={{ width: size, height: size }}
            />
          </span>
        ))}
      </span>
    );
  }

  if (Icon) {
    return (
      <span
        data-slot="card-media"
        className={cn(
          "inline-flex items-center justify-center shrink-0 size-8 bg-hover",
          shape.bg,
          wrap
        )}
      >
        <Icon size={18} strokeWidth={1.5} className="text-muted-foreground" />
      </span>
    );
  }

  return null;
}

/** A full-bleed banner or leading card image. */
function CardImage({ src, alt, className }: CardImageProps) {
  const { orientation } = useContext(CardContext);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      data-slot="card-image"
      className={cn(
        "object-cover rounded-[2px]",
        orientation === "inline"
          ? "size-40 shrink-0"
          : "w-full aspect-[16/9]",
        className
      )}
    />
  );
}

CardImage.displayName = "CardImage";

export { CardImage, CardMedia };

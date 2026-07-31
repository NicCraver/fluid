"use client";

import { isValidElement, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { CardImage } from "./card-media";

export function CardLink({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  if (props.target === "_blank" || /^https?:\/\//.test(href)) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink to={href} {...props}>
      {children}
    </RouterLink>
  );
}

export function isCardImage(child: ReactNode) {
  return (
    isValidElement(child) &&
    (child.type === CardImage ||
      (child.type as { displayName?: string })?.displayName === "CardImage")
  );
}

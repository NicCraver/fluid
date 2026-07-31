import type { HTMLAttributes, ReactNode } from "react";
import type { IconComponent } from "~/lib/icon-context";

export type CardOrientation = "card" | "inline";
export type CardBorder = "none" | "outlined";

export interface CardGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
  /** Index of the persistently-selected card, or -1. */
  selectedIndex: number;
  orientation: CardOrientation;
  columns: number;
  count: number;
  /** Individual cards carry their own border/tile shape. */
  separated: boolean;
  /** Inner hairline dividers are drawn between adjacent cards. */
  divided: boolean;
  outlined: boolean;
}

export interface CardContextValue {
  emphasized: boolean;
  orientation: CardOrientation;
  clickable: boolean;
  /** Whether the card contains a full CardImage. */
  hasImage: boolean;
}

export interface CardGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onDrag"> {
  /** How each card lays its content out. @default "card" */
  orientation?: CardOrientation;
  /** Number of grid columns. @default 1 */
  columns?: number;
  /** Whether to draw an outline. @default "none" */
  border?: CardBorder;
  /** Split the group into individually-shaped cards. @default false */
  separated?: boolean;
  /** Enable the magnetic proximity-hover highlight. @default true */
  proximityHover?: boolean;
}

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onClick"> {
  /** Makes the whole card an interactive target. */
  onClick?: () => void;
  href?: string;
  external?: boolean;
  /** Accessible name for the stretched link/button. */
  label?: string;
  /** Persistent selected state. */
  selected?: boolean;
  disabled?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  /** Injected by CardGroup. */
  index?: number;
}

export type CardLogo = string | [string, string];

export interface CardMediaProps {
  logo?: CardLogo;
  logoAlt?: string;
  icon?: IconComponent;
  size?: number;
  className?: string;
}

export interface CardImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export interface CardFeatureProps {
  icon?: IconComponent;
  title: string;
  description?: string;
}

export type CardButtonVariant = "primary" | "secondary" | "ghost" | "link";

export interface CardButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: CardButtonVariant;
  icon?: IconComponent;
  iconPosition?: "start" | "end";
  /** Opens the href in a new tab and appends an outward arrow glyph. */
  external?: boolean;
  disabled?: boolean;
}

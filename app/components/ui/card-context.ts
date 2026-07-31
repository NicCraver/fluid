import { createContext } from "react";
import type {
  CardContextValue,
  CardGroupContextValue,
} from "./card-types";

export const CardGroupContext = createContext<CardGroupContextValue | null>(null);

export const CardContext = createContext<CardContextValue>({
  emphasized: false,
  orientation: "card",
  clickable: false,
  hasImage: false,
});

import type { BaseEditor } from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor } from "slate-react";

export type PKBElementType =
  | "paragraph"
  | "heading"
  | "subheading"
  | "list-item"
  | "numbered-list"
  | "bulleted-list"
  | "quote"
  | "divider"
  | "image"
  | "signature-container"
  | "signature-box"
  | "table"
  | "table-row"
  | "table-cell";

export type PKBElement = {
  type?: PKBElementType;
  align?: "left" | "center" | "right" | "justify";
  tableAlign?: "left" | "center" | "right";
  containerAlign?: "left" | "center" | "right";
  children: PKBDescendant[];
  colspan?: number;
  width?: number;
  src?: string;
  alt?: string;
};

export type PKBText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

export type PKBDescendant = PKBElement | PKBText;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: PKBElement;
    Text: PKBText;
  }
}

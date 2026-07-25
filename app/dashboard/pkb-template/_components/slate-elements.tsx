import { useFocused, useSelected } from "slate-react";
import { cn } from "@/lib/utils";

type ImageAlign = "left" | "center" | "right";
type SignatureAlign = "left" | "center" | "right";

export const Element = ({ attributes, children, element }: any) => {
  const style = element.align ? { textAlign: element.align } : undefined;
  switch (element.type) {
    case "image":
      return <ImageElement attributes={attributes} element={element}>{children}</ImageElement>;
    case "heading":
      return (
        <h2 className="text-xl font-semibold uppercase tracking-wide" style={style} {...attributes}>
          {children}
        </h2>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 border-zinc-300 pl-3 italic text-zinc-600" style={style} {...attributes}>
          {children}
        </blockquote>
      );
    case "numbered-list":
      return (
        <ol className="list-decimal pl-6" style={style} {...attributes}>
          {children}
        </ol>
      );
    case "bulleted-list":
      return (
        <ul className="list-disc pl-6" style={style} {...attributes}>
          {children}
        </ul>
      );
    case "list-item":
      return (
        <li className="mb-1" {...attributes}>
          {children}
        </li>
      );
    case "divider":
      return (
        <div {...attributes}>
          <hr className="my-4 border-2 border-zinc-700" />
          {children}
        </div>
      );
    case "table":
      const tableWidth = Math.min(100, Math.max(40, Number(element.width) || 100));
      const tableAlign = element.tableAlign || "center";
      const tablePositionStyle =
        tableAlign === "left"
          ? { marginLeft: 0, marginRight: "auto" }
          : tableAlign === "right"
            ? { marginLeft: "auto", marginRight: 0 }
            : { marginLeft: "auto", marginRight: "auto" };
      return (
        <table className="border border-zinc-400 mt-6" style={{ width: `${tableWidth}%`, ...tablePositionStyle }} {...attributes}>
          <tbody>{children}</tbody>
        </table>
      );
    case "table-row":
      return <tr {...attributes}>{children}</tr>;
    case "table-cell":
      return (
        <td className="border border-zinc-400 text-center py-6" colSpan={element.colspan ?? 1} {...attributes}>
          {children}
        </td>
      );
    case "signature-container": {
      const width = Math.min(100, Math.max(40, Number(element.width) || 100));
      const align = (element.containerAlign || "center") as SignatureAlign;
      const positionStyle =
        align === "left"
          ? { marginLeft: 0, marginRight: "auto" }
          : align === "right"
            ? { marginLeft: "auto", marginRight: 0 }
            : { marginLeft: "auto", marginRight: "auto" };

      return (
        <div
          className="mt-6 grid grid-cols-2 gap-6"
          style={{ width: `${width}%`, ...positionStyle }}
          {...attributes}
        >
          {children}
        </div>
      );
    }
    case "signature-box":
      return (
        <div className="flex min-h-[130px] flex-col justify-between rounded-md border border-zinc-500 px-3 py-4" {...attributes}>
          {children}
        </div>
      );
    default:
      return (
        <p className="leading-relaxed" style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

export function ImageElement({ attributes, children, element }: any) {
  const selected = useSelected();
  const focused = useFocused();
  const width = Math.min(720, Math.max(40, Number(element.width) || 120));
  const align = (element.align || "center") as ImageAlign;

  return (
    <div {...attributes}>
      <div
        contentEditable={false}
        className={cn(
          "my-3",
          align === "left" && "text-left",
          align === "center" && "text-center",
          align === "right" && "text-right"
        )}
      >
        {/* Border shown only when image is currently selected in Slate */}
        <img
          src={element.src}
          alt={element.alt || "PKB image"}
          style={{ width, maxWidth: "100%", height: "auto", display: "inline-block" }}
          className={cn(selected && focused ? "ring-2 ring-blue-500" : "ring-0")}
        />
      </div>
      {children}
    </div>
  );
}

export const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  if (leaf.underline) {
    children = <u>{children}</u>;
  }
  if (leaf.code) {
    children = <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs font-semibold">{children}</code>;
  }
  return (
    <span {...attributes}>
      {children}
    </span>
  );
};

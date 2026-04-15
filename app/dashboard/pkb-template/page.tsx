"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { createEditor, Descendant, Editor, Element as SlateElement, Text, Transforms } from "slate";
import { Editable, ReactEditor, Slate, useFocused, useSelected, withReact } from "slate-react";
import { withHistory } from "slate-history";
import { Button } from "@/components/ui/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/display/card";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Columns,
  Bold,
  Braces,
  Grid2X2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  ImagePlus,
  Rows,
  RotateCcw,
  Save,
  Square,
  Underline,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PKB_PLACEHOLDERS } from "@/lib/pkb-placeholders";
import { DEFAULT_PKB_TEMPLATE_NODES } from "@/lib/pkb-template-default";
import { cn } from "@/lib/utils";

const LIST_TYPES = ["numbered-list", "bulleted-list"] as const;

type BlockType = typeof LIST_TYPES[number] | "paragraph" | "heading" | "quote";

const cloneDefaultTemplate = () =>
  JSON.parse(JSON.stringify(DEFAULT_PKB_TEMPLATE_NODES)) as Descendant[];

type Alignment = "left" | "center" | "right" | "justify";

type ImageAlign = "left" | "center" | "right";
type TableAlign = "left" | "center" | "right";
type SignatureAlign = "left" | "center" | "right";

const STRUCTURE_ELEMENT_TYPES = new Set([
  "table",
  "table-row",
  "table-cell",
  "signature-container",
  "signature-box",
]);

const isTableStructureElement = (node: unknown) =>
  SlateElement.isElement(node) && STRUCTURE_ELEMENT_TYPES.has(node.type as string);

const sanitizeTableCell = (node: any) => {
  const children = Array.isArray(node?.children)
    ? node.children.map((child: any) => sanitizeNode(child))
    : [{ text: "" }];
  return {
    ...node,
    type: "table-cell",
    children: children.length ? children : [{ text: "" }],
  };
};

const sanitizeTableRow = (node: any) => {
  const rawChildren = Array.isArray(node?.children) ? node.children : [];
  const cells = rawChildren.map((child: any) => {
    if (SlateElement.isElement(child) && child.type === "table-cell") {
      return sanitizeTableCell(child);
    }

    if (Text.isText(child)) {
      return {
        type: "table-cell",
        children: [{ text: child.text || "" }],
      };
    }

    return {
      type: "table-cell",
      children: [sanitizeNode(child)],
    };
  });

  return {
    ...node,
    type: "table-row",
    children: cells.length ? cells : [{ type: "table-cell", children: [{ text: "" }] }],
  };
};

const sanitizeTable = (node: any) => {
  const rawChildren = Array.isArray(node?.children) ? node.children : [];
  const rows = rawChildren.map((child: any) => {
    if (SlateElement.isElement(child) && child.type === "table-row") {
      return sanitizeTableRow(child);
    }

    return {
      type: "table-row",
      children: [{ type: "table-cell", children: [sanitizeNode(child)] }],
    };
  });

  return {
    ...node,
    type: "table",
    children: rows.length ? rows : [{ type: "table-row", children: [{ type: "table-cell", children: [{ text: "" }] }] }],
  };
};

const sanitizeNode = (node: any): any => {
  if (Text.isText(node)) {
    return node;
  }

  if (!SlateElement.isElement(node)) {
    return { text: "" };
  }

  if (node.type === "table") {
    return sanitizeTable(node);
  }

  if (node.type === "table-row") {
    return sanitizeTableRow(node);
  }

  if (node.type === "table-cell") {
    return sanitizeTableCell(node);
  }

  const children = Array.isArray(node.children) ? node.children.map((child: any) => sanitizeNode(child)) : [{ text: "" }];
  return {
    ...node,
    children: children.length ? children : [{ text: "" }],
  };
};

const sanitizeTemplateNodes = (nodes: Descendant[]) => nodes.map((node) => sanitizeNode(node)) as Descendant[];

const withImages = <T extends Editor>(editor: T): T => {
  const { isVoid } = editor;
  editor.isVoid = (element) => {
    if (SlateElement.isElement(element) && element.type === "image") {
      return true;
    }
    return isVoid(element);
  };
  return editor;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Gagal membaca file gambar"));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.readAsDataURL(file);
  });

const insertImage = (editor: Editor, src: string, alt = "Logo perusahaan") => {
  const imageNode: Descendant = {
    type: "image",
    src,
    alt,
    width: 120,
    align: "center",
    children: [{ text: "" }],
  } as Descendant;

  Transforms.insertNodes(editor, imageNode);
  Transforms.insertNodes(editor, { type: "paragraph", children: [{ text: "" }] } as Descendant);
};

const getCurrentImageEntry = (editor: Editor) =>
  Editor.above(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "image",
  });

const getCurrentTableEntry = (editor: Editor) =>
  Editor.above(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "table",
  });

const setImageWidth = (editor: Editor, width: number) => {
  const entry = getCurrentImageEntry(editor);
  if (!entry) return false;
  const [, path] = entry;
  Transforms.setNodes(editor, { width }, { at: path });
  return true;
};

const setImageAlign = (editor: Editor, align: ImageAlign) => {
  const entry = getCurrentImageEntry(editor);
  if (!entry) return false;
  const [, path] = entry;
  Transforms.setNodes(editor, { align }, { at: path });
  return true;
};

const setTableWidth = (editor: Editor, width: number) => {
  const entry = getCurrentTableEntry(editor);
  if (!entry) return false;
  const [, path] = entry;
  Transforms.setNodes(editor, { width }, { at: path });
  return true;
};

const setTableAlign = (editor: Editor, tableAlign: TableAlign) => {
  const entry = getCurrentTableEntry(editor);
  if (!entry) return false;
  const [, path] = entry;
  Transforms.setNodes(editor, { tableAlign }, { at: path });
  return true;
};

const getCurrentSignatureEntry = (editor: Editor) =>
  Editor.above(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === "signature-container",
  });

const setSignatureWidth = (editor: Editor, width: number) => {
  const entry = getCurrentSignatureEntry(editor);
  if (!entry) return false;
  const [, path] = entry;
  Transforms.setNodes(editor, { width }, { at: path });
  return true;
};

const setSignatureAlign = (editor: Editor, containerAlign: SignatureAlign) => {
  const entry = getCurrentSignatureEntry(editor);
  if (!entry) return false;
  const [, path] = entry;
  Transforms.setNodes(editor, { containerAlign }, { at: path });
  return true;
};

const createTableCell = (): Descendant => ({
  type: "table-cell",
  children: [{ text: "" }],
}) as Descendant;

const createTableRow = (columns: number): Descendant => ({
  type: "table-row",
  children: Array.from({ length: columns }).map(() => createTableCell()),
}) as Descendant;

const insertTable = (editor: Editor, rows = 3, columns = 2) => {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, columns);
  const tableNode: Descendant = {
    type: "table",
    width: 100,
    tableAlign: "center",
    children: Array.from({ length: safeRows }).map(() => createTableRow(safeCols)),
  } as Descendant;

  Transforms.insertNodes(editor, tableNode);
  Transforms.insertNodes(editor, { type: "paragraph", children: [{ text: "" }] } as Descendant);
};

const insertSignatureBoxes = (editor: Editor) => {
  const signatureNode: Descendant = {
    type: "signature-container",
    width: 100,
    containerAlign: "center",
    children: [
      {
        type: "signature-box",
        children: [
          { type: "paragraph", align: "center", children: [{ text: "Pihak I" }] },
          { type: "paragraph", align: "center", children: [{ text: "" }] },
          { type: "paragraph", align: "center", children: [{ text: "{{PIHAK_1_TTD}}" }] },
        ],
      },
      {
        type: "signature-box",
        children: [
          { type: "paragraph", align: "center", children: [{ text: "Pihak II" }] },
          { type: "paragraph", align: "center", children: [{ text: "" }] },
          { type: "paragraph", align: "center", children: [{ text: "{{PIHAK_2_TTD}}" }] },
        ],
      },
    ],
  } as Descendant;

  Transforms.insertNodes(editor, signatureNode);
  Transforms.insertNodes(editor, { type: "paragraph", children: [{ text: "" }] } as Descendant);
};

const addTableRow = (editor: Editor) => {
  const entry = getCurrentTableEntry(editor);
  if (!entry) return false;

  const [tableNode, tablePath] = entry as [any, any];
  const firstRow = tableNode.children?.[0];
  const columns = Math.max(1, firstRow?.children?.length || 1);
  const newRow = createTableRow(columns);
  const insertPath = [...tablePath, tableNode.children.length];

  Transforms.insertNodes(editor, newRow, { at: insertPath });
  return true;
};

const addTableColumn = (editor: Editor) => {
  const entry = getCurrentTableEntry(editor);
  if (!entry) return false;

  const [tableNode, tablePath] = entry as [any, any];
  const rows = tableNode.children || [];
  if (!rows.length) return false;

  rows.forEach((row: any, rowIndex: number) => {
    const targetPath = [...tablePath, rowIndex, row.children.length];
    Transforms.insertNodes(editor, createTableCell(), { at: targetPath });
  });

  return true;
};

const isBlockActive = (editor: Editor, format: BlockType) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });
  return !!match;
};

const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  // @ts-expect-error dynamic access of Slate marks
  return marks ? Boolean(marks[format]) : false;
};

const toggleMark = (editor: Editor, format: string) => {
  if (isMarkActive(editor, format)) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const toggleBlock = (editor: Editor, format: BlockType) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format as typeof LIST_TYPES[number]);

  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && LIST_TYPES.includes(n.type as typeof LIST_TYPES[number]),
    split: true,
  });

  const newType = isActive ? "paragraph" : isList ? "list-item" : format;
  Transforms.setNodes(
    editor,
    { type: newType },
    {
      match: (n) =>
        SlateElement.isElement(n) &&
        Editor.isBlock(editor, n) &&
        !isTableStructureElement(n) &&
        n.type !== "image",
    }
  );

  if (!isActive && isList) {
    const block = { type: format, children: [] as Descendant[] };
    Transforms.wrapNodes(editor, block);
  }
};

const setAlignment = (editor: Editor, align: Alignment) => {
  Transforms.setNodes(
    editor,
    { align },
    {
      match: (n) =>
        SlateElement.isElement(n) &&
        Editor.isBlock(editor, n) &&
        !isTableStructureElement(n),
    }
  );
};

const isAlignActive = (editor: Editor, align: Alignment) => {
  const [match] = Editor.nodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.align === align,
  });
  return !!match;
};

const Element = ({ attributes, children, element }: any) => {
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
        <blockquote className="border-l-4 border-slate-300 pl-3 italic text-slate-600" style={style} {...attributes}>
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
          <hr className="my-4 border-2 border-slate-700" />
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
        <table className="border border-slate-400 mt-6" style={{ width: `${tableWidth}%`, ...tablePositionStyle }} {...attributes}>
          <tbody>{children}</tbody>
        </table>
      );
    case "table-row":
      return <tr {...attributes}>{children}</tr>;
    case "table-cell":
      return (
        <td className="border border-slate-400 text-center py-6" colSpan={element.colspan ?? 1} {...attributes}>
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
        <div className="flex min-h-[130px] flex-col justify-between rounded-md border border-slate-500 px-3 py-4" {...attributes}>
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

function ImageElement({ attributes, children, element }: any) {
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

const Leaf = ({ attributes, children, leaf }: any) => {
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
    children = <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-semibold">{children}</code>;
  }
  return (
    <span {...attributes}>
      {children}
    </span>
  );
};

export default function PKBTemplateEditorPage() {
  const editor = useMemo(() => withImages(withHistory(withReact(createEditor()))), []);
  const initialTemplate = useMemo(() => cloneDefaultTemplate(), []);
  const [value, setValue] = useState<Descendant[]>(initialTemplate);
  const [editorKey, setEditorKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [activeImage, setActiveImage] = useState<{ width: number; align: ImageAlign } | null>(null);
  const [activeTable, setActiveTable] = useState<{ width: number; tableAlign: TableAlign } | null>(null);
  const [activeSignature, setActiveSignature] = useState<{ width: number; containerAlign: SignatureAlign } | null>(null);
  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  const syncActiveSelection = useCallback(() => {
    const imageEntry = getCurrentImageEntry(editor)?.[0] as any;
    if (imageEntry) {
      setActiveImage({
        width: Math.min(320, Math.max(40, Number(imageEntry.width) || 120)),
        align: (imageEntry.align || "center") as ImageAlign,
      });
    } else {
      setActiveImage(null);
    }

    const tableEntry = getCurrentTableEntry(editor)?.[0] as any;
    if (tableEntry) {
      setActiveTable({
        width: Math.min(100, Math.max(40, Number(tableEntry.width) || 100)),
        tableAlign: (tableEntry.tableAlign || "center") as TableAlign,
      });
    } else {
      setActiveTable(null);
    }

    const signatureEntry = getCurrentSignatureEntry(editor)?.[0] as any;
    if (signatureEntry) {
      setActiveSignature({
        width: Math.min(100, Math.max(40, Number(signatureEntry.width) || 100)),
        containerAlign: (signatureEntry.containerAlign || "center") as SignatureAlign,
      });
    } else {
      setActiveSignature(null);
    }
  }, [editor]);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/pkb/template");
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "Gagal memuat template");
        }
        const data = await res.json();
        setValue(
          sanitizeTemplateNodes(Array.isArray(data?.content) ? data.content : cloneDefaultTemplate())
        );
        setEditorKey((key) => key + 1);
        setUpdatedAt(data?.updatedAt ?? "");
        setDirty(false);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat template");
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError("");
      const res = await fetch("/api/pkb/template", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: sanitizeTemplateNodes(value) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Gagal menyimpan template");
      }
      const data = await res.json();
      setUpdatedAt(data?.updatedAt ?? new Date().toISOString());
      setDirty(false);
      setSuccess("Template PKB berhasil disimpan.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  }, [value]);

  const handleReset = useCallback(async () => {
    if (!window.confirm("Yakin ingin mengembalikan template ke versi default?")) return;
    try {
      setSaving(true);
      const res = await fetch("/api/pkb/template", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Gagal me-reset template");
      }
      const data = await res.json();
      setValue(
        sanitizeTemplateNodes(Array.isArray(data?.content) ? data.content : cloneDefaultTemplate())
      );
      setEditorKey((key) => key + 1);
      setUpdatedAt(data?.updatedAt ?? new Date().toISOString());
      setDirty(false);
      setSuccess("Template dikembalikan ke bawaan pabrik.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal me-reset template");
    } finally {
      setSaving(false);
    }
  }, []);

  const insertPlaceholder = useCallback(
    (key: string) => {
      Transforms.insertText(editor, `{{${key}}}`);
      setDirty(true);
    },
    [editor]
  );

  const insertImageFromFile = useCallback(
    async (file: File) => {
      try {
        setImageUploading(true);
        const dataUrl = await fileToDataUrl(file);
        insertImage(editor, dataUrl, file.name || "Logo perusahaan");
        setDirty(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal upload gambar");
      } finally {
        setImageUploading(false);
      }
    },
    [editor]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    switch (event.key.toLowerCase()) {
      case "b":
        event.preventDefault();
        toggleMark(editor, "bold");
        break;
      case "i":
        event.preventDefault();
        toggleMark(editor, "italic");
        break;
      case "u":
        event.preventDefault();
        toggleMark(editor, "underline");
        break;
      default:
        break;
    }
  };

  const statusLabel = updatedAt
    ? new Date(updatedAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })
    : "Belum pernah disimpan";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editor Template PKB</h1>
          <p className="text-sm text-slate-500">Template ini dipakai otomatis di Step 2 saat mencetak PKB.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-slate-500">
            Terakhir disimpan:
            <span className="font-semibold text-slate-700"> {statusLabel}</span>
            {dirty && <span className="ml-2 text-amber-600">(Perubahan belum disimpan)</span>}
          </div>
          <Button variant="outline" onClick={handleReset} disabled={loading || saving}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Default
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !dirty}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" /> Simpan Template
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Dokumen PKB</CardTitle>
            <CardDescription>
              Semua perubahan tersimpan sebagai template tunggal. Area edit sudah mengikuti kertas A4 agar posisi konten di editor lebih sama dengan hasil export/print.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-96 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat template...
              </div>
            ) : (
              <Slate
                key={editorKey}
                editor={editor}
                initialValue={value}
                onChange={(next) => {
                  setValue(next);
                  syncActiveSelection();
                  const hasDocumentChange = editor.operations.some((op) => op.type !== "set_selection");
                  if (hasDocumentChange) {
                    setDirty(true);
                  }
                }}
              >
                <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-slate-50 p-2 shadow-inner">
                  <ToolbarButton icon={Bold} label="Bold" active={isMarkActive(editor, "bold")} onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "bold"); }} />
                  <ToolbarButton icon={Italic} label="Italic" active={isMarkActive(editor, "italic")} onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "italic"); }} />
                  <ToolbarButton icon={Underline} label="Underline" active={isMarkActive(editor, "underline")} onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "underline"); }} />
                  <ToolbarButton icon={ListOrdered} label="Numbered" active={isBlockActive(editor, "numbered-list")} onMouseDown={(e) => { e.preventDefault(); toggleBlock(editor, "numbered-list"); }} />
                  <ToolbarButton icon={List} label="Bullet" active={isBlockActive(editor, "bulleted-list")} onMouseDown={(e) => { e.preventDefault(); toggleBlock(editor, "bulleted-list"); }} />
                  <ToolbarButton icon={AlignLeft} label="Left" active={isAlignActive(editor, "left")} onMouseDown={(e) => { e.preventDefault(); setAlignment(editor, "left"); }} />
                  <ToolbarButton icon={AlignCenter} label="Center" active={isAlignActive(editor, "center")} onMouseDown={(e) => { e.preventDefault(); setAlignment(editor, "center"); }} />
                  <ToolbarButton icon={AlignRight} label="Right" active={isAlignActive(editor, "right")} onMouseDown={(e) => { e.preventDefault(); setAlignment(editor, "right"); }} />
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const inputEl = event.currentTarget;
                        const file = inputEl.files?.[0];
                        if (!file) return;
                        await insertImageFromFile(file);
                        inputEl.value = "";
                      }}
                    />
                    <span
                      role="button"
                      aria-label="Upload Image"
                      className={cn(
                        "flex h-9 items-center rounded-md border px-3 text-sm transition cursor-pointer",
                        "border-slate-200 text-slate-500 hover:border-slate-400"
                      )}
                    >
                      {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    </span>
                  </label>
                  <ToolbarButton
                    icon={Grid2X2}
                    label="Tambah Tabel"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertTable(editor, 3, 2);
                      setDirty(true);
                    }}
                  />
                  <ToolbarButton
                    icon={Square}
                    label="Tambah Box TTD"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertSignatureBoxes(editor);
                      setDirty(true);
                    }}
                  />
                </div>

                <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-700">Image aktif:</span>
                    <span>{activeImage ? "Ya" : "Pilih gambar dulu"}</span>
                    <input
                      type="range"
                      min={40}
                      max={320}
                      step={10}
                      value={activeImage?.width ?? 120}
                      disabled={!activeImage}
                      onChange={(event) => {
                        const changed = setImageWidth(editor, Number(event.target.value));
                        if (changed) setDirty(true);
                      }}
                    />
                    <span>{activeImage?.width ?? 120}px</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeImage}
                      onClick={() => {
                        const changed = setImageAlign(editor, "left");
                        if (changed) setDirty(true);
                      }}
                    >
                      Kiri
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeImage}
                      onClick={() => {
                        const changed = setImageAlign(editor, "center");
                        if (changed) setDirty(true);
                      }}
                    >
                      Tengah
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeImage}
                      onClick={() => {
                        const changed = setImageAlign(editor, "right");
                        if (changed) setDirty(true);
                      }}
                    >
                      Kanan
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-700">Tabel aktif:</span>
                    <span>{activeTable ? "Ya" : "Pilih area tabel dulu"}</span>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      step={5}
                      value={activeTable?.width ?? 100}
                      disabled={!activeTable}
                      onChange={(event) => {
                        const changed = setTableWidth(editor, Number(event.target.value));
                        if (changed) setDirty(true);
                      }}
                    />
                    <span>{activeTable?.width ?? 100}%</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeTable}
                      onClick={() => {
                        const changed = setTableAlign(editor, "left");
                        if (changed) setDirty(true);
                      }}
                    >
                      Kiri
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeTable}
                      onClick={() => {
                        const changed = setTableAlign(editor, "center");
                        if (changed) setDirty(true);
                      }}
                    >
                      Tengah
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeTable}
                      onClick={() => {
                        const changed = setTableAlign(editor, "right");
                        if (changed) setDirty(true);
                      }}
                    >
                      Kanan
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeTable}
                      onClick={() => {
                        const changed = addTableRow(editor);
                        if (changed) setDirty(true);
                      }}
                    >
                      <Rows className="mr-1 h-4 w-4" /> Tambah Baris
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeTable}
                      onClick={() => {
                        const changed = addTableColumn(editor);
                        if (changed) setDirty(true);
                      }}
                    >
                      <Columns className="mr-1 h-4 w-4" /> Tambah Kolom
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-slate-700">Box TTD aktif:</span>
                    <span>{activeSignature ? "Ya" : "Pilih area box tanda tangan"}</span>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      step={5}
                      value={activeSignature?.width ?? 100}
                      disabled={!activeSignature}
                      onChange={(event) => {
                        const changed = setSignatureWidth(editor, Number(event.target.value));
                        if (changed) setDirty(true);
                      }}
                    />
                    <span>{activeSignature?.width ?? 100}%</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeSignature}
                      onClick={() => {
                        const changed = setSignatureAlign(editor, "left");
                        if (changed) setDirty(true);
                      }}
                    >
                      Kiri
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeSignature}
                      onClick={() => {
                        const changed = setSignatureAlign(editor, "center");
                        if (changed) setDirty(true);
                      }}
                    >
                      Tengah
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!activeSignature}
                      onClick={() => {
                        const changed = setSignatureAlign(editor, "right");
                        if (changed) setDirty(true);
                      }}
                    >
                      Kanan
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
                  <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-200/70 p-4">
                    <div className="relative mx-auto h-[297mm] w-[210mm] overflow-hidden rounded-md bg-white shadow-xl">
                      <div className="pointer-events-none absolute inset-[12mm] border border-dashed border-slate-300" />

                      <div
                        className="absolute inset-[12mm] overflow-y-auto p-6"
                        style={{
                          fontFamily: "'Times New Roman', Times, serif",
                          fontSize: "12px",
                          lineHeight: 1.6,
                        }}
                      >
                        <Editable
                          renderElement={renderElement}
                          renderLeaf={renderLeaf}
                          spellCheck={false}
                          autoFocus
                          className="pkb-editable min-h-full"
                          onKeyDown={onKeyDown}
                          onDrop={async (event) => {
                            const files = Array.from(event.dataTransfer?.files ?? []);
                            const imageFile = files.find((file) => file.type.startsWith("image/"));
                            if (!imageFile) return;

                            event.preventDefault();
                            const range = ReactEditor.findEventRange(editor, event);
                            if (range) {
                              Transforms.select(editor, range);
                            }
                            await insertImageFromFile(imageFile);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Slate>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Placeholder Dinamis</CardTitle>
            <CardDescription>
              Gunakan placeholder untuk mengganti nilai otomatis saat Step 2 berjalan. Klik tombol di samping label untuk memasukkan token ke posisi kursor.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {PKB_PLACEHOLDERS.map((placeholder) => (
              <div key={placeholder.key} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{placeholder.label}</p>
                  <p className="text-xs text-slate-500">{`{{${placeholder.key}}}`} &middot; {placeholder.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => insertPlaceholder(placeholder.key)}
                >
                  <Braces className="mr-1 h-4 w-4" /> Sisipkan
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catatan Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <ul className="list-disc space-y-1 pl-5">
            <li>Template ini disimpan dalam database SQLite lokal agar dapat dengan mudah dipanggil ulang.</li>
            <li>Step 2 (Print PKB) akan selalu mengambil versi terbaru yang telah disimpan.</li>
            <li>Anda dapat upload gambar lewat toolbar atau drag file gambar langsung ke area dokumen.</li>
            <li>Klik gambar atau tabel untuk mengaktifkan kontrol ukuran dan posisi di panel atas editor.</li>
            <li>Jika Anda menambahkan placeholder baru, pastikan nama variabel sesuai daftar di samping.</li>
            <li>Gunakan tombol Reset jika ingin kembali ke format standar perusahaan.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  active?: boolean;
};

function ToolbarButton({ icon: Icon, label, active, className, ...props }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex h-9 items-center rounded-md border px-3 text-sm transition",
        active ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-500 hover:border-slate-400",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createEditor, Descendant, Editor, Element as SlateElement, Text, Transforms } from "slate";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
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
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import { DEFAULT_PKB_TEMPLATE_NODES } from "@/lib/pkb-template-default";

import { Element, Leaf } from "./_components/slate-elements";
import { EditorToolbar } from "./_components/editor-toolbar";
import { PlaceholderPanel } from "./_components/placeholder-panel";
import { UsageNotesCard } from "./_components/usage-notes-card";

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
          <p className="text-sm text-zinc-500">Template ini dipakai otomatis di Step 2 saat mencetak PKB.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-zinc-500">
            Terakhir disimpan:
            <span className="font-semibold text-zinc-700"> {statusLabel}</span>
            {dirty && <span className="ml-2 text-zinc-600">(Perubahan belum disimpan)</span>}
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
              <div className="flex h-96 items-center justify-center text-zinc-500">
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
                <EditorToolbar
                  editor={editor}
                  imageUploading={imageUploading}
                  activeImage={activeImage}
                  activeTable={activeTable}
                  activeSignature={activeSignature}
                  isMarkActive={isMarkActive}
                  isBlockActive={(ed, fmt) => isBlockActive(ed, fmt as BlockType)}
                  isAlignActive={(ed, align) => isAlignActive(ed, align as Alignment)}
                  toggleMark={toggleMark}
                  toggleBlock={(ed, fmt) => toggleBlock(ed, fmt as BlockType)}
                  setAlignment={(ed, align) => setAlignment(ed, align as Alignment)}
                  onInsertImageFromFile={insertImageFromFile}
                  onSetImageWidth={(width) => setImageWidth(editor, width)}
                  onSetImageAlign={(align) => setImageAlign(editor, align)}
                  onInsertTable={() => { insertTable(editor, 3, 2); }}
                  onSetTableWidth={(width) => setTableWidth(editor, width)}
                  onSetTableAlign={(align) => setTableAlign(editor, align)}
                  onAddTableRow={() => addTableRow(editor)}
                  onAddTableColumn={() => addTableColumn(editor)}
                  onInsertSignature={() => { insertSignatureBoxes(editor); }}
                  onSetSignatureWidth={(width) => setSignatureWidth(editor, width)}
                  onSetSignatureAlign={(align) => setSignatureAlign(editor, align)}
                  onSetDirty={setDirty}
                />

                <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4">
                  <div className="overflow-auto rounded-xl border border-zinc-200 bg-zinc-200/70 p-4">
                    <div className="relative mx-auto h-[297mm] w-[210mm] overflow-hidden rounded-md bg-white shadow-xl">
                      <div className="pointer-events-none absolute inset-[12mm] border border-dashed border-zinc-300" />

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

        <PlaceholderPanel onInsertPlaceholder={insertPlaceholder} />
      </div>

      <UsageNotesCard />
    </div>
  );
}

import type { ButtonHTMLAttributes } from "react";
import { Editor, Element as SlateElement } from "slate";
import { Button } from "@/components/ui/form/button";
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
  Square,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageAlign = "left" | "center" | "right";
type TableAlign = "left" | "center" | "right";
type SignatureAlign = "left" | "center" | "right";

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  active?: boolean;
};

export function ToolbarButton({ icon: Icon, label, active, className, ...props }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex h-9 items-center rounded-md border px-3 text-sm transition",
        active ? "border-zinc-500 bg-zinc-50 text-zinc-700" : "border-zinc-200 text-zinc-500 hover:border-zinc-400",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

type EditorToolbarProps = {
  editor: Editor;
  imageUploading: boolean;
  activeImage: { width: number; align: ImageAlign } | null;
  activeTable: { width: number; tableAlign: TableAlign } | null;
  activeSignature: { width: number; containerAlign: SignatureAlign } | null;
  // Mark / block helpers
  isMarkActive: (editor: Editor, format: string) => boolean;
  isBlockActive: (editor: Editor, format: string) => boolean;
  isAlignActive: (editor: Editor, align: string) => boolean;
  toggleMark: (editor: Editor, format: string) => void;
  toggleBlock: (editor: Editor, format: string) => void;
  setAlignment: (editor: Editor, align: string) => void;
  // Image controls
  onInsertImageFromFile: (file: File) => void;
  onSetImageWidth: (width: number) => boolean;
  onSetImageAlign: (align: ImageAlign) => boolean;
  // Table controls
  onInsertTable: () => void;
  onSetTableWidth: (width: number) => boolean;
  onSetTableAlign: (align: TableAlign) => boolean;
  onAddTableRow: () => boolean;
  onAddTableColumn: () => boolean;
  // Signature controls
  onInsertSignature: () => void;
  onSetSignatureWidth: (width: number) => boolean;
  onSetSignatureAlign: (align: SignatureAlign) => boolean;
  // General
  onSetDirty: (dirty: boolean) => void;
};

export function EditorToolbar({
  editor,
  imageUploading,
  activeImage,
  activeTable,
  activeSignature,
  isMarkActive: checkMarkActive,
  isBlockActive: checkBlockActive,
  isAlignActive: checkAlignActive,
  toggleMark: doToggleMark,
  toggleBlock: doToggleBlock,
  setAlignment: doSetAlignment,
  onInsertImageFromFile,
  onSetImageWidth,
  onSetImageAlign,
  onInsertTable,
  onSetTableWidth,
  onSetTableAlign,
  onAddTableRow,
  onAddTableColumn,
  onInsertSignature,
  onSetSignatureWidth,
  onSetSignatureAlign,
  onSetDirty,
}: EditorToolbarProps) {
  return (
    <>
      {/* Formatting toolbar */}
      <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-zinc-50 p-2 shadow-inner">
        <ToolbarButton icon={Bold} label="Bold" active={checkMarkActive(editor, "bold")} onMouseDown={(e) => { e.preventDefault(); doToggleMark(editor, "bold"); }} />
        <ToolbarButton icon={Italic} label="Italic" active={checkMarkActive(editor, "italic")} onMouseDown={(e) => { e.preventDefault(); doToggleMark(editor, "italic"); }} />
        <ToolbarButton icon={Underline} label="Underline" active={checkMarkActive(editor, "underline")} onMouseDown={(e) => { e.preventDefault(); doToggleMark(editor, "underline"); }} />
        <ToolbarButton icon={ListOrdered} label="Numbered" active={checkBlockActive(editor, "numbered-list")} onMouseDown={(e) => { e.preventDefault(); doToggleBlock(editor, "numbered-list"); }} />
        <ToolbarButton icon={List} label="Bullet" active={checkBlockActive(editor, "bulleted-list")} onMouseDown={(e) => { e.preventDefault(); doToggleBlock(editor, "bulleted-list"); }} />
        <ToolbarButton icon={AlignLeft} label="Left" active={checkAlignActive(editor, "left")} onMouseDown={(e) => { e.preventDefault(); doSetAlignment(editor, "left"); }} />
        <ToolbarButton icon={AlignCenter} label="Center" active={checkAlignActive(editor, "center")} onMouseDown={(e) => { e.preventDefault(); doSetAlignment(editor, "center"); }} />
        <ToolbarButton icon={AlignRight} label="Right" active={checkAlignActive(editor, "right")} onMouseDown={(e) => { e.preventDefault(); doSetAlignment(editor, "right"); }} />
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const inputEl = event.currentTarget;
              const file = inputEl.files?.[0];
              if (!file) return;
              await onInsertImageFromFile(file);
              inputEl.value = "";
            }}
          />
          <span
            role="button"
            aria-label="Upload Image"
            className={cn(
              "flex h-9 items-center rounded-md border px-3 text-sm transition cursor-pointer",
              "border-zinc-200 text-zinc-500 hover:border-zinc-400"
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
            onInsertTable();
            onSetDirty(true);
          }}
        />
        <ToolbarButton
          icon={Square}
          label="Tambah Box TTD"
          onMouseDown={(e) => {
            e.preventDefault();
            onInsertSignature();
            onSetDirty(true);
          }}
        />
      </div>

      {/* Element controls panel */}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-zinc-700">Image aktif:</span>
          <span>{activeImage ? "Ya" : "Pilih gambar dulu"}</span>
          <input
            type="range"
            min={40}
            max={320}
            step={10}
            value={activeImage?.width ?? 120}
            disabled={!activeImage}
            onChange={(event) => {
              const changed = onSetImageWidth(Number(event.target.value));
              if (changed) onSetDirty(true);
            }}
          />
          <span>{activeImage?.width ?? 120}px</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!activeImage}
            onClick={() => {
              const changed = onSetImageAlign("left");
              if (changed) onSetDirty(true);
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
              const changed = onSetImageAlign("center");
              if (changed) onSetDirty(true);
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
              const changed = onSetImageAlign("right");
              if (changed) onSetDirty(true);
            }}
          >
            Kanan
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-zinc-700">Tabel aktif:</span>
          <span>{activeTable ? "Ya" : "Pilih area tabel dulu"}</span>
          <input
            type="range"
            min={40}
            max={100}
            step={5}
            value={activeTable?.width ?? 100}
            disabled={!activeTable}
            onChange={(event) => {
              const changed = onSetTableWidth(Number(event.target.value));
              if (changed) onSetDirty(true);
            }}
          />
          <span>{activeTable?.width ?? 100}%</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!activeTable}
            onClick={() => {
              const changed = onSetTableAlign("left");
              if (changed) onSetDirty(true);
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
              const changed = onSetTableAlign("center");
              if (changed) onSetDirty(true);
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
              const changed = onSetTableAlign("right");
              if (changed) onSetDirty(true);
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
              const changed = onAddTableRow();
              if (changed) onSetDirty(true);
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
              const changed = onAddTableColumn();
              if (changed) onSetDirty(true);
            }}
          >
            <Columns className="mr-1 h-4 w-4" /> Tambah Kolom
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-zinc-700">Box TTD aktif:</span>
          <span>{activeSignature ? "Ya" : "Pilih area box tanda tangan"}</span>
          <input
            type="range"
            min={40}
            max={100}
            step={5}
            value={activeSignature?.width ?? 100}
            disabled={!activeSignature}
            onChange={(event) => {
              const changed = onSetSignatureWidth(Number(event.target.value));
              if (changed) onSetDirty(true);
            }}
          />
          <span>{activeSignature?.width ?? 100}%</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!activeSignature}
            onClick={() => {
              const changed = onSetSignatureAlign("left");
              if (changed) onSetDirty(true);
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
              const changed = onSetSignatureAlign("center");
              if (changed) onSetDirty(true);
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
              const changed = onSetSignatureAlign("right");
              if (changed) onSetDirty(true);
            }}
          >
            Kanan
          </Button>
        </div>
      </div>
    </>
  );
}

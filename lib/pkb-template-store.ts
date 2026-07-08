import type { Descendant } from "slate";
import { DEFAULT_PKB_TEMPLATE_NODES } from "./pkb-template-default";
import { getDb } from "./db";

export type PKBTemplateRecord = {
  content: Descendant[];
  updatedAt: string;
};

let cachedTemplate: PKBTemplateRecord | null = null;

function hasNominalUpahPlaceholder(nodes: Descendant[]): boolean {
  return JSON.stringify(nodes).toUpperCase().includes("{{NOMINAL_UPAH}}");
}

function ensureNominalUpahPlaceholder(nodes: Descendant[]): Descendant[] {
  if (hasNominalUpahPlaceholder(nodes)) {
    return nodes;
  }

  const nominalLine = {
    type: "paragraph",
    children: [{ text: "Nominal Upah Pokok : {{NOMINAL_UPAH}}" }],
  } as Descendant;

  const cloned = [...nodes];
  const insertAfterIndex = cloned.findIndex((node: any) => {
    const text = typeof node?.children?.[0]?.text === "string" ? node.children[0].text : "";
    return text.includes("{{PERAN_KARYAWAN}}");
  });

  if (insertAfterIndex >= 0) {
    cloned.splice(insertAfterIndex + 1, 0, nominalLine);
    return cloned;
  }

  const alamatIndex = cloned.findIndex((node: any) => {
    const text = typeof node?.children?.[0]?.text === "string" ? node.children[0].text : "";
    return text.includes("{{PIHAK_2_ALAMAT}}");
  });

  if (alamatIndex >= 0) {
    cloned.splice(alamatIndex, 0, nominalLine);
    return cloned;
  }

  cloned.push(nominalLine);
  return cloned;
}

function parseContent(payload: string): Descendant[] {
  try {
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed)) {
      return ensureNominalUpahPlaceholder(parsed as Descendant[]);
    }
    return ensureNominalUpahPlaceholder(DEFAULT_PKB_TEMPLATE_NODES);
  } catch {
    return ensureNominalUpahPlaceholder(DEFAULT_PKB_TEMPLATE_NODES);
  }
}

export function getPKBTemplate(): PKBTemplateRecord {
  if (cachedTemplate) return cachedTemplate;
  const db = getDb();
  const row = db.prepare("SELECT content, updated_at FROM pkb_templates WHERE id = 1").get();
  if (!row) {
    cachedTemplate = savePKBTemplate(DEFAULT_PKB_TEMPLATE_NODES);
    return cachedTemplate;
  }
  cachedTemplate = {
    content: parseContent(row.content as string),
    updatedAt: row.updated_at as string,
  };
  return cachedTemplate;
}

export function savePKBTemplate(content: Descendant[]): PKBTemplateRecord {
  const db = getDb();
  const payload = JSON.stringify(content);
  const updatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO pkb_templates (id, content, updated_at) VALUES (1, @content, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
  ).run({ content: payload, updatedAt });

  cachedTemplate = { content, updatedAt };
  return cachedTemplate;
}

export function resetPKBTemplateCache() {
  cachedTemplate = null;
}

import type { Descendant } from "slate";
import { DEFAULT_PKB_TEMPLATE_NODES } from "./pkb-template-default";
import { getDb } from "./db";

export type PKBTemplateRecord = {
  content: Descendant[];
  updatedAt: string;
};

let cachedTemplate: PKBTemplateRecord | null = null;

function parseContent(payload: string): Descendant[] {
  try {
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed)) {
      return parsed as Descendant[];
    }
    return DEFAULT_PKB_TEMPLATE_NODES;
  } catch {
    return DEFAULT_PKB_TEMPLATE_NODES;
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

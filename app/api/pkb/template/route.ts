import { NextResponse } from "next/server";
import type { Descendant } from "slate";
import { getPKBTemplate, savePKBTemplate } from "@/lib/pkb-template-store";
import { DEFAULT_PKB_TEMPLATE_NODES } from "@/lib/pkb-template-default";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const template = getPKBTemplate();
    return NextResponse.json(template);
  } catch (error) {
    console.error("PKB template GET error", error);
    return NextResponse.json({ error: "Gagal memuat template PKB" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const content = body?.content as Descendant[] | undefined;
    if (!Array.isArray(content)) {
      return NextResponse.json({ error: "Konten template tidak valid" }, { status: 400 });
    }
    const saved = savePKBTemplate(content);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("PKB template PUT error", error);
    return NextResponse.json({ error: "Gagal menyimpan template PKB" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const saved = savePKBTemplate(DEFAULT_PKB_TEMPLATE_NODES);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("PKB template reset error", error);
    return NextResponse.json({ error: "Gagal me-reset template PKB" }, { status: 500 });
  }
}

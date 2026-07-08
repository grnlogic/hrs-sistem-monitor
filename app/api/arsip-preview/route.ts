import { NextRequest } from "next/server";

function resolveApiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8084/api";
  const trimmed = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

function buildAllowedUrl(input: string) {
  const apiOrigin = resolveApiOrigin();

  if (input.startsWith("/uploads/")) {
    return `${apiOrigin}${input}`;
  }

  if (input.startsWith(`${apiOrigin}/uploads/`)) {
    return input;
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get("url") || "";
    if (!source) {
      return new Response("Parameter url wajib diisi", { status: 400 });
    }

    const targetUrl = buildAllowedUrl(source);
    if (!targetUrl) {
      return new Response("URL tidak diizinkan", { status: 400 });
    }

    const upstream = await fetch(targetUrl);
    if (!upstream.ok) {
      return new Response("File tidak dapat diambil", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const cacheControl = upstream.headers.get("cache-control") || "public, max-age=300";
    const contentDisposition = upstream.headers.get("content-disposition");

    const body = await upstream.arrayBuffer();

    const headers = new Headers({
      "content-type": contentType,
      "cache-control": cacheControl,
    });

    if (contentDisposition) {
      headers.set("content-disposition", contentDisposition);
    }

    return new Response(body, {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Gagal memproses preview", { status: 500 });
  }
}

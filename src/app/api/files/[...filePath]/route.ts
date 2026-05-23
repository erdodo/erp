import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { downloadFile } from "@/lib/storage";

type Ctx = { params: Promise<{ filePath: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filePath } = await params;

  // filePath[0] = tenantId, rest = filename
  const tenantId = session.user.tenantId;
  if (!tenantId || filePath[0] !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const remotePath = filePath.join("/");

  let buffer: Buffer;
  try {
    buffer = await downloadFile(remotePath);
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  // Infer content type from extension
  const ext     = remotePath.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif",  webp: "image/webp", pdf: "application/pdf",
    csv: "text/csv",   xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
  };
  const contentType = mimeMap[ext] ?? "application/octet-stream";
  const inline      = ["image/jpeg","image/png","image/webp","image/gif","application/pdf"].includes(contentType);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filePath.at(-1)}"`,
      "Cache-Control":       "private, max-age=3600",
    },
  });
}

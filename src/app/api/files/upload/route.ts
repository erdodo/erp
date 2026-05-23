import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile, getFileUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

const MAX_SIZE    = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/zip",
  "application/octet-stream",
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant bulunamadı" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz form verisi" }, { status: 400 });
  }

  const file   = formData.get("file");
  const moduleName = formData.get("module") as string | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya alanı bulunamadı" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `Dosya çok büyük (max ${MAX_SIZE / 1024 / 1024} MB)` }, { status: 413 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Desteklenmeyen dosya türü: ${file.type}` }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const remotePath = await uploadFile({
    buffer,
    tenantId,
    filename: file.name,
    mimeType: file.type,
  });

  const url  = getFileUrl(remotePath);
  const name = file.name;
  const size = file.size;
  const mime = file.type;

  void prisma; // imported for future FileAttachment model use
  void moduleName; // used for module tagging once schema includes FileAttachment

  return NextResponse.json({ url, path: remotePath, name, size, mimeType: mime }, { status: 201 });
}

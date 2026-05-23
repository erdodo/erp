import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { requireModule, auditLog } from "@/lib/api-guard";
import { getIpFromRequest } from "@/lib/audit";

export async function GET(_req: NextRequest) {
  const guard = await requireModule("api-keys");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const keys = await prisma.apiKey.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, isActive: true, expiresAt: true, createdAt: true, lastUsedAt: true } });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const guard = await requireModule("api-keys");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { name: string; expiresAt?: string };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const rawKey  = `sk_live_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash  = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);
  const k = await prisma.apiKey.create({ data: { tenantId, name: body.name, keyHash, keyPrefix, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } });
  await auditLog(guard.session, "create", "api-keys", k.id, { newData: { name: body.name, keyPrefix }, ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ...k, rawKey }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireModule("api-keys");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const body = await req.json() as { id: string; isActive: boolean };
  const k = await prisma.apiKey.update({ where: { id: body.id, tenantId }, data: { isActive: body.isActive } });
  await auditLog(guard.session, "update", "api-keys", body.id, { newData: { isActive: body.isActive }, ipAddress: getIpFromRequest(req) });
  return NextResponse.json(k);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireModule("api-keys");
  if (!guard.ok) return guard.res;
  const { tenantId } = guard.session;
  const { id } = await req.json() as { id: string };
  await prisma.apiKey.update({ where: { id, tenantId }, data: { deletedAt: new Date() } });
  await auditLog(guard.session, "delete", "api-keys", id, { ipAddress: getIpFromRequest(req) });
  return NextResponse.json({ ok: true });
}

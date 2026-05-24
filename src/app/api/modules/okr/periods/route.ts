import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  try {
    const [periods, users, departments, teams] = await Promise.all([
      prisma.okrPeriod.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { startDate: "desc" },
        include: {
          _count: { select: { objectives: true, comments: true, votes: true } }
        }
      }),
      prisma.user.findMany({
        where: { tenantId, isActive: true, deletedAt: null },
        select: { id: true, name: true }
      }),
      prisma.department.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true }
      }),
      prisma.okrTeam.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true }
      })
    ]);

    return NextResponse.json({ periods, users, departments, teams });
  } catch (e) {
    console.error("[OKR_PERIODS_GET]", e);
    return NextResponse.json({ error: "Dönemler ve aday listeleri yüklenirken hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  // Allow only admins or superadmins to create periods
  if (!session.user.isAdmin && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Only admins can create OKR periods" }, { status: 403 });
  }

  try {
    const body = await req.json() as {
      name: string;
      type: "quarterly" | "yearly";
      startDate: string;
      endDate: string;
    };

    if (!body.name || !body.type || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: "Eksik parametreler girdiniz." }, { status: 400 });
    }

    // Set other periods to inactive if the new one is active? 
    // Usually multiple periods can be active, but let's keep it simple.

    const period = await prisma.okrPeriod.create({
      data: {
        tenantId,
        name: body.name,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        isActive: true,
        votingActive: true
      }
    });

    return NextResponse.json(period, { status: 201 });
  } catch (e) {
    console.error("[OKR_PERIODS_POST]", e);
    return NextResponse.json({ error: "Dönem oluşturulurken hata oluştu" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  try {
    const teams = await prisma.okrTeam.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        leader: { select: { id: true, name: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        _count: { select: { members: true, objectives: true } }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ teams });
  } catch (e) {
    console.error("[OKR_TEAMS_GET]", e);
    return NextResponse.json({ error: "Takımlar yüklenirken hata oluştu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = session.user.tenantId!;

  try {
    const body = await req.json() as {
      id?: string;
      name: string;
      description?: string;
      leaderId?: string;
      userIds?: string[]; // members
      deleted?: boolean;
    };

    if (body.deleted && body.id) {
      // Soft delete team
      await prisma.okrTeam.update({
        where: { id: body.id },
        data: { deletedAt: new Date() }
      });
      return NextResponse.json({ success: true });
    }

    if (!body.name) {
      return NextResponse.json({ error: "Takım adı boş olamaz" }, { status: 400 });
    }

    let team;
    if (body.id) {
      // Update team details
      team = await prisma.okrTeam.update({
        where: { id: body.id },
        data: {
          name: body.name,
          description: body.description || null,
          leaderId: body.leaderId || null
        }
      });

      // Update members: delete all and re-create for simplicity
      await prisma.okrTeamMember.deleteMany({
        where: { teamId: team.id }
      });
    } else {
      // Create team
      team = await prisma.okrTeam.create({
        data: {
          tenantId,
          name: body.name,
          description: body.description || null,
          leaderId: body.leaderId || null
        }
      });
    }

    // Bulk create members
    if (body.userIds && body.userIds.length > 0) {
      await prisma.okrTeamMember.createMany({
        data: body.userIds.map((userId) => ({
          teamId: team.id,
          userId
        }))
      });
    }

    // Fetch the fresh team with members
    const fullTeam = await prisma.okrTeam.findUnique({
      where: { id: team.id },
      include: {
        leader: { select: { id: true, name: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return NextResponse.json(fullTeam, { status: body.id ? 200 : 201 });
  } catch (e) {
    console.error("[OKR_TEAMS_POST]", e);
    return NextResponse.json({ error: "Takım kaydedilirken hata oluştu" }, { status: 500 });
  }
}

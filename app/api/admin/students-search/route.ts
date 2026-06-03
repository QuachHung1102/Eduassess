import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ students: [] });

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      sex: true,
      classEnrollments: {
        select: { class: { select: { name: true } } },
        take: 1,
      },
    },
    take: 20,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ students });
}

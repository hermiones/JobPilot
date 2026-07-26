import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const MAX_MESSAGE_LENGTH = 2000;

// POST /api/feedback — submit a rating + suggestion. Body: { rating?, message, page? }
export async function POST(req: Request) {
  const profile = await requireUser();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  const rating =
    typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : null;

  if (!message && rating === null) {
    return NextResponse.json({ error: "Add a rating or a message." }, { status: 400 });
  }

  const feedback = await prisma.feedback.create({
    data: { userId: profile.id, rating, message, page },
  });

  return NextResponse.json({ id: feedback.id });
}

// GET /api/feedback — admin-only: recent feedback across all users.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const userIds = Array.from(new Set(entries.map((e) => e.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      email: emailById.get(e.userId) ?? "unknown",
      rating: e.rating,
      message: e.message,
      page: e.page,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

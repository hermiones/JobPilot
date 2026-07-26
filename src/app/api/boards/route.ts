import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";

// GET /api/boards — list all known boards (active + inactive). Read-only,
// any authenticated user can see which boards feed the shared job pool.
export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: [{ active: "desc" }, { lastJobCount: "desc" }],
  });
  return NextResponse.json({ boards });
}

// PATCH /api/boards — toggle a board active/inactive. Body: { id, active }
// Admin-only: this is shared infrastructure that affects every user's job
// pool, not per-user data.
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, active } = await req.json();
  if (typeof id !== "string" || typeof active !== "boolean") {
    return NextResponse.json({ error: "id and active required" }, { status: 400 });
  }
  const board = await prisma.board.update({ where: { id }, data: { active } });
  return NextResponse.json(board);
}

// DELETE /api/boards?id=... — remove a board. Admin-only (see PATCH above).
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.board.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

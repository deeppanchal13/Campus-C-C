import { NextResponse } from "next/server";
import { endAdminSession, isAdmin } from "@/lib/admin-auth";
export async function POST() { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); await endAdminSession(); return NextResponse.json({ ok: true }); }

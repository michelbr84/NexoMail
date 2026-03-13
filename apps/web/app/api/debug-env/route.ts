import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    hasSecret: !!process.env.BETTER_AUTH_SECRET,
    secretLen: process.env.BETTER_AUTH_SECRET?.length ?? 0,
    hasDbUrl: !!process.env.DATABASE_URL,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}

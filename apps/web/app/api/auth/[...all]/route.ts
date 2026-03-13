import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const handler = toNextJsHandler(auth);

async function withErrorLogging(
  fn: (req: NextRequest) => Promise<Response>,
  req: NextRequest
) {
  try {
    return await fn(req);
  } catch (err) {
    console.error("[auth route error]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: NextRequest) {
  return withErrorLogging(handler.GET as (req: NextRequest) => Promise<Response>, req);
}

export async function POST(req: NextRequest) {
  return withErrorLogging(handler.POST as (req: NextRequest) => Promise<Response>, req);
}

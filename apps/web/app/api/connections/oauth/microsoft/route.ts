import { NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";

export async function GET() {
  try {
    await requireSession();

    const params = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID!,
      response_type: "code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/oauth/microsoft/callback`,
      scope:
        "openid email profile offline_access Mail.ReadWrite Mail.Send User.Read",
      response_mode: "query",
      prompt: "consent",
    });

    const tenantId = process.env.AZURE_TENANT_ID ?? "common";
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;

    return NextResponse.redirect(url);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.redirect(
        new URL("/login", process.env.NEXT_PUBLIC_APP_URL!)
      );
    }
    throw err;
  }
}

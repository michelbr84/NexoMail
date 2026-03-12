import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { connections } from "@nexomail/db";
import { encrypt } from "@nexomail/email";

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface MicrosoftUserProfile {
  mail?: string;
  userPrincipalName?: string;
  displayName?: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/accounts?error=no_code`
      );
    }

    const tenantId = process.env.AZURE_TENANT_ID ?? "common";

    // Exchange authorization code for tokens
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID!,
          client_secret: process.env.AZURE_CLIENT_SECRET!,
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/oauth/microsoft/callback`,
          grant_type: "authorization_code",
        }),
      }
    );

    const tokens = (await tokenRes.json()) as MicrosoftTokenResponse;

    if (tokens.error) {
      console.error("[Microsoft OAuth token error]", tokens.error_description);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/accounts?error=token_failed`
      );
    }

    // Fetch user profile from Microsoft Graph
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileRes.json()) as MicrosoftUserProfile;

    const emailAddress = profile.mail ?? profile.userPrincipalName ?? "";

    await db
      .insert(connections)
      .values({
        userId: session.user.id,
        provider: "outlook",
        email: emailAddress,
        displayName: profile.displayName ?? emailAddress,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
      })
      .onConflictDoNothing();

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/accounts?success=outlook`
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login`
      );
    }
    console.error("[Microsoft OAuth callback error]", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/accounts?error=oauth_failed`
    );
  }
}

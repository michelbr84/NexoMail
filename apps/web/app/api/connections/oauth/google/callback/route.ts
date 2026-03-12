import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { db } from "@/lib/db";
import { connections } from "@nexomail/db";
import { google } from "googleapis";
import { encrypt } from "@nexomail/email";

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

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/oauth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch Gmail profile for email address
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress!;

    // Fetch user info for name and avatar
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    await db
      .insert(connections)
      .values({
        userId: session.user.id,
        provider: "gmail",
        email: emailAddress,
        displayName: userInfo.data.name ?? emailAddress,
        avatarUrl: userInfo.data.picture ?? null,
        accessToken: encrypt(tokens.access_token!),
        refreshToken: encrypt(tokens.refresh_token!),
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
      })
      .onConflictDoNothing();

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/accounts?success=gmail`
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login`
      );
    }
    console.error("[Google OAuth callback error]", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/accounts?error=oauth_failed`
    );
  }
}

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/get-session";
import { google } from "googleapis";

export async function GET() {
  try {
    await requireSession();

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/oauth/google/callback`
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send",
      ],
    });

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

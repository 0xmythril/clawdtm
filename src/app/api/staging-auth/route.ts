import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const STAGING_PASSWORD = process.env.STAGING_PASSWORD;
const COOKIE_NAME = "staging_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  // If no staging password is set, this endpoint shouldn't be hit
  if (!STAGING_PASSWORD) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  try {
    const { password } = await request.json();

    if (password === STAGING_PASSWORD) {
      const cookieStore = await cookies();
      // Set a simple hash of the password as the cookie value
      const authValue = Buffer.from(STAGING_PASSWORD).toString("base64");
      
      cookieStore.set(COOKIE_NAME, authValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

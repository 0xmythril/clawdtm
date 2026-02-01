import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const STAGING_PASSWORD = process.env.STAGING_PASSWORD;
const COOKIE_NAME = "staging_auth";

export async function GET() {
  // If no staging password is set, everyone is authenticated
  if (!STAGING_PASSWORD) {
    return NextResponse.json({ authenticated: true });
  }

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(COOKIE_NAME);
  
  if (!authCookie) {
    return NextResponse.json({ authenticated: false });
  }

  // Verify the cookie value matches
  const expectedValue = Buffer.from(STAGING_PASSWORD).toString("base64");
  const authenticated = authCookie.value === expectedValue;

  return NextResponse.json({ authenticated });
}

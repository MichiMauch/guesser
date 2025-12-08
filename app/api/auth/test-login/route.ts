import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Test login not available in production" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { testUserNumber } = body;

    if (!testUserNumber || testUserNumber < 1 || testUserNumber > 5) {
      return NextResponse.json(
        { error: "Invalid test user number (1-5)" },
        { status: 400 }
      );
    }

    const testUserId = `test-user-${testUserNumber}`;
    const testUserEmail = `test${testUserNumber}@swiss-guesser.local`;
    const testUserName = `Test User ${testUserNumber}`;

    // Check if user exists, create if not
    let user = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .get();

    if (!user) {
      await db.insert(users).values({
        id: testUserId,
        name: testUserName,
        email: testUserEmail,
        image: null,
      });
      user = { id: testUserId, name: testUserName, email: testUserEmail, emailVerified: null, image: null, hintEnabled: null, isSuperAdmin: null };
    }

    // Create a session
    const sessionToken = nanoid(32);
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Delete any existing sessions for this user
    await db.delete(sessions).where(eq(sessions.userId, testUserId));

    // Create new session
    await db.insert(sessions).values({
      sessionToken,
      userId: testUserId,
      expires,
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set("next-auth.session-token", sessionToken, {
      expires,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true, user: { id: user!.id, name: user!.name } });
  } catch (error) {
    console.error("Error creating test login:", error);
    return NextResponse.json(
      { error: "Failed to create test login" },
      { status: 500 }
    );
  }
}

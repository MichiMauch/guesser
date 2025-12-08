import { getServerSession } from "next-auth";
import { authOptions, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, groupMembers, guesses } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get all users with group count and guess count
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        hintEnabled: users.hintEnabled,
        isSuperAdmin: users.isSuperAdmin,
        createdAt: sql<string>`COALESCE(${users.emailVerified}, datetime('now'))`,
        groupCount: sql<number>`(SELECT COUNT(*) FROM groupMembers WHERE groupMembers.userId = ${users.id})`,
        guessCount: sql<number>`(SELECT COUNT(*) FROM guesses WHERE guesses.userId = ${users.id})`,
      })
      .from(users)
      .orderBy(users.name);

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // Delete in order of foreign key constraints:
    // 1. Delete guesses
    await db.delete(guesses).where(eq(guesses.userId, userId));

    // 2. Delete group memberships
    await db.delete(groupMembers).where(eq(groupMembers.userId, userId));

    // 3. Delete the user
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, hintEnabled, isSuperAdmin: newSuperAdminStatus } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Build update object based on what's provided
    const updateData: { hintEnabled?: boolean; isSuperAdmin?: boolean } = {};

    if (typeof hintEnabled === "boolean") {
      updateData.hintEnabled = hintEnabled;
    }

    if (typeof newSuperAdminStatus === "boolean") {
      // Prevent removing your own SuperAdmin status
      const targetUser = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .get();

      if (targetUser?.email === session.user.email && !newSuperAdminStatus) {
        return NextResponse.json(
          { error: "Du kannst dir nicht selbst die Admin-Rechte entziehen" },
          { status: 400 }
        );
      }

      updateData.isSuperAdmin = newSuperAdminStatus;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Keine gültigen Felder zum Aktualisieren" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { imageLocations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const imageMapId = searchParams.get("imageMapId");

    let locations;
    if (imageMapId) {
      locations = await db
        .select()
        .from(imageLocations)
        .where(eq(imageLocations.imageMapId, imageMapId));
    } else {
      locations = await db.select().from(imageLocations);
    }

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error fetching image locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch image locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageMapId, name, x, y, difficulty } = body;

    if (!imageMapId || !name || x === undefined || y === undefined) {
      return NextResponse.json(
        { error: "imageMapId, name, x, and y are required" },
        { status: 400 }
      );
    }

    const id = nanoid();
    await db.insert(imageLocations).values({
      id,
      imageMapId,
      name,
      x,
      y,
      difficulty: difficulty || "medium",
      createdAt: new Date(),
    });

    return NextResponse.json({
      id,
      imageMapId,
      name,
      x,
      y,
      difficulty: difficulty || "medium",
    });
  } catch (error) {
    console.error("Error creating image location:", error);
    return NextResponse.json(
      { error: "Failed to create image location" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    await db.delete(imageLocations).where(eq(imageLocations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image location:", error);
    return NextResponse.json(
      { error: "Failed to delete image location" },
      { status: 500 }
    );
  }
}

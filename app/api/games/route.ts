import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  games,
  gameRounds,
  locations,
  groupMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { DEFAULT_COUNTRY, getCountryKeys } from "@/lib/countries";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    // Check membership
    const membership = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, session.user.id)
        )
      )
      .get();

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Get user's hintEnabled setting
    const user = await db
      .select({ hintEnabled: users.hintEnabled })
      .from(users)
      .where(eq(users.id, session.user.id))
      .get();

    // Get current active game (most recent)
    const game = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.groupId, groupId),
          eq(games.status, "active")
        )
      )
      .orderBy(desc(games.createdAt))
      .get();

    if (!game) {
      return NextResponse.json({ game: null, rounds: [], timeLimitSeconds: null, hintEnabled: user?.hintEnabled ?? false });
    }

    // Get rounds with location info
    const rounds = await db
      .select({
        id: gameRounds.id,
        roundNumber: gameRounds.roundNumber,
        locationIndex: gameRounds.locationIndex,
        locationId: gameRounds.locationId,
        locationName: locations.name,
        latitude: locations.latitude,
        longitude: locations.longitude,
        country: gameRounds.country,
      })
      .from(gameRounds)
      .innerJoin(locations, eq(gameRounds.locationId, locations.id))
      .where(eq(gameRounds.gameId, game.id))
      .orderBy(gameRounds.roundNumber, gameRounds.locationIndex);

    return NextResponse.json({
      game,
      rounds,
      timeLimitSeconds: game.timeLimitSeconds ?? null,
      hintEnabled: user?.hintEnabled ?? false
    });
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { groupId, name, locationsPerRound, timeLimitSeconds, country } = body;

    // Validate country
    const validCountries = getCountryKeys();
    const selectedCountry = country && validCountries.includes(country) ? country : DEFAULT_COUNTRY;

    // Check if user is admin
    const membership = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, session.user.id)
        )
      )
      .get();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create games" },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!locationsPerRound || locationsPerRound < 1) {
      return NextResponse.json(
        { error: "locationsPerRound ist erforderlich" },
        { status: 400 }
      );
    }

    // Get available locations (global - all locations)
    const locationsList = await db.select().from(locations);

    if (locationsList.length < locationsPerRound) {
      return NextResponse.json(
        {
          error: `Mindestens ${locationsPerRound} Orte benötigt`,
        },
        { status: 400 }
      );
    }

    // Check if an active game already exists for this group
    const existingActiveGame = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.groupId, groupId),
          eq(games.status, "active")
        )
      )
      .get();

    if (existingActiveGame) {
      return NextResponse.json(
        { error: "Es gibt bereits ein aktives Spiel" },
        { status: 400 }
      );
    }

    // Create game with currentRound: 0 (no rounds released yet, admin must release first round manually)
    const now = new Date();
    const gameId = nanoid();
    await db.insert(games).values({
      id: gameId,
      groupId,
      name: name || null,
      country: selectedCountry,
      locationsPerRound,
      timeLimitSeconds: timeLimitSeconds || null,
      status: "active",
      currentRound: 0,
      createdAt: now,
    });

    // Note: Locations for Round 1 are created when admin releases the round via /api/games/release-round

    return NextResponse.json({ gameId });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}

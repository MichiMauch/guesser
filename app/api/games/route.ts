import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  games,
  gameRounds,
  locations,
  worldLocations,
  imageLocations,
  groupMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { DEFAULT_COUNTRY, getCountryKeys } from "@/lib/countries";
import { getGameTypeIds, isWorldGameType, getWorldCategory, DEFAULT_GAME_TYPE } from "@/lib/game-types";
import { getLocalizedName, LocalizedLocation } from "@/lib/location-utils";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    // Get locale from query param or Accept-Language header, default to "de"
    const locale = searchParams.get("locale") ||
      request.headers.get("Accept-Language")?.split(",")[0]?.split("-")[0] ||
      "de";

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

    // Get rounds with location info - handle mixed game types per round
    // First, get all game rounds
    const allRounds = await db
      .select()
      .from(gameRounds)
      .where(eq(gameRounds.gameId, game.id))
      .orderBy(gameRounds.roundNumber, gameRounds.locationIndex);

    // Separate rounds by locationSource
    const countryRoundIds = allRounds.filter(r => r.locationSource === "locations").map(r => r.locationId);
    const worldRoundIds = allRounds.filter(r => r.locationSource === "worldLocations").map(r => r.locationId);
    const imageRoundIds = allRounds.filter(r => r.locationSource === "imageLocations").map(r => r.locationId);

    // Fetch location names from respective tables (include all localized names)
    const countryLocationsMap = new Map<string, LocalizedLocation & { latitude: number; longitude: number }>();
    const worldLocationsMap = new Map<string, LocalizedLocation & { latitude: number; longitude: number }>();
    const imageLocationsMap = new Map<string, LocalizedLocation & { latitude: number; longitude: number }>();

    if (countryRoundIds.length > 0) {
      const countryLocs = await db.select().from(locations);
      countryLocs.forEach(loc => {
        countryLocationsMap.set(loc.id, {
          name: loc.name,
          nameDe: loc.nameDe,
          nameEn: loc.nameEn,
          nameSl: loc.nameSl,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      });
    }

    if (worldRoundIds.length > 0) {
      const worldLocs = await db.select().from(worldLocations);
      worldLocs.forEach(loc => {
        worldLocationsMap.set(loc.id, {
          name: loc.name,
          nameDe: loc.nameDe,
          nameEn: loc.nameEn,
          nameSl: loc.nameSl,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      });
    }

    if (imageRoundIds.length > 0) {
      const imageLocs = await db.select().from(imageLocations);
      imageLocs.forEach(loc => {
        imageLocationsMap.set(loc.id, {
          name: loc.name,
          nameDe: loc.nameDe,
          nameEn: loc.nameEn,
          nameSl: null, // imageLocations doesn't have nameSl
          // For image maps: lat=y, lng=x (Leaflet CRS.Simple convention)
          latitude: loc.y,
          longitude: loc.x,
        });
      });
    }

    // Combine rounds with location info (using localized names)
    const rounds = allRounds.map(round => {
      let locationMap;
      if (round.locationSource === "worldLocations") {
        locationMap = worldLocationsMap;
      } else if (round.locationSource === "imageLocations") {
        locationMap = imageLocationsMap;
      } else {
        locationMap = countryLocationsMap;
      }
      const locationInfo = locationMap.get(round.locationId);
      return {
        id: round.id,
        roundNumber: round.roundNumber,
        locationIndex: round.locationIndex,
        locationId: round.locationId,
        locationName: locationInfo ? getLocalizedName(locationInfo, locale) : "Unknown",
        latitude: locationInfo?.latitude ?? 0,
        longitude: locationInfo?.longitude ?? 0,
        country: round.country,
        gameType: round.gameType, // Include the round's gameType
        timeLimitSeconds: round.timeLimitSeconds, // Time limit for this specific round
      };
    });

    return NextResponse.json({
      game,
      rounds,
      timeLimitSeconds: game.timeLimitSeconds ?? null, // Legacy: game-level time limit
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
    const { groupId, name, locationsPerRound, timeLimitSeconds, country, gameType } = body;

    // Validate gameType or fall back to country
    const validGameTypes = getGameTypeIds();
    const validCountries = getCountryKeys();

    let selectedGameType: string | null = null;
    let selectedCountry = DEFAULT_COUNTRY;

    if (gameType && validGameTypes.includes(gameType)) {
      // New gameType system
      selectedGameType = gameType;
      // Extract country from gameType for backwards compatibility
      if (gameType.startsWith("country:")) {
        selectedCountry = gameType.replace("country:", "");
      }
    } else if (country && validCountries.includes(country)) {
      // Legacy country system
      selectedCountry = country;
    }

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

    // Check available locations based on game type
    let availableLocationCount = 0;

    if (selectedGameType && isWorldGameType(selectedGameType)) {
      // World game type - check worldLocations table
      const category = getWorldCategory(selectedGameType);
      if (category) {
        const worldLocationsList = await db
          .select()
          .from(worldLocations)
          .where(eq(worldLocations.category, category));
        availableLocationCount = worldLocationsList.length;
      }
    } else {
      // Country game type - check locations table
      const locationsList = await db.select().from(locations);
      availableLocationCount = locationsList.length;
    }

    if (availableLocationCount < locationsPerRound) {
      return NextResponse.json(
        {
          error: `Mindestens ${locationsPerRound} Orte benötigt (${availableLocationCount} verfügbar)`,
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
      gameType: selectedGameType,
      locationsPerRound,
      timeLimitSeconds: timeLimitSeconds || null,
      status: "active",
      currentRound: 0,
      createdAt: now,
    });

    // Note: Locations for Round 1 are created when admin releases the round via /api/games/release-round

    return NextResponse.json({ gameId, gameType: selectedGameType });
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}

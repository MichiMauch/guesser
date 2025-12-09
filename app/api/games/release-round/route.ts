import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { games, groupMembers, locations, worldLocations, imageLocations, gameRounds } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getLocationCountryName } from "@/lib/countries";
import { getEffectiveGameType, isWorldGameType, getWorldCategory, isImageGameType, getImageMapId } from "@/lib/game-types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { gameId, gameType: requestedGameType, locationsPerRound: requestedLocationsPerRound, timePerRound } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      );
    }

    // Get game
    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .get();

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Authorization check based on game mode
    if (game.mode === "group") {
      // Group games: check if user is admin of the group
      if (!game.groupId) {
        return NextResponse.json({ error: "Invalid game state" }, { status: 400 });
      }
      const membership = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, game.groupId),
            eq(groupMembers.userId, session.user.id)
          )
        )
        .get();

      if (!membership || membership.role !== "admin") {
        return NextResponse.json(
          { error: "Only admins can release rounds" },
          { status: 403 }
        );
      }
    } else {
      // Solo/Training games: check if user owns the game
      if (game.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You can only control your own games" },
          { status: 403 }
        );
      }
    }

    // Determine game type - use requested type if provided, otherwise fall back to game's type
    const effectiveGameType = requestedGameType || getEffectiveGameType(game);
    const isWorld = isWorldGameType(effectiveGameType);
    const isImage = isImageGameType(effectiveGameType);

    // Use requested locationsPerRound if provided, otherwise fall back to game's default
    const effectiveLocationsPerRound = requestedLocationsPerRound || game.locationsPerRound;

    // Get locations already used in this game
    const usedRounds = await db
      .select({ locationId: gameRounds.locationId })
      .from(gameRounds)
      .where(eq(gameRounds.gameId, gameId));

    const usedLocationIds = new Set(usedRounds.map((r) => r.locationId));

    let availableLocations: Array<{ id: string; name: string; latitude: number; longitude: number }> = [];
    let roundCountry: string;
    let locationSource: "locations" | "worldLocations" | "imageLocations" = "locations";

    if (isImage) {
      // Image game type - get locations from imageLocations table
      const imageMapId = getImageMapId(effectiveGameType);
      if (imageMapId) {
        const imageLocs = await db
          .select()
          .from(imageLocations)
          .where(eq(imageLocations.imageMapId, imageMapId));

        availableLocations = imageLocs
          .filter((loc) => !usedLocationIds.has(loc.id))
          .map((loc) => ({
            id: loc.id,
            name: loc.name,
            // For image maps, use x/y as lat/lng (Leaflet CRS.Simple convention: lat=y, lng=x)
            latitude: loc.y,
            longitude: loc.x,
          }));
      }
      // For image games, use the image map id as the country identifier
      roundCountry = imageMapId || "image";
      locationSource = "imageLocations";
    } else if (isWorld) {
      // World game type - get locations from worldLocations table
      const category = getWorldCategory(effectiveGameType);
      if (category) {
        const worldLocs = await db
          .select()
          .from(worldLocations)
          .where(eq(worldLocations.category, category));

        availableLocations = worldLocs
          .filter((loc) => !usedLocationIds.has(loc.id))
          .map((loc) => ({
            id: loc.id,
            name: loc.name,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }));
      }
      // For world games, use "world" as the country identifier and worldLocations as source
      roundCountry = "world";
      locationSource = "worldLocations";
    } else {
      // Country game type - extract country from gameType (e.g., "country:switzerland" -> "switzerland")
      roundCountry = effectiveGameType.replace("country:", "");
      const countryName = getLocationCountryName(roundCountry);
      const countryLocs = await db
        .select()
        .from(locations)
        .where(eq(locations.country, countryName));

      availableLocations = countryLocs
        .filter((loc) => !usedLocationIds.has(loc.id))
        .map((loc) => ({
          id: loc.id,
          name: loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
        }));
    }

    // Check if we have enough locations for another round
    if (availableLocations.length < effectiveLocationsPerRound) {
      return NextResponse.json(
        {
          error: `Nicht genügend unbenutzte Orte für eine weitere Runde. Benötigt: ${effectiveLocationsPerRound}, Verfügbar: ${availableLocations.length}`,
        },
        { status: 400 }
      );
    }

    // Select random locations for the new round
    const shuffled = [...availableLocations].sort(() => Math.random() - 0.5);
    const selectedLocations = shuffled.slice(0, effectiveLocationsPerRound);

    // Create the new round
    const newRoundNumber = game.currentRound + 1;

    // Prepare all gameRounds records for batch insert
    const gameRoundsToInsert = selectedLocations.map((loc, i) => ({
      id: nanoid(),
      gameId,
      roundNumber: newRoundNumber,
      locationIndex: i + 1,
      locationId: loc.id,
      locationSource,
      country: roundCountry,
      gameType: effectiveGameType,
      timeLimitSeconds: timePerRound || null,
    }));

    // Batch insert all locations for the round
    await db.insert(gameRounds).values(gameRoundsToInsert);

    // Update currentRound and reset leaderboard visibility
    await db
      .update(games)
      .set({
        currentRound: newRoundNumber,
        leaderboardRevealed: false,  // Rangliste nach neuer Runde wieder verstecken
      })
      .where(eq(games.id, gameId));

    return NextResponse.json({
      success: true,
      currentRound: newRoundNumber,
      locationsInRound: effectiveLocationsPerRound,
      gameType: effectiveGameType,
    });
  } catch (error) {
    console.error("Error releasing round:", error);
    return NextResponse.json(
      { error: "Failed to release round" },
      { status: 500 }
    );
  }
}

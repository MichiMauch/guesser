import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  guesses,
  gameRounds,
  games,
  groupMembers,
  locations,
  worldLocations,
  imageLocations,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { calculateDistance, calculatePixelDistance } from "@/lib/distance";
import { getTimeoutPenalty } from "@/lib/countries";
import { calculateScore } from "@/lib/score";
import { isImageGameType, getImageMapId, getGameTypeConfig } from "@/lib/game-types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");
    const userId = searchParams.get("userId"); // Optional: view another player's guesses
    const roundNumber = searchParams.get("roundNumber"); // Optional: filter by round

    if (!gameId) {
      return NextResponse.json(
        { error: "Game ID is required" },
        { status: 400 }
      );
    }

    // Determine which user's guesses to fetch
    const targetUserId = userId || session.user.id;
    const isOwnGuesses = targetUserId === session.user.id;

    // Get the game to check permissions
    const game = await db
      .select({
        id: games.id,
        groupId: games.groupId,
        leaderboardRevealed: games.leaderboardRevealed,
        status: games.status,
      })
      .from(games)
      .where(eq(games.id, gameId))
      .get();

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // If viewing another user's guesses, check if allowed
    if (!isOwnGuesses) {
      // Must be revealed or game completed to view other players' guesses
      const isRevealed = game.leaderboardRevealed || game.status === "completed";
      if (!isRevealed) {
        return NextResponse.json(
          { error: "Leaderboard not revealed yet" },
          { status: 403 }
        );
      }

      // Must be member of the same group
      if (game.groupId) {
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

        if (!membership) {
          return NextResponse.json({ error: "Not a member" }, { status: 403 });
        }
      }
    }

    // Build WHERE conditions
    let whereConditions = and(
      eq(gameRounds.gameId, gameId),
      eq(guesses.userId, targetUserId)
    );

    if (roundNumber) {
      whereConditions = and(
        whereConditions,
        sql`${gameRounds.roundNumber} = ${parseInt(roundNumber)}`
      );
    }

    // Get guesses with location details
    const userGuessesRaw = await db
      .select({
        id: guesses.id,
        gameRoundId: guesses.gameRoundId,
        latitude: guesses.latitude,
        longitude: guesses.longitude,
        distanceKm: guesses.distanceKm,
        roundNumber: gameRounds.roundNumber,
        locationIndex: gameRounds.locationIndex,
        gameType: gameRounds.gameType,
        country: gameRounds.country,
        locationId: gameRounds.locationId,
        locationSource: gameRounds.locationSource,
      })
      .from(guesses)
      .innerJoin(gameRounds, eq(guesses.gameRoundId, gameRounds.id))
      .where(whereConditions);

    // Fetch location details for each guess
    const guessesWithLocations = await Promise.all(
      userGuessesRaw.map(async (guess) => {
        let locationData: { name: string; latitude: number; longitude: number } | null = null;

        // Fallback for old rounds without gameType
        const effectiveGameType = guess.gameType || `country:${guess.country || 'switzerland'}`;

        if (guess.locationSource === "worldLocations") {
          const loc = await db
            .select({ name: worldLocations.name, latitude: worldLocations.latitude, longitude: worldLocations.longitude })
            .from(worldLocations)
            .where(eq(worldLocations.id, guess.locationId))
            .get();
          locationData = loc || null;
        } else if (guess.locationSource === "imageLocations" || isImageGameType(effectiveGameType)) {
          // Image-based locations use x/y pixel coordinates
          const loc = await db
            .select({ name: imageLocations.name, x: imageLocations.x, y: imageLocations.y })
            .from(imageLocations)
            .where(eq(imageLocations.id, guess.locationId))
            .get();
          if (loc) {
            // For ImageMap, lat=y and lng=x (Leaflet CRS.Simple convention)
            locationData = { name: loc.name, latitude: loc.y, longitude: loc.x };
          }
        } else {
          const loc = await db
            .select({ name: locations.name, latitude: locations.latitude, longitude: locations.longitude })
            .from(locations)
            .where(eq(locations.id, guess.locationId))
            .get();
          locationData = loc || null;
        }

        return {
          id: guess.id,
          gameRoundId: guess.gameRoundId,
          latitude: guess.latitude,
          longitude: guess.longitude,
          distanceKm: guess.distanceKm,
          score: calculateScore(guess.distanceKm, effectiveGameType),
          roundNumber: guess.roundNumber,
          locationIndex: guess.locationIndex,
          targetLatitude: locationData?.latitude || 0,
          targetLongitude: locationData?.longitude || 0,
          locationName: locationData?.name || "Unknown",
          gameType: effectiveGameType,
        };
      })
    );

    // Sort by roundNumber, then locationIndex
    guessesWithLocations.sort((a, b) => {
      if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
      return a.locationIndex - b.locationIndex;
    });

    return NextResponse.json({ guesses: guessesWithLocations });
  } catch (error) {
    console.error("Error fetching guesses:", error);
    return NextResponse.json(
      { error: "Failed to fetch guesses" },
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
    const { gameRoundId, latitude, longitude, timeSeconds, timeout } = body;

    // Get the round and check game membership
    const round = await db
      .select({
        id: gameRounds.id,
        gameId: gameRounds.gameId,
        locationId: gameRounds.locationId,
        locationSource: gameRounds.locationSource,
        roundNumber: gameRounds.roundNumber,
        gameType: gameRounds.gameType,
        groupId: games.groupId,
        userId: games.userId,
        mode: games.mode,
        currentRound: games.currentRound,
        country: games.country,
      })
      .from(gameRounds)
      .innerJoin(games, eq(gameRounds.gameId, games.id))
      .where(eq(gameRounds.id, gameRoundId))
      .get();

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    // Check if round is released
    if (round.roundNumber > round.currentRound) {
      return NextResponse.json(
        { error: "Diese Runde ist noch nicht freigegeben" },
        { status: 403 }
      );
    }

    // Authorization check based on game mode
    if (round.mode === "group") {
      // Group games: check group membership
      if (!round.groupId) {
        return NextResponse.json({ error: "Invalid game state" }, { status: 400 });
      }
      const membership = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, round.groupId),
            eq(groupMembers.userId, session.user.id)
          )
        )
        .get();

      if (!membership) {
        return NextResponse.json({ error: "Not a member" }, { status: 403 });
      }
    } else {
      // Solo/Training games: check if user owns the game
      if (round.userId !== session.user.id) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Check if user already guessed this round
    const existingGuess = await db
      .select()
      .from(guesses)
      .where(
        and(
          eq(guesses.gameRoundId, gameRoundId),
          eq(guesses.userId, session.user.id)
        )
      )
      .get();

    if (existingGuess) {
      return NextResponse.json(
        { error: "Already guessed this round" },
        { status: 400 }
      );
    }

    // Get location coordinates - query correct table based on locationSource
    const effectiveGameType = round.gameType || `country:${round.country}`;
    const isImage = isImageGameType(effectiveGameType);

    let location: { latitude: number; longitude: number } | undefined;

    if (round.locationSource === "worldLocations") {
      const worldLoc = await db
        .select({ latitude: worldLocations.latitude, longitude: worldLocations.longitude })
        .from(worldLocations)
        .where(eq(worldLocations.id, round.locationId))
        .get();
      location = worldLoc;
    } else if (round.locationSource === "imageLocations" || isImage) {
      // Image-based locations use x/y pixel coordinates
      const imageLoc = await db
        .select({ x: imageLocations.x, y: imageLocations.y })
        .from(imageLocations)
        .where(eq(imageLocations.id, round.locationId))
        .get();
      if (imageLoc) {
        // For ImageMap, lat=y and lng=x (Leaflet CRS.Simple convention)
        location = { latitude: imageLoc.y, longitude: imageLoc.x };
      }
    } else {
      const countryLoc = await db
        .select({ latitude: locations.latitude, longitude: locations.longitude })
        .from(locations)
        .where(eq(locations.id, round.locationId))
        .get();
      location = countryLoc;
    }

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Calculate distance
    let distanceKm: number;
    if (timeout) {
      // Get timeout penalty from game type config (always in km)
      const gameTypeConfig = getGameTypeConfig(effectiveGameType);
      distanceKm = gameTypeConfig.timeoutPenalty;
    } else if (isImage) {
      // For image maps: use pixel distance (92px = 10m)
      distanceKm = calculatePixelDistance(
        longitude, // x = lng
        latitude,  // y = lat
        location.longitude,
        location.latitude
      );
    } else {
      // For geo maps: use Haversine formula
      distanceKm = calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude
      );
    }

    // Save guess
    const guessId = nanoid();
    await db.insert(guesses).values({
      id: guessId,
      gameRoundId,
      userId: session.user.id,
      latitude: timeout ? null : latitude,
      longitude: timeout ? null : longitude,
      distanceKm,
      timeSeconds: timeSeconds || null,
      createdAt: new Date(),
    });

    // Calculate score based on game type
    const score = calculateScore(distanceKm, effectiveGameType);

    return NextResponse.json({
      id: guessId,
      distanceKm,
      score,
      gameType: effectiveGameType,
      targetLatitude: location.latitude,
      targetLongitude: location.longitude,
    });
  } catch (error) {
    console.error("Error creating guess:", error);
    return NextResponse.json(
      { error: "Failed to create guess" },
      { status: 500 }
    );
  }
}

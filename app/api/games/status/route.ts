import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { games, gameRounds, guesses } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
  }

  // Get active game for this group
  const currentGame = await db
    .select({
      id: games.id,
      currentRound: games.currentRound,
      name: games.name,
      locationsPerRound: games.locationsPerRound,
      status: games.status,
    })
    .from(games)
    .where(and(eq(games.groupId, groupId), eq(games.status, "active")))
    .orderBy(desc(games.createdAt))
    .get();

  if (!currentGame) {
    return NextResponse.json({
      gameId: null,
      currentRound: 0,
      userCompletedRounds: 0,
      gameName: null,
      locationsPerRound: 0,
    });
  }

  // Calculate user's completed rounds
  const roundStats = await db
    .select({
      roundNumber: gameRounds.roundNumber,
      totalLocations: sql<number>`COUNT(DISTINCT ${gameRounds.id})`.as("totalLocations"),
      userGuesses: sql<number>`COUNT(DISTINCT ${guesses.id})`.as("userGuesses"),
    })
    .from(gameRounds)
    .leftJoin(
      guesses,
      and(
        eq(guesses.gameRoundId, gameRounds.id),
        eq(guesses.userId, session.user.id)
      )
    )
    .where(eq(gameRounds.gameId, currentGame.id))
    .groupBy(gameRounds.roundNumber);

  const userCompletedRounds = roundStats.filter(
    (r) => r.totalLocations > 0 && r.userGuesses === r.totalLocations
  ).length;

  return NextResponse.json({
    gameId: currentGame.id,
    currentRound: currentGame.currentRound,
    userCompletedRounds,
    gameName: currentGame.name,
    locationsPerRound: currentGame.locationsPerRound,
  });
}

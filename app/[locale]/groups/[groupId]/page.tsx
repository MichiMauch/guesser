import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { groups, groupMembers, locations, games, users, guesses, gameRounds } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import Leaderboard from "@/components/Leaderboard";
import InviteCode from "@/components/InviteCode";
import RoundControlPanel from "@/components/RoundControlPanel";
import LeaveGroupButton from "@/components/LeaveGroupButton";
import GameStatusPoller from "@/components/GameStatusPoller";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SetPageTitle } from "@/components/SetPageTitle";

async function getGroupData(groupId: string, userId: string) {
  const membership = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    )
    .get();

  if (!membership) return null;

  const group = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .get();

  if (!group) return null;

  const locationsList = await db.select().from(locations);

  const members = await db
    .select({
      userId: groupMembers.userId,
      role: groupMembers.role,
      name: users.name,
      image: users.image,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  // Only fetch active games - completed games should not be shown here
  const currentGame = await db
    .select()
    .from(games)
    .where(and(eq(games.groupId, groupId), eq(games.status, "active")))
    .orderBy(desc(games.createdAt))
    .get();

  let userCompletedRounds = 0;
  if (currentGame) {
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
          eq(guesses.userId, userId)
        )
      )
      .where(eq(gameRounds.gameId, currentGame.id))
      .groupBy(gameRounds.roundNumber);

    userCompletedRounds = roundStats.filter(
      (r) => r.totalLocations > 0 && r.userGuesses === r.totalLocations
    ).length;
  }

  return { group, membership, locationsCount: locationsList.length, members, currentGame, userCompletedRounds };
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string; locale: string }>;
}) {
  const { groupId, locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const data = await getGroupData(groupId, session.user.id);
  if (!data) notFound();

  const t = await getTranslations("group");
  const tCommon = await getTranslations("common");
  const { group, membership, locationsCount, members, currentGame, userCompletedRounds } = data;
  const isAdmin = membership.role === "admin";
  const isOwner = group.ownerId === session.user.id;

  return (
    <div className="min-h-screen bg-background">
      <SetPageTitle title={group.name} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Play Card - with polling for real-time updates */}
        <div className="max-w-md mx-auto space-y-3">
          <GameStatusPoller
            groupId={groupId}
            initialGameStatus={currentGame ? {
              gameId: currentGame.id,
              currentRound: currentGame.currentRound,
              userCompletedRounds,
              gameName: currentGame.name,
              locationsPerRound: currentGame.locationsPerRound,
            } : null}
            locationsCount={locationsCount}
            isAdmin={isAdmin}
          />
        </div>

        {/* Round Control Panel (Admin) */}
        {currentGame && (
          <RoundControlPanel
            gameId={currentGame.id}
            groupId={groupId}
            currentRound={currentGame.currentRound}
            locationsPerRound={currentGame.locationsPerRound}
            isAdmin={isAdmin}
            userCompletedRounds={userCompletedRounds}
            gameStatus={currentGame.status}
          />
        )}

        {/* History Link */}
        <div className="flex justify-end">
          <Link
            href={`/${locale}/groups/${groupId}/history`}
            className="text-primary hover:text-primary-light text-body-small font-medium flex items-center gap-1"
          >
            {t("showHistory")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Leaderboard */}
        <Leaderboard groupId={groupId} blurred={!isAdmin} />

        {isAdmin && (
          <div className="flex justify-end">
            <a
              href={`/${locale}/groups/${groupId}/leaderboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-light text-body-small font-medium flex items-center gap-1"
            >
              {t("showLeaderboard")}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {/* Two Column: Invite Code & Members */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InviteCode code={group.inviteCode} />

          <Card variant="surface" padding="lg">
            <h2 className="text-h3 text-text-primary mb-4">
              {t("members")} ({members.length})
            </h2>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors"
                >
                  <Avatar
                    src={member.image}
                    name={member.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {member.name}
                    </p>
                  </div>
                  {member.role === "admin" && (
                    <Badge variant="primary" size="sm">
                      {tCommon("admin")}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Leave/Delete Group */}
        <div className="max-w-md mx-auto">
          <Card variant="surface" padding="lg">
            <h2 className="text-h3 text-text-primary mb-2">
              {isOwner ? t("deleteGroup") : t("leaveGroup")}
            </h2>
            <p className="text-body-small text-text-secondary mb-4">
              {isOwner ? t("deleteGroupInfo") : t("leaveGroupInfo")}
            </p>
            <LeaveGroupButton groupId={groupId} isOwner={isOwner} />
          </Card>
        </div>
      </main>
    </div>
  );
}

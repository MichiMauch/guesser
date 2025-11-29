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
import StartGameButton from "@/components/StartGameButton";
import RoundControlPanel from "@/components/RoundControlPanel";
import PlayButton from "@/components/PlayButton";
import LeaveGroupButton from "@/components/LeaveGroupButton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

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

  const currentGame = await db
    .select()
    .from(games)
    .where(eq(games.groupId, groupId))
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
      {/* Hero Section */}
      <div className="bg-surface-1/50 border-b border-glass-border">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <h2 className="text-h1 text-text-primary mb-1">{group.name}</h2>
          {currentGame && (
            <p className="text-body text-text-secondary">
              {t("roundLocations", { round: currentGame.currentRound, count: group.locationsPerRound })}
            </p>
          )}
          {isAdmin && (
            <Badge variant="primary" size="sm" className="mt-2">
              {tCommon("admin")}
            </Badge>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {currentGame?.status === "completed" ? (
          /* Completed Game View */
          <>
            <Card variant="surface" padding="lg" className="border-success/30 bg-success/5">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20">
                  <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-h3 text-success">{t("gameCompleted")}</p>
                {isAdmin && <StartGameButton groupId={groupId} />}
              </div>
            </Card>

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

            <Leaderboard groupId={groupId} blurred={false} />

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

            {/* Leave/Delete Group */}
            <Card variant="surface" padding="lg">
              <h2 className="text-h3 text-text-primary mb-2">
                {isOwner ? t("deleteGroup") : t("leaveGroup")}
              </h2>
              <p className="text-body-small text-text-secondary mb-4">
                {isOwner ? t("deleteGroupInfo") : t("leaveGroupInfo")}
              </p>
              <LeaveGroupButton groupId={groupId} isOwner={isOwner} />
            </Card>
          </>
        ) : (
          /* Active Game / No Game View */
          <>
            {/* Play Card */}
            <div className="max-w-md mx-auto">
              {currentGame && locationsCount >= group.locationsPerRound ? (
                <PlayButton
                  groupId={groupId}
                  currentRound={currentGame.currentRound}
                  userCompletedRounds={userCompletedRounds}
                />
              ) : locationsCount < group.locationsPerRound ? (
                <Card variant="surface" padding="lg" className="opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-surface-3 flex items-center justify-center">
                      <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-h3 text-text-muted">{t("play")}</h3>
                      <p className="text-body-small text-text-muted">
                        {t("minLocationsRequired", { count: group.locationsPerRound })}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : isAdmin ? (
                <StartGameButton groupId={groupId} />
              ) : (
                <Card variant="surface" padding="lg" className="opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-surface-3 flex items-center justify-center">
                      <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-h3 text-text-muted">{t("play")}</h3>
                      <p className="text-body-small text-text-muted">{t("noActiveGame")}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Round Control Panel (Admin) */}
            {currentGame && (
              <RoundControlPanel
                gameId={currentGame.id}
                groupId={groupId}
                currentRound={currentGame.currentRound}
                locationsPerRound={group.locationsPerRound}
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

            {/* Invite Code */}
            <InviteCode code={group.inviteCode} />

            {/* Members */}
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

            {/* Settings (Admin) */}
            {isAdmin && (
              <Card variant="surface" padding="lg">
                <h2 className="text-h3 text-text-primary mb-4">{t("settings")}</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-glass-border">
                    <span className="text-text-secondary">{t("locationsPerRound")}</span>
                    <span className="font-medium text-text-primary">{group.locationsPerRound}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-glass-border">
                    <span className="text-text-secondary">{t("timeLimit")}</span>
                    <span className="font-medium text-text-primary">
                      {group.timeLimitSeconds
                        ? t("timeLimitSeconds", { seconds: group.timeLimitSeconds })
                        : t("noTimeLimit")}
                    </span>
                  </div>
                  <Link href={`/${locale}/groups/${groupId}/settings`}>
                    <Button variant="secondary" size="md" fullWidth>
                      {t("changeSettings")}
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Leave/Delete Group */}
            <Card variant="surface" padding="lg">
              <h2 className="text-h3 text-text-primary mb-2">
                {isOwner ? t("deleteGroup") : t("leaveGroup")}
              </h2>
              <p className="text-body-small text-text-secondary mb-4">
                {isOwner ? t("deleteGroupInfo") : t("leaveGroupInfo")}
              </p>
              <LeaveGroupButton groupId={groupId} isOwner={isOwner} />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// NextAuth Tables
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp" }),
  image: text("image"),
  hintEnabled: integer("hintEnabled", { mode: "boolean" }).default(false),
  isSuperAdmin: integer("isSuperAdmin", { mode: "boolean" }).default(false),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Game Tables

// Groups
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("inviteCode").notNull().unique(),
  ownerId: text("ownerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  locationsPerRound: integer("locationsPerRound").notNull().default(5), // How many locations per round
  timeLimitSeconds: integer("timeLimitSeconds"), // null = no limit
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

// Group Members
export const groupMembers = sqliteTable(
  "groupMembers",
  {
    groupId: text("groupId")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
    joinedAt: integer("joinedAt", { mode: "timestamp" }).notNull(),
  },
  (gm) => [primaryKey({ columns: [gm.groupId, gm.userId] })]
);

// Locations (global - shared across all groups)
export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameDe: text("name_de"),
  nameEn: text("name_en"),
  nameSl: text("name_sl"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  country: text("country").default("Switzerland"),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

// World Locations (for world quiz categories)
export const worldLocations = sqliteTable("worldLocations", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  category: text("category").notNull(), // "highest-mountains", "capitals", "famous-places"
  name: text("name").notNull(),
  nameDe: text("name_de"),
  nameEn: text("name_en"),
  nameSl: text("name_sl"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  countryCode: text("countryCode"), // ISO code (e.g., "NP", "US")
  additionalInfo: text("additionalInfo"), // JSON for extra info (elevation, etc.)
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

// Games
export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  groupId: text("groupId")
    .references(() => groups.id, { onDelete: "cascade" }), // NULLABLE for solo/training games
  userId: text("userId")
    .references(() => users.id, { onDelete: "cascade" }), // Owner for solo/training games
  mode: text("mode", { enum: ["group", "solo", "training"] }).notNull().default("group"), // Game mode
  name: text("name"), // Game name (optional, set by admin)
  country: text("country").notNull().default("switzerland"), // Country key (switzerland, slovenia) - legacy
  gameType: text("gameType"), // New: "country:switzerland", "world:capitals" etc. null = use country field
  locationsPerRound: integer("locationsPerRound").notNull().default(5), // How many locations per round for this game
  timeLimitSeconds: integer("timeLimitSeconds"), // null = no limit
  weekNumber: integer("weekNumber"), // Legacy: ISO week (optional for backwards compatibility)
  year: integer("year"), // Legacy: year (optional for backwards compatibility)
  status: text("status", { enum: ["active", "completed"] }).notNull().default("active"),
  currentRound: integer("currentRound").notNull().default(1), // Currently released round (1 = only round 1 playable)
  leaderboardRevealed: integer("leaderboardRevealed", { mode: "boolean" }).notNull().default(false), // Admin can reveal leaderboard
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

// Game Rounds
export const gameRounds = sqliteTable("gameRounds", {
  id: text("id").primaryKey(),
  gameId: text("gameId")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  roundNumber: integer("roundNumber").notNull(), // Which round/day (1, 2, 3...)
  locationIndex: integer("locationIndex").notNull().default(1), // Position within round (1-N)
  locationId: text("locationId").notNull(), // No FK constraint - can reference locations OR worldLocations
  locationSource: text("locationSource", { enum: ["locations", "worldLocations", "imageLocations"] }).notNull().default("locations"),
  country: text("country").notNull().default("switzerland"), // Country key for this round (can differ from game.country)
  gameType: text("gameType"), // Full game type ID for this round (e.g., "country:switzerland", "world:capitals")
  timeLimitSeconds: integer("timeLimitSeconds"), // Time limit for this round (null = no limit)
});

// Player Guesses
export const guesses = sqliteTable("guesses", {
  id: text("id").primaryKey(),
  gameRoundId: text("gameRoundId")
    .notNull()
    .references(() => gameRounds.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  latitude: real("latitude"), // nullable for timeouts
  longitude: real("longitude"), // nullable for timeouts
  distanceKm: real("distanceKm").notNull(),
  timeSeconds: integer("timeSeconds"), // nullable, how long it took
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

// Image Locations (for image-based maps like garden, office, etc.)
export const imageLocations = sqliteTable("imageLocations", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  imageMapId: text("imageMapId").notNull(), // "garten", "buero", etc.
  name: text("name").notNull(),
  nameDe: text("name_de"),
  nameEn: text("name_en"),
  nameSl: text("name_sl"),
  x: real("x").notNull(), // Pixel X-Koordinate
  y: real("y").notNull(), // Pixel Y-Koordinate
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).default("medium"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
});

// User Stats (for training mode persistence)
export const userStats = sqliteTable("userStats", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameType: text("gameType").notNull(), // e.g., "country:switzerland", "world:capitals"
  totalGames: integer("totalGames").notNull().default(0),
  totalRounds: integer("totalRounds").notNull().default(0),
  totalDistance: real("totalDistance").notNull().default(0),
  totalScore: integer("totalScore").notNull().default(0),
  bestScore: integer("bestScore").notNull().default(0), // best single round score
  averageDistance: real("averageDistance").notNull().default(0),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type WorldLocation = typeof worldLocations.$inferSelect;
export type ImageLocation = typeof imageLocations.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GameRound = typeof gameRounds.$inferSelect;
export type Guess = typeof guesses.$inferSelect;
export type UserStats = typeof userStats.$inferSelect;

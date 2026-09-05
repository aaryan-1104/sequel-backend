import { pgTable, text, real, integer, boolean, jsonb, index, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email"),
  salt: text("salt").default(""),
  hash: text("hash").default(""),
  avatar: text("avatar").default("🍿"),
  bio: text("bio").default(""),
  genres: text("genres").default(""),
  tmdbSessionId: text("tmdb_session_id").default(""),
  tmdbAccountId: text("tmdb_account_id").default(""),
  tmdbAccessToken: text("tmdb_access_token").default(""),
  createdAt: text("created_at").notNull()
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_username").on(table.username),
]);

export const mediaItems = pgTable("media_items", {
  id: text("id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceId: text("source_id"),
  tmdbId: text("tmdb_id"),
  tvdbId: text("tvdb_id"),
  imdbId: text("imdb_id"),
  title: text("title").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  rating: real("rating"),
  poster: text("poster"),
  backdrop: text("backdrop"),
  releaseDate: text("release_date"),
  genres: jsonb("genres").$type<string[]>(),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>(),
  userProgress: jsonb("user_progress"),
  totalEpisodes: integer("total_episodes"),
  watchedEpisodes: jsonb("watched_episodes").$type<Record<string, boolean>>(),
  favorite: boolean("favorite").default(false),
  tvSpecifics: jsonb("tv_specifics"),
  bookSpecifics: jsonb("book_specifics"),
  rawMetadata: jsonb("raw_metadata"),
  addedAt: text("added_at").notNull(),
  lastUpdatedAt: text("last_updated_at")
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  index("idx_media_items_user").on(table.userId),
  index("idx_media_items_user_type").on(table.userId, table.type),
  index("idx_media_items_user_status").on(table.userId, table.status),
]);

export const diaryEntries = pgTable("diary_entries", {
  id: text("id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id"),
  mediaType: text("media_type"),
  title: text("title"),
  poster: text("poster"),
  rating: real("rating"),
  date: text("date"),
  thoughts: text("thoughts"),
  entryType: text("entry_type"),
  seasonNumber: integer("season_number"),
  episodeNumber: integer("episode_number"),
  isRewatch: boolean("is_rewatch").default(false),
  createdAt: text("created_at").notNull()
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  index("idx_diary_entries_user").on(table.userId),
  index("idx_diary_entries_date").on(table.userId, table.date),
]);

export const customLists = pgTable("custom_lists", {
  id: text("id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isTmdbSync: boolean("is_tmdb_sync").default(false),
  tmdbListId: text("tmdb_list_id"),
  coverImage: text("cover_image"),
  itemIds: jsonb("item_ids").$type<string[]>().default([]),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at")
}, (table) => [
  primaryKey({ columns: [table.userId, table.id] }),
  index("idx_custom_lists_user").on(table.userId),
]);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  customCollections: jsonb("custom_collections").default([]),
  dismissedRecommendations: jsonb("dismissed_recommendations").default([]),
  settings: jsonb("settings").default({}),
  updatedAt: text("updated_at")
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull()
}, (table) => [
  index("idx_sessions_user").on(table.userId),
]);

export const userPushSubscriptions = pgTable("user_push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull().default("web"), // 'web' | 'fcm' | 'apns'
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh"),
  auth: text("auth"),
  deviceInfo: text("device_info"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
}, (table) => [
  index("idx_push_user").on(table.userId),
  index("idx_push_endpoint").on(table.endpoint),
]);

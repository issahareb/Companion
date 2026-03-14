import { pgTable, text, serial, jsonb, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const savedLoadouts = pgTable("saved_loadouts", {
  id: serial("id").primaryKey(),
  bungieMembershipId: text("bungie_membership_id").notNull(),
  name: text("name").notNull(),
  items: jsonb("items").$type<Record<string, any>>().notNull(),
  artifactMods: jsonb("artifact_mods").$type<any[]>().default([]),
  classType: integer("class_type"),
  shareCode: text("share_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoadoutSchema = createInsertSchema(savedLoadouts).omit({
  id: true,
  createdAt: true,
});

export type SavedLoadout = typeof savedLoadouts.$inferSelect;
export type InsertLoadout = z.infer<typeof insertLoadoutSchema>;

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  bungieMembershipId: text("bungie_membership_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

export const aiUsage = pgTable("ai_usage", {
  id: serial("id").primaryKey(),
  bungieMembershipId: text("bungie_membership_id").notNull(),
  usageDate: text("usage_date").notNull(),
  requestCount: integer("request_count").notNull().default(0),
}, (table) => [
  uniqueIndex("ai_usage_member_date_idx").on(table.bungieMembershipId, table.usageDate),
]);

export type AiUsage = typeof aiUsage.$inferSelect;

export const userPremium = pgTable("user_premium", {
  id: serial("id").primaryKey(),
  bungieMembershipId: text("bungie_membership_id").notNull().unique(),
  isPremium: integer("is_premium").notNull().default(0),
  premiumSince: timestamp("premium_since"),
  premiumUntil: timestamp("premium_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserPremium = typeof userPremium.$inferSelect;

export * from "./models/chat";

import { pgTable, text, serial, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
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

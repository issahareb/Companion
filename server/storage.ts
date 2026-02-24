import { db } from "./db";
import {
  savedLoadouts,
  type InsertLoadout,
  type SavedLoadout
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLoadouts(bungieMembershipId: string): Promise<SavedLoadout[]>;
  createLoadout(loadout: InsertLoadout): Promise<SavedLoadout>;
}

export class DatabaseStorage implements IStorage {
  async getLoadouts(bungieMembershipId: string): Promise<SavedLoadout[]> {
    return await db.select().from(savedLoadouts).where(eq(savedLoadouts.bungieMembershipId, bungieMembershipId));
  }

  async createLoadout(loadout: InsertLoadout): Promise<SavedLoadout> {
    const [created] = await db.insert(savedLoadouts).values(loadout).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
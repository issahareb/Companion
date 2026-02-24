import { db } from "./db";
import {
  savedLoadouts,
  type InsertLoadout,
  type SavedLoadout
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getLoadouts(bungieMembershipId: string): Promise<SavedLoadout[]>;
  getLoadoutByShareCode(shareCode: string): Promise<SavedLoadout | undefined>;
  createLoadout(loadout: InsertLoadout): Promise<SavedLoadout>;
  deleteLoadout(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getLoadouts(bungieMembershipId: string): Promise<SavedLoadout[]> {
    return await db.select().from(savedLoadouts).where(eq(savedLoadouts.bungieMembershipId, bungieMembershipId));
  }

  async getLoadoutByShareCode(shareCode: string): Promise<SavedLoadout | undefined> {
    const [loadout] = await db.select().from(savedLoadouts).where(eq(savedLoadouts.shareCode, shareCode));
    return loadout;
  }

  async createLoadout(loadout: InsertLoadout): Promise<SavedLoadout> {
    const [created] = await db.insert(savedLoadouts).values(loadout).returning();
    return created;
  }

  async deleteLoadout(id: number): Promise<boolean> {
    const result = await db.delete(savedLoadouts).where(eq(savedLoadouts.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
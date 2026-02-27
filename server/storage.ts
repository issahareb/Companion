import { db } from "./db";
import {
  savedLoadouts,
  sessions,
  type InsertLoadout,
  type SavedLoadout,
  type Session,
  type InsertSession
} from "@shared/schema";
import { eq, lt } from "drizzle-orm";

export interface IStorage {
  getLoadouts(bungieMembershipId: string): Promise<SavedLoadout[]>;
  getLoadoutByShareCode(shareCode: string): Promise<SavedLoadout | undefined>;
  createLoadout(loadout: InsertLoadout): Promise<SavedLoadout>;
  deleteLoadout(id: number): Promise<boolean>;

  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSessionTokens(id: string, accessToken: string, refreshToken: string | null, tokenExpiresAt: Date): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
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

  async createSession(session: InsertSession): Promise<Session> {
    const [created] = await db.insert(sessions).values(session).returning();
    return created;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async updateSessionTokens(id: string, accessToken: string, refreshToken: string | null, tokenExpiresAt: Date): Promise<void> {
    await db.update(sessions).set({ accessToken, refreshToken, tokenExpiresAt }).where(eq(sessions.id, id));
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteExpiredSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.delete(sessions).where(lt(sessions.createdAt, cutoff));
  }
}

export const storage = new DatabaseStorage();
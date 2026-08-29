import { db } from "./db";
import { sql } from "drizzle-orm";
import {
  savedLoadouts,
  sessions,
  aiUsage,
  userPremium,
  type InsertLoadout,
  type SavedLoadout,
  type Session,
  type InsertSession,
  type AiUsage,
  type UserPremium,
} from "@shared/schema";
import { eq, lt, and } from "drizzle-orm";
import { encryptToken, decryptToken } from "./tokenCrypto";

function decryptSessionRow(row: Session): Session {
  return {
    ...row,
    accessToken: decryptToken(row.accessToken, `${row.id}:access`),
    refreshToken: row.refreshToken ? decryptToken(row.refreshToken, `${row.id}:refresh`) : row.refreshToken,
  };
}

export interface IStorage {
  getLoadouts(bungieMembershipId: string): Promise<SavedLoadout[]>;
  getLoadoutByShareCode(shareCode: string): Promise<SavedLoadout | undefined>;
  createLoadout(loadout: InsertLoadout): Promise<SavedLoadout>;
  deleteLoadout(id: number, bungieMembershipId: string): Promise<boolean>;

  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSessionTokens(id: string, accessToken: string, refreshToken: string | null, tokenExpiresAt: Date): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;

  getAiUsage(bungieMembershipId: string, date: string): Promise<AiUsage | undefined>;
  incrementAiUsage(bungieMembershipId: string, date: string): Promise<AiUsage>;

  getPremiumStatus(bungieMembershipId: string): Promise<UserPremium | undefined>;
  setPremiumStatus(bungieMembershipId: string, isPremium: boolean, premiumUntil?: Date): Promise<UserPremium>;
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

  async deleteLoadout(id: number, bungieMembershipId: string): Promise<boolean> {
    const result = await db.delete(savedLoadouts)
      .where(and(eq(savedLoadouts.id, id), eq(savedLoadouts.bungieMembershipId, bungieMembershipId)))
      .returning();
    return result.length > 0;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [created] = await db.insert(sessions).values({
      ...session,
      accessToken: encryptToken(session.accessToken, `${session.id}:access`),
      refreshToken: session.refreshToken ? encryptToken(session.refreshToken, `${session.id}:refresh`) : null,
    }).returning();
    return decryptSessionRow(created);
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!session) return undefined;
    try {
      return decryptSessionRow(session);
    } catch {
      // Pre-encryption plaintext session or tampered ciphertext: treat as invalid.
      await this.deleteSession(id);
      return undefined;
    }
  }

  async updateSessionTokens(id: string, accessToken: string, refreshToken: string | null, tokenExpiresAt: Date): Promise<void> {
    await db.update(sessions).set({
      accessToken: encryptToken(accessToken, `${id}:access`),
      refreshToken: refreshToken ? encryptToken(refreshToken, `${id}:refresh`) : null,
      tokenExpiresAt,
    }).where(eq(sessions.id, id));
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteExpiredSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    await db.delete(sessions).where(
      sql`${sessions.createdAt} < ${cutoff} OR (${sessions.absoluteExpiry} IS NOT NULL AND ${sessions.absoluteExpiry} < ${now})`
    );
  }

  async getAiUsage(bungieMembershipId: string, date: string): Promise<AiUsage | undefined> {
    const [usage] = await db.select().from(aiUsage).where(
      and(eq(aiUsage.bungieMembershipId, bungieMembershipId), eq(aiUsage.usageDate, date))
    );
    return usage;
  }

  async incrementAiUsage(bungieMembershipId: string, date: string): Promise<AiUsage> {
    const [result] = await db.insert(aiUsage)
      .values({ bungieMembershipId, usageDate: date, requestCount: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.bungieMembershipId, aiUsage.usageDate],
        set: { requestCount: sql`${aiUsage.requestCount} + 1` },
      })
      .returning();
    return result;
  }

  async getPremiumStatus(bungieMembershipId: string): Promise<UserPremium | undefined> {
    const [premium] = await db.select().from(userPremium).where(eq(userPremium.bungieMembershipId, bungieMembershipId));
    return premium;
  }

  async setPremiumStatus(bungieMembershipId: string, isPremium: boolean, premiumUntil?: Date): Promise<UserPremium> {
    const existing = await this.getPremiumStatus(bungieMembershipId);
    if (existing) {
      const [updated] = await db.update(userPremium)
        .set({
          isPremium: isPremium ? 1 : 0,
          premiumSince: isPremium && !existing.premiumSince ? new Date() : existing.premiumSince,
          premiumUntil: premiumUntil || existing.premiumUntil,
        })
        .where(eq(userPremium.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userPremium)
      .values({
        bungieMembershipId,
        isPremium: isPremium ? 1 : 0,
        premiumSince: isPremium ? new Date() : undefined,
        premiumUntil,
      })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
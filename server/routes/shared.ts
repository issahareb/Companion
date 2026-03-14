import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { refreshBungieToken, BungieApiError } from "../bungie";

export const COOKIE_NAME = 'session_id';
const isDev = process.env.NODE_ENV !== 'production';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !isDev,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  signed: true,
};

export function handleBungieError(err: any, res: any, defaultMessage: string) {
  if (err instanceof BungieApiError) {
    const status = err.errorType === 'auth' ? 401
      : err.errorType === 'maintenance' ? 503
      : err.errorType === 'rate_limit' ? 429
      : err.errorType === 'timeout' ? 504
      : 502;
    return res.status(status).json({
      message: err.message,
      errorType: err.errorType,
      errorCode: err.errorCode,
    });
  }
  console.error(`[bungie] ${defaultMessage}:`, err.message);
  res.status(502).json({ message: err.message || defaultMessage });
}

export function handleAiError(err: any, res: any, label: string) {
  console.error(`[ai] ${label} failed:`, err.message);
  const status = err?.status ?? err?.response?.status ?? err?.statusCode;
  if (status === 429 || err?.code === 'rate_limit_exceeded' || err?.type === 'rate_limit_error') {
    return res.status(429).json({ message: 'AI rate limit exceeded. Please try again later.' });
  }
  res.status(500).json({ message: 'AI analysis failed. Please try again.' });
}

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await response.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.signedCookies?.[COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const session = await storage.getSession(sessionId);
  if (!session) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(401).json({ message: 'Session expired' });
  }

  if (session.tokenExpiresAt < new Date()) {
    if (session.refreshToken) {
      try {
        const tokenData = await refreshBungieToken(session.refreshToken);
        const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        await storage.updateSessionTokens(
          session.id,
          tokenData.access_token,
          tokenData.refresh_token || session.refreshToken,
          newExpiresAt
        );
        req.sessionAccessToken = tokenData.access_token;
        req.sessionMembershipId = session.bungieMembershipId;
        return next();
      } catch (err) {
        console.error('[auth] Token refresh failed:', err);
        await storage.deleteSession(session.id);
        res.clearCookie(COOKIE_NAME, { path: '/' });
        return res.status(401).json({ message: 'Session expired, please log in again' });
      }
    } else {
      await storage.deleteSession(session.id);
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.status(401).json({ message: 'Access token expired' });
    }
  }

  req.sessionAccessToken = session.accessToken;
  req.sessionMembershipId = session.bungieMembershipId;
  next();
}

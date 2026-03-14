import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { storage } from "../storage";
import { exchangeToken, fetchMemberships, refreshBungieToken } from "../bungie";
import { handleBungieError, verifyTurnstileToken, COOKIE_NAME, COOKIE_OPTIONS, requireAuth } from "./shared";

const router = Router();

router.get('/api/config/turnstile', (_req, res) => {
  const siteKey = process.env.TURNSTILE_SITE_KEY || '';
  res.json({ enabled: !!siteKey, siteKey });
});

router.post('/api/verify-turnstile', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required' });
    }
    const valid = await verifyTurnstileToken(token);
    res.json({ success: valid });
  } catch {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

router.post('/api/auth/login', async (req, res) => {
  try {
    const { code, turnstileToken } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code required' });
    }
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return res.status(403).json({ message: 'CAPTCHA verification required' });
      }
      const valid = await verifyTurnstileToken(turnstileToken);
      if (!valid) {
        return res.status(403).json({ message: 'CAPTCHA verification failed' });
      }
    }

    const tokenData = await exchangeToken(code);
    const membership = await fetchMemberships(tokenData.access_token);

    const sessionId = nanoid(32);
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await storage.createSession({
      id: sessionId,
      bungieMembershipId: membership.membershipId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiresAt,
    });

    res.cookie(COOKIE_NAME, sessionId, COOKIE_OPTIONS);
    res.json({
      membershipId: membership.membershipId,
      membershipType: membership.membershipType,
      displayName: membership.displayName,
      iconPath: membership.iconPath,
    });
  } catch (err: any) {
    handleBungieError(err, res, 'Login failed');
  }
});

router.post('/api/auth/logout', async (req, res) => {
  const sessionId = req.signedCookies?.[COOKIE_NAME];
  if (sessionId) {
    await storage.deleteSession(sessionId);
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

router.get('/api/auth/me', async (req, res) => {
  const sessionId = req.signedCookies?.[COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const session = await storage.getSession(sessionId);
  if (!session) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(401).json({ message: 'Session expired' });
  }

  let accessToken = session.accessToken;

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
        accessToken = tokenData.access_token;
      } catch {
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

  try {
    const membership = await fetchMemberships(accessToken);
    res.json({
      membershipId: membership.membershipId,
      membershipType: membership.membershipType,
      displayName: membership.displayName,
      iconPath: membership.iconPath,
    });
  } catch (err: any) {
    if (err.message?.includes('401') || err.message?.includes('auth')) {
      await storage.deleteSession(session.id);
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.status(401).json({ message: 'Session invalid' });
    }
    handleBungieError(err, res, 'Failed to fetch profile');
  }
});

export default router;

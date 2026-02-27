import { useState, useEffect, useRef, useCallback } from 'react';

const BUNGIE_CLIENT_ID = '51625';
const BUNGIE_AUTH_URL = `https://www.bungie.net/en/OAuth/Authorize?client_id=${BUNGIE_CLIENT_ID}&response_type=code`;

export interface DestinyProfile {
  membershipId: string;
  membershipType: number;
  displayName: string;
  emblemPath?: string;
}

export function useBungieAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [destinyProfile, setDestinyProfile] = useState<DestinyProfile | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const hasAttemptedAuth = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');

    if (authCode && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      setIsAuthenticating(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      exchangeCodeForToken(authCode);
    } else {
      checkExistingSession();
    }
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const checkExistingSession = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const profile: DestinyProfile = {
          membershipId: data.membershipId,
          membershipType: data.membershipType,
          displayName: data.displayName,
          emblemPath: data.iconPath,
        };
        setDestinyProfile(profile);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
    } finally {
      setIsFetchingProfile(false);
    }
  }, []);

  const exchangeCodeForToken = useCallback(async (code: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Login failed');
      }

      const data = await res.json();
      const profile: DestinyProfile = {
        membershipId: data.membershipId,
        membershipType: data.membershipType,
        displayName: data.displayName,
        emblemPath: data.iconPath,
      };

      setDestinyProfile(profile);
      setIsAuthenticated(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Auth error:', err);
      setAuthError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsAuthenticating(false);
      setIsFetchingProfile(false);
    }
  }, []);

  const login = useCallback(() => {
    window.location.href = BUNGIE_AUTH_URL;
  }, []);

  const logout = useCallback(async () => {
    abortControllerRef.current?.abort();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    setDestinyProfile(null);
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    isAuthenticating,
    isFetchingProfile,
    destinyProfile,
    authError,
    login,
    logout
  };
}

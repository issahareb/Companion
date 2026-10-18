import { useState, useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

const BUNGIE_CLIENT_ID = '51625';
const BUNGIE_AUTH_URL = `https://www.bungie.net/en/OAuth/Authorize?client_id=${BUNGIE_CLIENT_ID}&response_type=code`;
const TURNSTILE_STORAGE_KEY = 'bungie_turnstile_token';
const OAUTH_STATE_KEY = 'gg_bungie_oauth_state';

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
    const oauthError = urlParams.get('error');

    if (oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setAuthError('Anmeldung wurde abgebrochen oder von Bungie abgelehnt.');
      checkExistingSession();
      return;
    }

    if (authCode && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      window.history.replaceState({}, document.title, window.location.pathname);
      const returnedState = urlParams.get('state');
      let expectedState: string | null = null;
      try {
        expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
        sessionStorage.removeItem(OAUTH_STATE_KEY);
      } catch {}
      // A missing/mismatched state is a potential login CSRF attempt.
      if (!returnedState || !expectedState || returnedState !== expectedState) {
        setAuthError('Sicherheitsprüfung der Bungie-Anmeldung fehlgeschlagen. Bitte melde dich erneut an.');
        setIsFetchingProfile(false);
        return;
      }
      setIsAuthenticating(true);
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

    let turnstileToken: string | null = null;
    try {
      turnstileToken = sessionStorage.getItem(TURNSTILE_STORAGE_KEY);
      sessionStorage.removeItem(TURNSTILE_STORAGE_KEY);
    } catch {}

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnstileToken ? { code, turnstileToken } : { code }),
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

  const login = useCallback((turnstileToken?: string | null) => {
    try {
      const randomBytes = new Uint8Array(24);
      crypto.getRandomValues(randomBytes);
      const state = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem(OAUTH_STATE_KEY, state);
      if (turnstileToken) sessionStorage.setItem(TURNSTILE_STORAGE_KEY, turnstileToken);
      const destination = new URL(BUNGIE_AUTH_URL);
      destination.searchParams.set('state', state);
      window.location.assign(destination.toString());
    } catch {
      setAuthError('Die Anmeldung konnte nicht sicher gestartet werden. Bitte erlaube Sitzungsspeicher im Browser.');
    }
  }, []);

  const logout = useCallback(async () => {
    abortControllerRef.current?.abort();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    queryClient.clear();
    try {
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(TURNSTILE_STORAGE_KEY);
      sessionStorage.removeItem('gg_active_tab');
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

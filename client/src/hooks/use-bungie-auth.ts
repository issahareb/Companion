import { useState, useEffect, useRef } from 'react';

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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [destinyProfile, setDestinyProfile] = useState<DestinyProfile | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const hasAttemptedAuth = useRef(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('bungie_access_token');
    const savedProfile = localStorage.getItem('destiny_profile');
    
    if (savedToken) {
      setAccessToken(savedToken);
      setIsAuthenticated(true);
      if (savedProfile) {
        try {
          setDestinyProfile(JSON.parse(savedProfile));
        } catch (e) {
        }
      }
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');

    if (authCode && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true;
      setIsAuthenticating(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      exchangeCodeForToken(authCode);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken && !destinyProfile) {
      fetchDestinyProfile();
    }
  }, [isAuthenticated, accessToken, destinyProfile]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      const res = await fetch('/api/bungie/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Token exchange failed');
      }

      const data = await res.json();
      const token = data.access_token;
      
      localStorage.setItem('bungie_access_token', token);
      setAccessToken(token);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchDestinyProfile = async () => {
    setIsFetchingProfile(true);
    try {
      const res = await fetch('/api/bungie/membership', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch profile');
      }

      const membership = await res.json();

      const profile: DestinyProfile = {
        membershipId: membership.membershipId,
        membershipType: membership.membershipType,
        displayName: membership.displayName,
        emblemPath: membership.iconPath,
      };

      setDestinyProfile(profile);
      localStorage.setItem('destiny_profile', JSON.stringify(profile));
    } catch (err) {
      console.error('Profile error:', err);
      setAuthError('Destiny-Profil konnte nicht geladen werden.');
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const login = () => {
    window.location.href = BUNGIE_AUTH_URL;
  };

  const logout = () => {
    localStorage.removeItem('bungie_access_token');
    localStorage.removeItem('destiny_profile');
    setAccessToken(null);
    setDestinyProfile(null);
    setIsAuthenticated(false);
  };

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

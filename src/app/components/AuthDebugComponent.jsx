"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';

const AuthDebugComponent = () => {
  const { user, loading, authError, isAuthenticated, clearAuthError, supabase } = useAuth();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      setSessionInfo({
        hasSession: !!session,
        user: session?.user?.email || 'No user',
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'No expiry',
        error: error?.message || 'No error'
      });
      
      if (session?.access_token) {
        setTokenInfo({
          tokenLength: session.access_token.length,
          tokenStart: session.access_token.substring(0, 20) + '...',
          refreshToken: !!session.refresh_token,
        });
      } else {
        setTokenInfo(null);
      }
    } catch (err) {
      setSessionInfo({
        hasSession: false,
        error: err.message
      });
    }
  };

  const clearStorageAndReload = () => {
    // Clear all Supabase-related storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth') || key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('supabase.auth') || key.startsWith('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
    
    window.location.reload();
  };

  useEffect(() => {
    checkSession();
  }, [user, authError]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg space-y-4 text-sm">
      <h3 className="font-semibold text-lg">Auth Debug Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded">
          <h4 className="font-medium mb-2">Auth Context State</h4>
          <div className="space-y-1">
            <div>Loading: <span className={loading ? 'text-orange-600' : 'text-green-600'}>{loading.toString()}</span></div>
            <div>Authenticated: <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>{isAuthenticated.toString()}</span></div>
            <div>User Email: <span className="text-blue-600">{user?.email || 'None'}</span></div>
            <div>Auth Error: <span className={authError ? 'text-red-600' : 'text-green-600'}>{authError || 'None'}</span></div>
          </div>
        </div>

        <div className="bg-white p-3 rounded">
          <h4 className="font-medium mb-2">Session Information</h4>
          {sessionInfo ? (
            <div className="space-y-1">
              <div>Has Session: <span className={sessionInfo.hasSession ? 'text-green-600' : 'text-red-600'}>{sessionInfo.hasSession.toString()}</span></div>
              <div>User: <span className="text-blue-600">{sessionInfo.user}</span></div>
              <div>Expires: <span className="text-gray-600">{sessionInfo.expiresAt}</span></div>
              <div>Error: <span className={sessionInfo.error === 'No error' ? 'text-green-600' : 'text-red-600'}>{sessionInfo.error}</span></div>
            </div>
          ) : (
            <div>Loading session info...</div>
          )}
        </div>

        {tokenInfo && (
          <div className="bg-white p-3 rounded">
            <h4 className="font-medium mb-2">Token Information</h4>
            <div className="space-y-1">
              <div>Token Length: <span className="text-blue-600">{tokenInfo.tokenLength}</span></div>
              <div>Token Start: <span className="text-gray-600 font-mono text-xs">{tokenInfo.tokenStart}</span></div>
              <div>Has Refresh: <span className={tokenInfo.refreshToken ? 'text-green-600' : 'text-red-600'}>{tokenInfo.refreshToken.toString()}</span></div>
            </div>
          </div>
        )}

        <div className="bg-white p-3 rounded">
          <h4 className="font-medium mb-2">Environment Check</h4>
          <div className="space-y-1">
            <div>Supabase URL: <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
            </span></div>
            <div>Supabase Key: <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </span></div>
            <div>Environment: <span className="text-blue-600">{process.env.NODE_ENV}</span></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={checkSession} variant="outline" size="sm">
          Refresh Session Info
        </Button>
        
        {authError && (
          <Button onClick={clearAuthError} variant="outline" size="sm">
            Clear Auth Error
          </Button>
        )}
        
        <Button onClick={clearStorageAndReload} variant="destructive" size="sm">
          Clear Storage & Reload
        </Button>
        
        <Button onClick={() => window.location.href = '/login'} variant="outline" size="sm">
          Go to Login
        </Button>
      </div>
    </div>
  );
};

export default AuthDebugComponent;

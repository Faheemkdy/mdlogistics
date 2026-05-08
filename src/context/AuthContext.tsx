import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  is_active?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isMasterAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    }).catch((error) => {
      console.warn('Network error fetching session. The database might be unreachable:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    // Prevent multiple simultaneous fetches for the same user
    if (profile?.id === userId && !loading) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setLoading(false);
      console.warn('Profile fetch timed out. Check database connection.');
    }, 8000); // 8 second timeout

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      clearTimeout(timeoutId);

      if (error) {
        // Handle recursion error specifically
        if (error.code === '42P17') {
           console.error('CRITICAL DB ERROR: Infinite Recursion in RLS policies. Please run the "Performance Boost" SQL script.');
           return;
        }
        throw error;
      }
      
      if (data && data.is_active === false) {
        setProfile(null);
        await supabase.auth.signOut();
        sessionStorage.setItem('auth_notice', 'Your account has been deactivated. Please contact the administrator.');
        return;
      }
      
      setProfile(data);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Profile fetch was aborted due to timeout.');
      } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
         console.warn('Network error fetching profile. This might be due to a database timeout or connection issue.');
      } else {
         console.error('Error fetching profile:', error);
      }
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isMasterAdmin = profile?.username === 'md';
  
  return (
    <AuthContext.Provider value={{ session, user, profile, loading, isMasterAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

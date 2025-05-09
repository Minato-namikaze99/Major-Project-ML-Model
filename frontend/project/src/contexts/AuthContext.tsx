import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';

export interface AdminUser {
  admin_id: string;
  admin_name: string | null;
  email: string | null;
  contact_no: string | null;
}

interface AuthContextType {
  user: AdminUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check localStorage for persisted user
    const stored = localStorage.getItem('admin_user');
    if (stored) {
      try {
        const parsed: AdminUser = JSON.parse(stored);
        setUser(parsed);
        // Remove automatic navigation on component mount
        // navigate('/dashboard');
      } catch {
        localStorage.removeItem('admin_user');
      }
    }
    setLoading(false);
  }, []);  // Remove navigate from dependencies

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Attempting to sign in with email:', email);

      // Fetch admin row (including the hashed password)
      const { data: adminData, error: adminError } = await supabase
        .from('admin_table')
        .select('admin_id, admin_name, email, contact_no, password')
        .eq('email', email)
        .single();

      if (adminError || !adminData) {
        console.error('Email not found or Supabase error:', adminError);
        throw new Error('Email not found');
      }

      console.log('Stored hash:', adminData.password);
      console.log('Input password:', password);

      // Verify the password against the hash
      const isMatch = await bcrypt.compare(password, adminData.password);
      if (!isMatch) {
        console.warn('Invalid password for email:', email);
        throw new Error('Invalid password');
      }

      console.log('Password matches, logging in');

      // Strip off the password before storing user in context/localStorage
      const { password: _, ...userData } = adminData;
      setUser(userData);
      localStorage.setItem('admin_user', JSON.stringify(userData));
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(null);
      localStorage.removeItem('admin_user');
      navigate('/login');
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

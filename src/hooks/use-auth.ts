
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useUsers } from '@/hooks/use-users';

const AUTH_STORAGE_KEY = 'campus-hub-auth';

const getInitialState = (): User | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const item = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (item) {
      const user = JSON.parse(item);
      // Omit pin from the returned user object for security
      const { pin, ...userWithoutPin } = user;
      return userWithoutPin;
    }
  } catch (error) {
    console.error('Error reading from localStorage', error);
  }
  return null;
};

export function useAuth() {
  const [user, setUser] = useState<Omit<User, 'pin'> | null>(getInitialState);
  const { users, isClient: isUsersClient } = useUsers();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    const storedUser = getInitialState();
    
    const handleStorageChange = () => {
      const latestUser = getInitialState();
      setUser(latestUser);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Initial sync
    setUser(storedUser);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const updateUserInStorage = useCallback((userData: Omit<User, 'pin'> | null) => {
    setUser(userData);
     if (typeof window !== 'undefined') {
        if (userData) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        // This event ensures all tabs are in sync
        window.dispatchEvent(new Event('storage'));
     }
  }, []);

  const login = useCallback((username: string, pin: string): Omit<User, 'pin'> | null => {
    if (!isUsersClient) return null;

    const foundUser = users.find(u => u.username === username && u.pin === pin);
    if (foundUser) {
        const { pin: p, ...userToStore } = foundUser;
        updateUserInStorage(userToStore);
        return userToStore;
    }
    return null;
  }, [updateUserInStorage, users, isUsersClient]);

  const logout = useCallback(() => {
    updateUserInStorage(null);
    router.push('/login');
  }, [updateUserInStorage, router]);

  const syncUser = useCallback((userId: string) => {
      const currentUser = getInitialState();
      if (currentUser && currentUser.id === userId && isUsersClient) {
          const updatedUser = users.find(u => u.id === userId);
          if (updatedUser) {
              const { pin, ...userToStore } = updatedUser;
              updateUserInStorage(userToStore);
          } else {
              // User might have been deleted, so log out
              logout();
          }
      }
  }, [isUsersClient, users, updateUserInStorage, logout]);

  return { user, isClient: isClient && isUsersClient, login, logout, syncUser };
}

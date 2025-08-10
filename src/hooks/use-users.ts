
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';

const USERS_STORAGE_KEY = 'campus-hub-users';

export const initialUsers: User[] = [
  { id: '1', username: 'admin', pin: '1234', role: 'admin' },
  { id: '2', username: 'user1', pin: '1111', role: 'user' },
  { id: '3', username: 'user2', pin: '2222', role: 'user' },
];

const getInitialState = (): User[] => {
  if (typeof window === 'undefined') {
    return initialUsers;
  }
  try {
    const item = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (item) {
      return JSON.parse(item);
    } else {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
  } catch (error) {
    console.error('Error reading users from localStorage', error);
    return initialUsers;
  }
};


export function useUsers() {
    const [users, setUsers] = useState<User[]>(getInitialState);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setUsers(getInitialState());

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === USERS_STORAGE_KEY) {
                setUsers(getInitialState());
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const updateUsersInStorage = useCallback((updatedUsers: User[]) => {
        setUsers(updatedUsers);
        if (typeof window !== 'undefined') {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
            // Dispatch storage event to sync across tabs
            window.dispatchEvent(new Event('storage'));
        }
    }, []);
    
    const addUser = useCallback((user: Omit<User, 'id'>) => {
        const newUser = { ...user, id: new Date().toISOString() };
        const updatedUsers = [...getInitialState(), newUser];
        updateUsersInStorage(updatedUsers);
        return newUser;
    }, [updateUsersInStorage]);
    
    const updateUser = useCallback((userId: string, updatedDetails: Partial<Omit<User, 'id'>>) => {
        const updatedUsers = getInitialState().map(u => 
            u.id === userId ? { ...u, ...updatedDetails } : u
        );
        updateUsersInStorage(updatedUsers);
    }, [updateUsersInStorage]);
    
    const deleteUser = useCallback((userId: string) => {
        const updatedUsers = getInitialState().filter(u => u.id !== userId);
        updateUsersInStorage(updatedUsers);
    }, [updateUsersInStorage]);

    return { users, isClient, addUser, updateUser, deleteUser };
}

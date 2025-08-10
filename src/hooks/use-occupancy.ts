
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OccupancyState, Reservation, ActivityLog, CheckInRecord } from '@/lib/types';
// import { notifyOccupancy } from '@/ai/flows/telegram-flow';

const OCCUPANCY_STORAGE_KEY = 'campus-hub-occupancy';
const NIGHTLY_RESET_HOUR = 22; // 10 PM

const getInitialState = (): OccupancyState => {
  if (typeof window === 'undefined') {
    return { checkIns: [], reservation: null, activityLog: [] };
  }
  try {
    const item = window.localStorage.getItem(OCCUPANCY_STORAGE_KEY);
    if (item) {
      const state = JSON.parse(item);
      return { checkIns: state.checkIns || [], reservation: state.reservation || null, activityLog: state.activityLog || [] };
    }
  } catch (error) {
    console.error('Error reading from localStorage', error);
  }
  return { checkIns: [], reservation: null, activityLog: [] };
};

export function useOccupancy() {
  const [occupancy, setOccupancy] = useState<OccupancyState>(getInitialState);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setOccupancy(getInitialState());

    const handleStorageChange = () => {
      setOccupancy(getInitialState());
    };

    window.addEventListener('storage', handleStorageChange);

    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === NIGHTLY_RESET_HOUR && now.getMinutes() === 0) {
        // Prevent multiple triggers in the same minute
        const lastReset = localStorage.getItem('last-nightly-reset');
        const today = now.toDateString();
        if(lastReset !== today) {
            handleNightlyReset();
            localStorage.setItem('last-nightly-reset', today);
        }
      }
    };
    
    // Check every minute
    const intervalId = setInterval(checkTime, 60000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  const updateState = useCallback((newState: Partial<OccupancyState>) => {
    const currentState = getInitialState();
    const updatedState = { ...currentState, ...newState };
    setOccupancy(updatedState);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OCCUPANCY_STORAGE_KEY, JSON.stringify(updatedState));
      window.dispatchEvent(new Event('storage'));
    }
  }, []);

  const addLog = useCallback((log: Omit<ActivityLog, 'timestamp'>) => {
    const currentState = getInitialState();
    const newLog: ActivityLog = {
        ...log,
        timestamp: new Date().toISOString()
    };
    updateState({ activityLog: [...currentState.activityLog, newLog] });
  }, [updateState]);


  const checkIn = useCallback((people: number, user: string) => {
    const currentState = getInitialState();
    if (currentState.reservation) return;

    const newCheckIn: CheckInRecord = {
      id: new Date().toISOString(),
      user,
      people,
      timestamp: new Date().toISOString(),
    };
    
    updateState({ checkIns: [...currentState.checkIns, newCheckIn] });
    addLog({ type: 'check-in', user, people, checkInId: newCheckIn.id });
  }, [updateState, addLog]);

  const checkOutSingle = useCallback((user: string) => {
    const currentState = getInitialState();
    if (currentState.reservation) return;

    // Find the newest check-in to remove one person from
    if(currentState.checkIns.length > 0) {
      const updatedCheckIns = [...currentState.checkIns];
      const targetCheckInIndex = updatedCheckIns.length -1;
      
      if(updatedCheckIns[targetCheckInIndex].people > 1) {
        updatedCheckIns[targetCheckInIndex].people -= 1;
      } else {
        // Remove the check-in record if it's the last person
        updatedCheckIns.splice(targetCheckInIndex, 1);
      }
      updateState({ checkIns: updatedCheckIns });
      addLog({ type: 'check-out-single', user });
    }
  }, [updateState, addLog]);

  const checkOutGroup = useCallback((checkInId: string, user: string) => {
    const currentState = getInitialState();
    if (currentState.reservation) return;

    const checkInRecord = currentState.checkIns.find(c => c.id === checkInId);
    if(!checkInRecord) return;

    const updatedCheckIns = currentState.checkIns.filter(c => c.id !== checkInId);
    updateState({ checkIns: updatedCheckIns });
    addLog({ type: 'check-out-group', user, people: checkInRecord.people, checkInId });
  }, [updateState, addLog]);

  const reserve = useCallback((details: Omit<Reservation, 'reservedAt'>, user: string) => {
    const reservation: Reservation = {
      ...details,
      reservedAt: new Date().toISOString(),
    };
    updateState({ reservation, checkIns: [] });
    addLog({ type: 'reservation-start', user, reason: details.reason });
  }, [updateState, addLog]);

  const endReservation = useCallback((user: string) => {
    const currentState = getInitialState();
    const reason = currentState.reservation?.reason;
    updateState({ reservation: null, checkIns: [] });
    addLog({ type: 'reservation-end', user, reason });
  }, [updateState, addLog]);

  const reset = useCallback(() => {
    updateState({ checkIns: [], reservation: null, activityLog: [] });
  }, [updateState]);

  const handleNightlyReset = useCallback(async () => {
    const currentState = getInitialState();
    const totalPeople = currentState.checkIns.reduce((sum, record) => sum + record.people, 0);

    // The logic to send a notification is removed.
    // We just log the event.
    updateState({ checkIns: [], reservation: null });
    addLog({ type: 'system-reset', user: 'system', people: totalPeople });

  }, [updateState, addLog]);

  const count = occupancy.checkIns.reduce((sum, record) => sum + record.people, 0);

  return { ...occupancy, count, isClient, checkIn, checkOutSingle, checkOutGroup, reserve, endReservation, reset };
}

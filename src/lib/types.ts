
export interface Reservation {
  reason: string;
  contactPhone: string;
  endTime: string;
  reservedAt: string;
}

export interface ActivityLog {
    timestamp: string;
    type: 'check-in' | 'check-out-single' | 'check-out-group' | 'reservation-start' | 'reservation-end' | 'system-reset';
    user: string; // 'system' for automated actions
    people?: number;
    reason?: string;
    checkInId?: string;
}

export interface CheckInRecord {
  id: string;
  user: string; // Responsible user
  people: number;
  timestamp: string;
}

export interface OccupancyState {
  checkIns: CheckInRecord[];
  reservation: Reservation | null;
  activityLog: ActivityLog[];
}

export interface User {
    id: string; // Added ID for unique identification
    username: string;
    pin: string;
    role: 'admin' | 'user';
}

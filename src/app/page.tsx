
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Users, Ban, Phone, Clock, Info, Calendar, UserMinus, UserX } from 'lucide-react';
import { useOccupancy } from '@/hooks/use-occupancy';
import { OccupancyIndicator } from '@/components/OccupancyIndicator';
import { CheckInDialog } from '@/components/CheckInDialog';
import { ReservationDialog } from '@/components/ReservationDialog';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import type { CheckInRecord } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Home() {
  const { count, checkIns, reservation, checkOutSingle, checkOutGroup, endReservation, isClient } = useOccupancy();
  const { user } = useAuth();
  const [isCheckInOpen, setCheckInOpen] = useState(false);
  const [isReservationOpen, setReservationOpen] = useState(false);

  const occupancyStatus = reservation ? 'reserved' : count > 0 ? 'occupied' : 'empty';
  const userCheckIn = user ? checkIns.find(c => c.user === user.username) : null;

  const statusMap = {
    empty: { text: 'Association is empty', color: 'green', icon: <Users className="h-6 w-6 text-green-500" /> },
    occupied: { text: 'Association has people', color: 'orange', icon: <Users className="h-6 w-6 text-orange-500" /> },
    reserved: { text: 'Association is reserved', color: 'red', icon: <Ban className="h-6 w-6 text-red-500" /> },
  };

  const currentStatus = statusMap[occupancyStatus];

  const handleCheckOutSingle = () => {
    if(user) {
      checkOutSingle(user.username);
    }
  }

  const handleCheckOutGroup = (checkIn: CheckInRecord) => {
    if (user) {
        checkOutGroup(checkIn.id, user.username);
    }
  }

  const handleEndReservation = () => {
    if (user) {
      endReservation(user.username)
    }
  }

  if (!isClient) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-theme(spacing.14))]">
         <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-headline">Current Status</CardTitle>
              {currentStatus.icon}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <OccupancyIndicator status={occupancyStatus} />
                <div>
                  <p className="text-xl md:text-2xl font-bold">{currentStatus.text}</p>
                  <p className="text-xs text-muted-foreground">Real-time occupancy indicator</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium font-headline">People Inside</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservation ? 'N/A' : count}</div>
              <p className="text-xs text-muted-foreground">Total people currently in the local</p>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-headline">Actions</CardTitle>
              <CardDescription>Check-in, check-out or reserve the local.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={() => setCheckInOpen(true)} disabled={!!reservation || !user || !!userCheckIn}>
                <LogIn className="mr-2 h-4 w-4" /> Check In
              </Button>
               <Button variant="secondary" className="col-span-1" onClick={() => setReservationOpen(true)} disabled={!!reservation || !user || count > 0}>
                <Calendar className="mr-2 h-4 w-4" /> Reserve Local
              </Button>
            </CardContent>
          </Card>

           {count > 0 && !reservation && user && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="font-headline">Check-out</CardTitle>
                <CardDescription>Manage your group or leave the local.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                  <Button variant="outline" onClick={handleCheckOutSingle} disabled={count === 0}>
                    <UserMinus className="mr-2 h-4 w-4" /> Check-out (Just Me)
                  </Button>
                  {userCheckIn && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <UserX className="mr-2 h-4 w-4" /> Check-out My Group ({userCheckIn.people} people)
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Check-out Entire Group?</AlertDialogTitle>
                            <AlertDialogDescription>
                             This will check out all {userCheckIn.people} people that you registered under your name. Are you sure?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCheckOutGroup(userCheckIn)}>Confirm Check-out</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                 <p className="text-xs text-muted-foreground mt-2">
                    {userCheckIn ? `You are responsible for a group of ${userCheckIn.people}.` : `You are not responsible for any group.`}
                </p>
              </CardContent>
            </Card>
          )}

          {reservation && (
            <Card className="md:col-span-2 lg:col-span-3 bg-red-50 dark:bg-red-900/20 border-primary">
              <CardHeader>
                <CardTitle className="font-headline text-primary flex items-center gap-2">
                  <Ban /> Local Reserved
                </CardTitle>
                <CardDescription className="text-primary/80">
                  The association local is currently reserved. Check-out when finished.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <Info className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Reason</p>
                            <p className="text-muted-foreground">{reservation.reason}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Contact Phone</p>
                            <p className="text-muted-foreground">{reservation.contactPhone}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Estimated End Time</p>
                            <p className="text-muted-foreground">
                            {`Reserved at ${format(new Date(reservation.reservedAt), 'HH:mm')} - Ends around ${reservation.endTime}`}
                            </p>
                        </div>
                    </div>
                </div>
                <Button onClick={handleEndReservation} disabled={!user} className="w-full sm:w-auto mt-4">
                  End Reservation (Check-out)
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <CheckInDialog isOpen={isCheckInOpen} onOpenChange={setCheckInOpen} />
      <ReservationDialog isOpen={isReservationOpen} onOpenChange={setReservationOpen} />
    </>
  );
}

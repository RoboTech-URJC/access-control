
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Ban,
  Phone,
  Clock,
  Info,
  LineChart,
  Activity,
  Trash2,
  Calendar as CalendarIcon,
  PlusCircle,
  Edit,
  Trash,
  UserX,
  UserCheck,
  Power,
  PowerOff
} from 'lucide-react';
import { useOccupancy } from '@/hooks/use-occupancy';
import { OccupancyIndicator } from '@/components/OccupancyIndicator';
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
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useUsers } from '@/hooks/use-users';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import type { ActivityLog, User } from '@/lib/types';
import { UserFormDialog } from '@/components/UserFormDialog';

export default function AdminDashboard() {
  const { count, reservation, reset, activityLog, isClient: isOccupancyClient } = useOccupancy();
  const { toast } = useToast();
  const { user, isClient: isAuthClient, syncUser } = useAuth();
  const { users, isClient: isUsersClient, deleteUser: removeUser } = useUsers();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  });
  
  const [isUserFormOpen, setUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const occupancyStatus = reservation ? 'reserved' : count > 0 ? 'occupied' : 'empty';
  
  useEffect(() => {
    if (isAuthClient && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, isAuthClient, router]);

  const handleReset = () => {
    reset();
    toast({
      title: 'State Cleared',
      description: 'The occupancy count and reservation have been reset.',
    });
  };

  const openAddUserDialog = () => {
    setSelectedUser(null);
    setUserFormOpen(true);
  }

  const openEditUserDialog = (user: User) => {
    setSelectedUser(user);
    setUserFormOpen(true);
  }

  const handleDeleteUser = (userId: string) => {
    removeUser(userId);
    toast({
      title: 'User Deleted',
      description: 'The user has been successfully deleted.',
    });
    // If the deleted user is the currently logged-in user, force a re-sync
    if (user?.id === userId) {
        syncUser(userId);
    }
  }

  const filteredLogs = activityLog.filter(log => {
    const logDate = new Date(log.timestamp);
    if (!dateRange?.from || !dateRange?.to) return true;
    return logDate >= dateRange.from && logDate <= dateRange.to;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (!isOccupancyClient || !isAuthClient || !isUsersClient || !user || user.role !== 'admin') {
     return (
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-theme(spacing.14))]">
         <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  const getTimelineIcon = (type: ActivityLog['type']) => {
    switch (type) {
        case 'check-in':
            return <UserCheck className="h-4 w-4 text-green-500" />;
        case 'check-out-single':
        case 'check-out-group':
            return <UserX className="h-4 w-4 text-red-500" />;
        case 'reservation-start':
            return <Power className="h-4 w-4 text-blue-500" />;
        case 'reservation-end':
            return <PowerOff className="h-4 w-4 text-gray-500" />;
        case 'system-reset':
            return <Trash className="h-4 w-4 text-destructive" />;
    }
  }

  const getTimelineText = (log: ActivityLog) => {
    switch (log.type) {
      case 'check-in':
        return `${log.user} checked in ${log.people} ${log.people! > 1 ? 'people' : 'person'}.`;
      case 'check-out-single':
        return `${log.user} checked out (single).`;
      case 'check-out-group':
        return `${log.user} checked out a group of ${log.people}.`;
      case 'reservation-start':
        return `${log.user} reserved the local.`;
      case 'reservation-end':
        return `${log.user} ended the reservation.`;
      case 'system-reset':
        return `System auto-reset cleared ${log.people} people.`;
    }
  }
  
  const getLogActionText = (log: ActivityLog) => {
      switch (log.type) {
        case 'check-in': return 'Check-in';
        case 'check-out-single': return 'Check-out (Single)';
        case 'check-out-group': return 'Check-out (Group)';
        case 'reservation-start': return 'Reservation Start';
        case 'reservation-end': return 'Reservation End';
        case 'system-reset': return 'System Reset';
        default: return 'Unknown';
      }
  }

   const getLogDetailsText = (log: ActivityLog) => {
      switch (log.type) {
        case 'check-in':
        case 'check-out-group':
            return `People: ${log.people}`;
        case 'check-out-single':
            return 'N/A';
        case 'reservation-start':
        case 'reservation-end':
            return log.reason || 'N/A';
        case 'system-reset':
            return `People cleared: ${log.people}`;
        default: return 'N/A';
      }
  }


  return (
    <>
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage and monitor association local occupancy.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Occupancy</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservation ? 'N/A' : count}</div>
              <p className="text-xs text-muted-foreground">
                {count > 0 ? `${count} ${count > 1 ? 'people' : 'person'} inside` : 'Local is empty'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <OccupancyIndicator status={occupancyStatus} className="h-10 w-10" />
              <span className="font-bold capitalize">{occupancyStatus}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peak Occupancy (Today)</CardTitle>
              <LineChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground">Feature coming soon</p>
            </CardContent>
          </Card>
          <Card className="border-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Emergency Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Reset All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently clear the current occupancy count and any active reservation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">Use with caution.</p>
            </CardFooter>
          </Card>
        </div>

        {reservation && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold font-headline mb-4">Active Reservation</h2>
            <Card className="bg-red-50 dark:bg-red-900/20 border-primary">
              <CardHeader>
                <CardTitle className="font-headline text-primary flex items-center gap-2">
                  <Ban /> Local is Reserved
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Info className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Reason</p>
                    <p className="text-muted-foreground">{reservation.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Contact</p>
                    <p className="text-muted-foreground">{reservation.contactPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Timing</p>
                    <p className="text-muted-foreground">
                      Ends around {reservation.endTime} (Reserved on {format(new Date(reservation.reservedAt), 'MMM d, yyyy')})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Add, edit, or delete user credentials.</CardDescription>
                </div>
                <Button size="sm" onClick={openAddUserDialog}>
                  <PlusCircle />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>PIN</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {users.map((u) => (
                              <TableRow key={u.id}>
                                  <TableCell>{u.username}</TableCell>
                                  <TableCell>****</TableCell>
                                  <TableCell className="capitalize">{u.role}</TableCell>
                                  <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEditUserDialog(u)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={u.username === 'admin'}>
                                          <Trash className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the user account for {u.username}.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteUser(u.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>A timeline of recent events.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredLogs.slice(0, 5).map(log => (
                    <div key={log.timestamp} className="flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          {getTimelineIcon(log.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{getTimelineText(log)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), "MMM d, yyyy 'at' hh:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                      <p className="text-sm text-muted-foreground">No activity in the selected period.</p>
                  )}
                </div>
              </CardContent>
          </Card>
        </div>
        
        <div className="mt-8">
          <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                          <CardTitle>Activity Log</CardTitle>
                          <CardDescription>Detailed log of check-ins, check-outs, and reservations.</CardDescription>
                      </div>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button
                              variant={"outline"}
                              className="w-full sm:w-auto justify-start text-left font-normal"
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange?.from ? (
                              dateRange.to ? (
                                  <>
                                  {format(dateRange.from, "LLL dd, y")} -{" "}
                                  {format(dateRange.to, "LLL dd, y")}
                                  </>
                              ) : (
                                  format(dateRange.from, "LLL dd, y")
                              )
                              ) : (
                              <span>Pick a date</span>
                              )}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange?.from}
                              selected={dateRange}
                              onSelect={setDateRange}
                              numberOfMonths={2}
                          />
                          </PopoverContent>
                      </Popover>
                  </div>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Timestamp</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Details</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredLogs.map(log => (
                              <TableRow key={log.timestamp}>
                                  <TableCell>{format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                                  <TableCell>{log.user}</TableCell>
                                  <TableCell>{getLogActionText(log)}</TableCell>
                                  <TableCell>{getLogDetailsText(log)}</TableCell>
                              </TableRow>
                          ))}
                          {filteredLogs.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={4} className="h-24 text-center">
                                      No results found.
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </div>
      </div>
      <UserFormDialog 
        isOpen={isUserFormOpen} 
        onOpenChange={setUserFormOpen} 
        user={selectedUser}
      />
    </>
  );
}


'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOccupancy } from '@/hooks/use-occupancy';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ReservationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ReservationDialog({ isOpen, onOpenChange }: ReservationDialogProps) {
  const { reserve } = useOccupancy();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleReserve = () => {
    if (!reason || !contactPhone || !endTime) {
      toast({
        title: 'Missing information',
        description: 'Please fill out all fields to make a reservation.',
        variant: 'destructive',
      });
      return;
    }
    if (user) {
        reserve({ reason, contactPhone, endTime }, user.username);
        toast({
        title: 'Reservation successful!',
        description: 'The local has been reserved.',
        });
        onOpenChange(false);
        // Reset fields
        setReason('');
        setContactPhone('');
        setEndTime('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Reserve Local</DialogTitle>
          <DialogDescription>
            Fill in the details to reserve the entire association local.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="reason">Reason for Reservation</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Study Group Session, Committee Meeting"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder="Your phone number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="endTime">Estimated End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleReserve}>
            <Calendar className="mr-2 h-4 w-4" /> Confirm Reservation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

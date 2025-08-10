
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
import { useOccupancy } from '@/hooks/use-occupancy';
import { useToast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface CheckInDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CheckInDialog({ isOpen, onOpenChange }: CheckInDialogProps) {
  const { checkIn } = useOccupancy();
  const { user } = useAuth();
  const [people, setPeople] = useState(1);
  const { toast } = useToast();

  const handleCheckIn = () => {
    if (people > 0 && user) {
      checkIn(people, user.username);
      toast({
        title: 'Check-in successful!',
        description: `You have checked in ${people} ${people > 1 ? 'people' : 'person'}.`,
      });
      onOpenChange(false);
      setPeople(1);
    } else {
        toast({
            title: 'Invalid number',
            description: 'Please enter a number greater than 0.',
            variant: 'destructive'
        })
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Check In</DialogTitle>
          <DialogDescription>
            Enter the number of people in your group.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="people" className="text-right">
              People
            </Label>
            <Input
              id="people"
              type="number"
              value={people}
              onChange={(e) => setPeople(parseInt(e.target.value, 10) || 1)}
              className="col-span-3"
              min="1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCheckIn}>
            <Users className="mr-2 h-4 w-4" /> Confirm Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

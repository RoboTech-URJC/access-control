
'use client';

import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';

interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User | null;
}

export function UserFormDialog({ isOpen, onOpenChange, user }: UserFormDialogProps) {
  const { addUser, updateUser } = useUsers();
  const { syncUser } = useAuth();
  const { toast } = useToast();
  
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');

  const isEditMode = user !== null;

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username);
      setPin(user.pin);
      setRole(user.role);
    } else if (isOpen && !user) {
      // Reset for new user
      setUsername('');
      setPin('');
      setRole('user');
    }
  }, [isOpen, user]);

  const handleSubmit = () => {
    if (!username || !pin) {
      toast({
        title: 'Error',
        description: 'Username and PIN are required.',
        variant: 'destructive',
      });
      return;
    }

    const userData = { username, pin, role };

    if (isEditMode && user) {
      updateUser(user.id, userData);
      syncUser(user.id);
      toast({
        title: 'User Updated',
        description: `Details for ${username} have been updated.`,
      });
    } else {
      addUser(userData);
      toast({
        title: 'User Added',
        description: `${username} has been added as a new user.`,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {isEditMode ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this user.' : 'Enter the details for the new user.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEditMode && username === 'admin'}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
           <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value: 'user' | 'admin') => setRole(value)} value={role} disabled={isEditMode && username === 'admin'}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>
            {isEditMode ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

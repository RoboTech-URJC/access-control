'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block font-headline">
            Campus Hub Check-In
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user?.role === 'admin' && (
            <Link href="/admin" className="text-foreground/60 transition-colors hover:text-foreground/80">
              Dashboard
            </Link>
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline-block">Welcome, {user.username}</span>
                <Button variant="outline" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

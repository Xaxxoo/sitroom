'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { RoleBadge } from '@/components/ui/Badge';
import { Role } from '@/lib/types';

interface HeaderProps {
  title?: string;
  backHref?: string;
}

export function Header({ title, backHref }: HeaderProps) {
  const { user, logout } = useAuth();
  const { connected } = useRealtime();

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
      {backHref ? (
        <Link href={backHref} className="text-gray-500 hover:text-gray-900 mr-1">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      ) : (
        <div className="flex items-center gap-1">
          <div className="h-7 w-7 rounded-md bg-green-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">SR</span>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-gray-900 truncate">
          {title ?? 'Sitroom'}
        </h1>
        {user && !title && (
          <p className="text-xs text-gray-500 truncate">{user.name}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Situation room link for coordinators+ */}
        {user && [Role.ADMIN, Role.EXECUTIVE, Role.STATE_COORDINATOR, Role.LGA_COORDINATOR].includes(user.role) && (
          <Link
            href="/situation-room"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Situation Room
          </Link>
        )}

        {/* Live indicator */}
        <div className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          />
          <span className="text-xs text-gray-500 hidden sm:inline">
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        {user && <RoleBadge role={user.role} />}

        <button
          onClick={logout}
          className="text-gray-400 hover:text-gray-700 p-1 rounded"
          title="Sign out"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}

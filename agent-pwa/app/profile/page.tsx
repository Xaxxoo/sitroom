'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { RoleBadge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Role } from '@/lib/types';

const roleDescriptions: Record<Role, string> = {
  [Role.ADMIN]: 'Full system access. Can import geography, manage users, seed data.',
  [Role.EXECUTIVE]: 'Read-only access to all data and reports.',
  [Role.STATE_COORDINATOR]: 'Can verify results and register ward coordinators.',
  [Role.LGA_COORDINATOR]: 'Can flag results and escalate incidents in your LGA.',
  [Role.WARD_COORDINATOR]: 'Can escalate incidents in your ward.',
  [Role.AGENT]: 'Can submit results and report incidents for your polling unit.',
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { connected, events } = useRealtime();

  if (!user) return null;

  return (
    <AppShell title="Profile">
      <div className="px-4 py-4 space-y-5">
        {/* User card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-700 text-xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{user.phone}</p>
              <div className="mt-2">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          {roleDescriptions[user.role] && (
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              {roleDescriptions[user.role]}
            </p>
          )}
        </div>

        {/* Assignment */}
        {(user.pollingUnit || user.ward || user.lga) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Your assignment</h3>
            {user.pollingUnit && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Polling Unit</span>
                <span className="font-medium text-gray-900 text-right max-w-[60%] truncate">
                  {user.pollingUnit.name}
                </span>
              </div>
            )}
            {(user.ward ?? user.pollingUnit?.ward) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ward</span>
                <span className="font-medium text-gray-900">
                  {(user.ward ?? user.pollingUnit?.ward)?.name}
                </span>
              </div>
            )}
            {(user.lga ?? user.pollingUnit?.ward?.lga) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">LGA</span>
                <span className="font-medium text-gray-900">
                  {(user.lga ?? user.pollingUnit?.ward?.lga)?.name}
                </span>
              </div>
            )}
            {user.pollingUnit?.registeredVoters && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Registered voters</span>
                <span className="font-medium text-gray-900">
                  {user.pollingUnit.registeredVoters.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Live connection status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Connection</h3>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-700">{connected ? 'Connected to live feed' : 'Disconnected'}</span>
          </div>
          {events.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-gray-500">Recent events</p>
              {events.slice(0, 5).map((ev, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="font-mono">{ev.type}</span>
                  <span className="text-gray-400 ml-auto">
                    {ev.timestamp.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Situation room */}
        {[Role.ADMIN, Role.EXECUTIVE, Role.STATE_COORDINATOR, Role.LGA_COORDINATOR].includes(user.role) && (
          <Link
            href="/situation-room"
            className="w-full flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">SR</span>
            </div>
            <div>
              <p>Open Situation Room</p>
              <p className="text-xs text-gray-400 font-normal">Full command-center dashboard</p>
            </div>
            <svg className="h-4 w-4 text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">
          Sitroom v0.1.0 · Election Situation Room
        </p>
      </div>
    </AppShell>
  );
}

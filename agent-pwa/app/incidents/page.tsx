'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge, IncidentStatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Role, IncidentSeverity, IncidentStatus } from '@/lib/types';
import type { Incident } from '@/lib/types';
import { timeAgo, incidentTypeLabel } from '@/lib/utils';

const severityColors: Record<IncidentSeverity, string> = {
  [IncidentSeverity.LOW]: 'bg-green-500',
  [IncidentSeverity.MEDIUM]: 'bg-amber-500',
  [IncidentSeverity.HIGH]: 'bg-orange-500',
  [IncidentSeverity.CRITICAL]: 'bg-red-600',
};

export default function IncidentsPage() {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: '', status: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canEscalate = [Role.WARD_COORDINATOR, Role.LGA_COORDINATOR, Role.STATE_COORDINATOR, Role.ADMIN].includes(user?.role as Role);
  const canResolve = [Role.LGA_COORDINATOR, Role.STATE_COORDINATOR, Role.ADMIN].includes(user?.role as Role);

  const load = useCallback(async () => {
    try {
      const params: { severity?: string; status?: string } = {};
      if (filter.severity) params.severity = filter.severity;
      if (filter.status) params.status = filter.status;
      const data = await api.getIncidents(params);
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (lastEvent) load(); }, [lastEvent, load]);

  async function handleEscalate(id: string) {
    setActionLoading(id);
    try {
      await api.escalateIncident(id);
      load();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolve(id: string) {
    const note = prompt('Resolution note:');
    if (note === null) return;
    setActionLoading(id);
    try {
      await api.resolveIncident(id, note);
      load();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AppShell title="Incidents">
      <div className="px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filter.severity}
            onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value }))}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Report CTA */}
        <Link
          href="/incidents/new"
          className="flex items-center gap-3 bg-red-600 text-white rounded-2xl p-4 hover:bg-red-700 transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">Report an incident</p>
            <p className="text-xs text-red-100">Tap to report</p>
          </div>
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No incidents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{incidents.length} incident{incidents.length !== 1 ? 's' : ''}</p>
            {incidents.map((inc) => (
              <div key={inc.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 mt-1 ${severityColors[inc.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{incidentTypeLabel(inc.type)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {inc.pollingUnit?.name ?? inc.ward?.name ?? inc.lga?.name ?? 'No location'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <SeverityBadge severity={inc.severity} />
                    <IncidentStatusBadge status={inc.status} />
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                  {inc.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">
                      {inc.reportedBy?.name} · {timeAgo(inc.createdAt)}
                    </p>
                    {inc.resolutionNote && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">
                        Resolved: {inc.resolutionNote}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {actionLoading === inc.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        {canEscalate && inc.status === IncidentStatus.OPEN && (
                          <button
                            onClick={() => handleEscalate(inc.id)}
                            className="text-xs text-amber-600 font-medium hover:underline"
                          >
                            Escalate
                          </button>
                        )}
                        {canResolve && inc.status !== IncidentStatus.RESOLVED && (
                          <button
                            onClick={() => handleResolve(inc.id)}
                            className="text-xs text-green-600 font-medium hover:underline"
                          >
                            Resolve
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

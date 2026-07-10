'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { api } from '@/lib/api';
import { Role } from '@/lib/types';
import type { Aggregation, IncidentStats, Result, Incident } from '@/lib/types';
import { ResultStatusBadge, SeverityBadge, IncidentStatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatNumber, timeAgo, incidentTypeLabel } from '@/lib/utils';

function StatCard({ label, value, sub, color }: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-gray-900'}`}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();
  const [agg, setAgg] = useState<Aggregation | null>(null);
  const [incidentStats, setIncidentStats] = useState<IncidentStats | null>(null);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [aggData, incStats, results, incidents] = await Promise.all([
        api.getAggregation(),
        api.getIncidentStats(),
        api.getResults(),
        api.getIncidents(),
      ]);
      setAgg(aggData);
      setIncidentStats(incStats);
      setRecentResults(results.slice(0, 5));
      setRecentIncidents(incidents.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Refresh on realtime events
  useEffect(() => {
    if (lastEvent) {
      loadData();
    }
  }, [lastEvent]);

  const isAgent = user?.role === Role.AGENT;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const submitted = agg?.puReporting ?? 0;

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Welcome */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Hello, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* PUs reporting */}
      {agg && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Polling units reporting</span>
            <span className="text-sm font-bold text-green-600">{formatNumber(submitted)}</span>
          </div>
          <p className="text-xs text-gray-400">
            {formatNumber(agg.totalVotesCast)} total votes cast · {formatNumber(agg.anomalousCount)} anomalies
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="PUs reporting" value={agg?.puReporting ?? 0} color="text-green-600" />
        <StatCard label="Anomalies" value={agg?.anomalousCount ?? 0} color="text-amber-600" />
        <StatCard label="Total votes" value={agg?.totalValidVotes ?? 0} />
        <StatCard
          label="Open incidents"
          value={incidentStats?.open ?? 0}
          sub={`${incidentStats?.escalated ?? 0} escalated`}
          color={(incidentStats?.open ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}
        />
      </div>

      {/* Party rankings */}
      {agg?.partySummary && agg.partySummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Party rankings</h3>
          <div className="space-y-3">
            {agg.partySummary.slice(0, 5).map((r, i) => {
              const pct = agg.totalValidVotes > 0
                ? (r.totalVotes / agg.totalValidVotes) * 100
                : 0;
              return (
                <div key={r.partyId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.color || '#6b7280' }}
                  />
                  <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                    {r.abbreviation}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: r.color || '#16a34a',
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent quick actions */}
      {isAgent && (
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/results/submit"
            className="flex flex-col items-center gap-2 bg-green-600 text-white rounded-2xl p-4 hover:bg-green-700 transition-colors"
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold">Submit Result</span>
          </Link>
          <Link
            href="/incidents/new"
            className="flex flex-col items-center gap-2 bg-red-600 text-white rounded-2xl p-4 hover:bg-red-700 transition-colors"
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-semibold">Report Incident</span>
          </Link>
        </div>
      )}

      {/* Recent results */}
      {recentResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent results</h3>
            <Link href="/results" className="text-xs text-green-600 font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {recentResults.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {r.pollingUnit?.name ?? 'Unknown PU'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {timeAgo(r.createdAt)} · {r.pollingUnit?.ward?.name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ResultStatusBadge status={r.status} />
                  {r.isAnomalous && (
                    <span className="text-xs text-amber-600 font-medium">⚠ Anomaly</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent incidents */}
      {recentIncidents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent incidents</h3>
            <Link href="/incidents" className="text-xs text-green-600 font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {recentIncidents.map((inc) => (
              <div key={inc.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{incidentTypeLabel(inc.type)}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{inc.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(inc.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <SeverityBadge severity={inc.severity} />
                  <IncidentStatusBadge status={inc.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {recentResults.length === 0 && recentIncidents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No data yet</p>
          <p className="text-xs text-gray-400 mt-1">Results and incidents will appear here</p>
        </div>
      )}
    </div>
  );
}

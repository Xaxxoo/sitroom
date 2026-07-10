'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ResultStatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Role } from '@/lib/types';
import type { Result, Lga } from '@/lib/types';
import { formatNumber, timeAgo } from '@/lib/utils';

export default function ResultsPage() {
  const { user } = useAuth();
  const { lastEvent } = useRealtime();
  const [results, setResults] = useState<Result[]>([]);
  const [lgas, setLgas] = useState<Lga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ lgaId: '', anomalous: '' });

  const load = useCallback(async () => {
    try {
      const params: { lgaId?: string; anomalous?: boolean } = {};
      if (filter.lgaId) params.lgaId = filter.lgaId;
      if (filter.anomalous === 'true') params.anomalous = true;
      const data = await api.getResults(params);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.getLgas().then(setLgas).catch(() => {});
  }, []);
  useEffect(() => { if (lastEvent) load(); }, [lastEvent, load]);

  const isAgent = user?.role === Role.AGENT;
  const canVerify = user?.role === Role.STATE_COORDINATOR || user?.role === Role.ADMIN;
  const canFlag = [Role.LGA_COORDINATOR, Role.STATE_COORDINATOR, Role.ADMIN].includes(user?.role as Role);

  async function handleVerify(id: string) {
    await api.verifyResult(id);
    load();
  }

  async function handleFlag(id: string) {
    const reason = prompt('Flag reason:');
    if (!reason) return;
    await api.flagResult(id, [reason]);
    load();
  }

  return (
    <AppShell title="Results">
      <div className="px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={filter.lgaId}
            onChange={(e) => setFilter((f) => ({ ...f, lgaId: e.target.value }))}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All LGAs</option>
            {lgas.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            value={filter.anomalous}
            onChange={(e) => setFilter((f) => ({ ...f, anomalous: e.target.value }))}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All</option>
            <option value="true">Anomalous only</option>
          </select>
        </div>

        {/* Agent submit CTA */}
        {isAgent && (
          <Link
            href="/results/submit"
            className="flex items-center gap-3 bg-green-600 text-white rounded-2xl p-4 hover:bg-green-700 transition-colors"
          >
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">Submit polling unit result</p>
              <p className="text-xs text-green-100">Tap to submit your result</p>
            </div>
          </Link>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No results found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {r.pollingUnit?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.pollingUnit?.ward?.name} · {r.pollingUnit?.ward?.lga?.name}
                    </p>
                  </div>
                  <ResultStatusBadge status={r.status} />
                </div>

                {/* Vote breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Accredited</p>
                    <p className="text-sm font-bold text-gray-900">{formatNumber(r.accreditedVoters)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Cast</p>
                    <p className="text-sm font-bold text-gray-900">{formatNumber(r.totalVotesCast)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Valid</p>
                    <p className="text-sm font-bold text-gray-900">{formatNumber(r.totalValidVotes)}</p>
                  </div>
                </div>

                {/* Party scores */}
                {r.partyScores?.length > 0 && (
                  <div className="space-y-1.5">
                    {r.partyScores
                      .sort((a, b) => b.votes - a.votes)
                      .slice(0, 4)
                      .map((ps) => (
                        <div key={ps.id} className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ps.party.color || '#6b7280' }}
                          />
                          <span className="text-xs text-gray-700 w-12 flex-shrink-0">{ps.party.abbreviation}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: r.totalValidVotes > 0
                                  ? `${(ps.votes / r.totalValidVotes) * 100}%`
                                  : '0%',
                                backgroundColor: ps.party.color || '#16a34a',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-900 w-12 text-right">
                            {formatNumber(ps.votes)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Anomaly warning */}
                {r.isAnomalous && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <svg className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-xs text-amber-700">
                      <p className="font-medium">Anomaly detected</p>
                      {r.anomalyReasons?.map((reason, i) => (
                        <p key={i} className="mt-0.5">· {reason}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-gray-400">
                    {r.submittedBy?.name} · {timeAgo(r.createdAt)}
                  </p>
                  <div className="flex gap-2">
                    {canFlag && r.status !== 'flagged' && r.status !== 'verified' && (
                      <button
                        onClick={() => handleFlag(r.id)}
                        className="text-xs text-red-600 font-medium hover:underline"
                      >
                        Flag
                      </button>
                    )}
                    {canVerify && r.status === 'submitted' && (
                      <button
                        onClick={() => handleVerify(r.id)}
                        className="text-xs text-green-600 font-medium hover:underline"
                      >
                        Verify
                      </button>
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

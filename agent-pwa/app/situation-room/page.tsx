'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Spinner } from '@/components/ui/Spinner';
import { formatNumber, timeAgo, incidentTypeLabel } from '@/lib/utils';
import type {
  Aggregation,
  LgaAggregation,
  IncidentStats,
  Incident,
  Result,
  GeoStats,
} from '@/lib/types';
import { IncidentSeverity, IncidentStatus } from '@/lib/types';

// ─── Clock ────────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-NG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-lg font-semibold text-green-400">{time}</span>;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatBox({
  label,
  value,
  sub,
  accent,
  pulse,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  pulse?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p
        className={`text-3xl font-bold tabular-nums ${accent ?? 'text-white'} ${pulse ? 'animate-pulse' : ''}`}
      >
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ─── Party bar ────────────────────────────────────────────────────────────────
function PartyBar({
  name,
  abbreviation,
  color,
  votes,
  totalVotes,
  rank,
}: {
  name: string;
  abbreviation: string;
  color: string;
  votes: number;
  totalVotes: number;
  rank: number;
}) {
  const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  const isLeading = rank === 1;

  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
        isLeading ? 'bg-gray-800/80' : ''
      }`}
    >
      <span className="text-xs text-gray-600 w-4 text-right font-mono">{rank}</span>
      <div
        className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: color || '#4b5563' }}
      >
        {abbreviation.slice(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className={`text-sm font-semibold truncate ${isLeading ? 'text-white' : 'text-gray-300'}`}>
            {abbreviation}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              backgroundColor: color || '#22c55e',
              boxShadow: isLeading ? `0 0 8px ${color}88` : undefined,
            }}
          />
        </div>
      </div>
      <span
        className={`text-sm font-bold tabular-nums w-20 text-right flex-shrink-0 ${
          isLeading ? 'text-white' : 'text-gray-400'
        }`}
      >
        {formatNumber(votes)}
      </span>
    </div>
  );
}

// ─── Severity dot ─────────────────────────────────────────────────────────────
function SeverityDot({ severity }: { severity: IncidentSeverity }) {
  const colors: Record<IncidentSeverity, string> = {
    [IncidentSeverity.CRITICAL]: 'bg-red-500',
    [IncidentSeverity.HIGH]: 'bg-orange-500',
    [IncidentSeverity.MEDIUM]: 'bg-amber-400',
    [IncidentSeverity.LOW]: 'bg-green-500',
  };
  return <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${colors[severity]}`} />;
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function SituationRoomPage() {
  const { user, logout } = useAuth();
  const { connected, events } = useRealtime();

  const [agg, setAgg] = useState<Aggregation | null>(null);
  const [lgaAgg, setLgaAgg] = useState<LgaAggregation[]>([]);
  const [incStats, setIncStats] = useState<IncidentStats | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [geoStats, setGeoStats] = useState<GeoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [aggData, lgaData, incData, incidents, results, geo] = await Promise.all([
        api.getAggregation(),
        api.getLgaAggregation(),
        api.getIncidentStats(),
        api.getIncidents({ status: 'open' }),
        api.getResults(),
        api.getGeoStats(),
      ]);
      setAgg(aggData);
      setLgaAgg(lgaData);
      setIncStats(incData);
      setActiveIncidents(incidents.slice(0, 8));
      setRecentResults(results.slice(0, 6));
      setGeoStats(geo);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Situation room load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30-second polling
  useEffect(() => {
    loadAll();
    intervalRef.current = setInterval(loadAll, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadAll]);

  // Refresh on any real-time event
  const lastEventTs = events[0]?.timestamp?.toISOString();
  useEffect(() => {
    if (lastEventTs) loadAll();
  }, [lastEventTs, loadAll]);

  const turnoutPct =
    agg && agg.totalAccredited > 0
      ? ((agg.totalVotesCast / agg.totalAccredited) * 100).toFixed(1)
      : '—';

  const reportingPct =
    geoStats && geoStats.pollingUnits > 0
      ? Math.round(((agg?.puReporting ?? 0) / geoStats.pollingUnits) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" className="text-green-500" />
          <p className="text-gray-400 text-sm">Loading situation room…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">SR</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide uppercase">
              Sitroom — Election Situation Room
            </h1>
            <p className="text-xs text-gray-500">
              {new Date().toLocaleDateString('en-NG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
              }`}
            />
            <span className={`text-xs font-medium ${connected ? 'text-green-400' : 'text-gray-500'}`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <LiveClock />

          <span className="text-xs text-gray-600">
            Updated {timeAgo(lastRefresh.toISOString())}
          </span>

          <Link
            href="/dashboard"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700"
          >
            ← Agent view
          </Link>

          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 space-y-5 overflow-auto">

        {/* Top stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBox
            label="PUs Reporting"
            value={agg?.puReporting ?? 0}
            sub={geoStats ? `of ${formatNumber(geoStats.pollingUnits)} total · ${reportingPct}%` : undefined}
            accent="text-green-400"
          />
          <StatBox
            label="Total Valid Votes"
            value={agg?.totalValidVotes ?? 0}
            sub={`${formatNumber(agg?.totalVotesCast ?? 0)} cast`}
          />
          <StatBox
            label="Voter Turnout"
            value={`${turnoutPct}%`}
            sub={`${formatNumber(agg?.totalAccredited ?? 0)} accredited`}
            accent={parseFloat(turnoutPct as string) > 50 ? 'text-green-400' : 'text-amber-400'}
          />
          <StatBox
            label="Anomalies"
            value={agg?.anomalousCount ?? 0}
            sub="flagged results"
            accent={(agg?.anomalousCount ?? 0) > 0 ? 'text-amber-400' : 'text-gray-400'}
            pulse={(agg?.anomalousCount ?? 0) > 0}
          />
          <StatBox
            label="Active Incidents"
            value={(incStats?.open ?? 0) + (incStats?.escalated ?? 0)}
            sub={`${incStats?.critical ?? 0} critical · ${incStats?.escalated ?? 0} escalated`}
            accent={((incStats?.open ?? 0) + (incStats?.escalated ?? 0)) > 0 ? 'text-red-400' : 'text-gray-400'}
            pulse={(incStats?.escalated ?? 0) > 0}
          />
          <StatBox
            label="Leading Party"
            value={agg?.leadingParty?.abbreviation ?? '—'}
            sub={agg?.leadingParty ? formatNumber(agg.leadingParty.totalVotes) + ' votes' : 'No data yet'}
            accent="text-white"
          />
        </div>

        {/* Leading party banner */}
        {agg?.leadingParty && (
          <div
            className="rounded-2xl border p-4 flex items-center gap-5"
            style={{
              borderColor: `${agg.leadingParty.color}44`,
              background: `linear-gradient(135deg, ${agg.leadingParty.color}18, transparent)`,
            }}
          >
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ backgroundColor: agg.leadingParty.color }}
            >
              {agg.leadingParty.abbreviation.slice(0, 3)}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Current leader</p>
              <p className="text-2xl font-bold text-white">{agg.leadingParty.name}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {formatNumber(agg.leadingParty.totalVotes)} votes ·{' '}
                {agg.totalValidVotes > 0
                  ? ((agg.leadingParty.totalVotes / agg.totalValidVotes) * 100).toFixed(1)
                  : '0'}
                % of valid votes
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Margin over 2nd</p>
              {agg.partySummary.length >= 2 ? (
                <p className="text-xl font-bold text-white">
                  +{formatNumber(agg.leadingParty.totalVotes - agg.partySummary[1].totalVotes)}
                </p>
              ) : (
                <p className="text-xl font-bold text-gray-600">—</p>
              )}
            </div>
          </div>
        )}

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Party results + LGA table */}
          <div className="lg:col-span-2 space-y-5">

            {/* Party results */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                  Party Results
                </h2>
                <span className="text-xs text-gray-600">
                  {formatNumber(agg?.totalValidVotes ?? 0)} valid votes counted
                </span>
              </div>
              {agg?.partySummary && agg.partySummary.length > 0 ? (
                <div className="space-y-1">
                  {agg.partySummary.map((party, i) => (
                    <PartyBar
                      key={party.partyId}
                      name={party.name}
                      abbreviation={party.abbreviation}
                      color={party.color}
                      votes={party.totalVotes}
                      totalVotes={agg.totalValidVotes}
                      rank={i + 1}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 py-8 text-center">
                  No vote data yet — waiting for results
                </p>
              )}
            </div>

            {/* LGA breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                  LGA Breakdown
                </h2>
                <span className="text-xs text-gray-600">
                  {lgaAgg.length} LGAs reporting
                </span>
              </div>
              {lgaAgg.length > 0 ? (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-xs text-gray-500 font-medium pb-2 px-1">LGA</th>
                        <th className="text-right text-xs text-gray-500 font-medium pb-2 px-1">PUs</th>
                        {/* Show top 3 parties from the first LGA that has party data */}
                        {(() => {
                          const headers = new Set<string>();
                          lgaAgg.forEach((l) => Object.keys(l.partyTotals).forEach((k) => headers.add(k)));
                          return [...headers].slice(0, 5).map((abbr) => (
                            <th key={abbr} className="text-right text-xs text-gray-500 font-medium pb-2 px-1">
                              {abbr}
                            </th>
                          ));
                        })()}
                        <th className="text-right text-xs text-gray-500 font-medium pb-2 px-1">Leader</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lgaAgg
                        .sort((a, b) => b.puReporting - a.puReporting)
                        .map((lga) => {
                          const partyHeaders = new Set<string>();
                          lgaAgg.forEach((l) => Object.keys(l.partyTotals).forEach((k) => partyHeaders.add(k)));
                          const topHeaders = [...partyHeaders].slice(0, 5);
                          const entries = Object.entries(lga.partyTotals);
                          const leader = entries.sort((a, b) => b[1] - a[1])[0];
                          // Find color for leader
                          const leaderParty = agg?.partySummary.find(
                            (p) => p.abbreviation === leader?.[0]
                          );

                          return (
                            <tr
                              key={lga.lgaId}
                              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="py-2.5 px-1 font-medium text-gray-200">{lga.lgaName}</td>
                              <td className="py-2.5 px-1 text-right text-gray-400 font-mono text-xs">
                                {lga.puReporting}
                              </td>
                              {topHeaders.map((abbr) => (
                                <td key={abbr} className="py-2.5 px-1 text-right text-gray-400 font-mono text-xs">
                                  {lga.partyTotals[abbr]
                                    ? formatNumber(lga.partyTotals[abbr])
                                    : '—'}
                                </td>
                              ))}
                              <td className="py-2.5 px-1 text-right">
                                {leader ? (
                                  <span
                                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: `${leaderParty?.color ?? '#6b7280'}22`,
                                      color: leaderParty?.color ?? '#9ca3af',
                                    }}
                                  >
                                    {leader[0]}
                                  </span>
                                ) : (
                                  <span className="text-gray-600 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-600 py-8 text-center">
                  No LGA data yet
                </p>
              )}
            </div>

            {/* Recent results */}
            {recentResults.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
                  Recent Submissions
                </h2>
                <div className="space-y-2">
                  {recentResults.map((r) => {
                    const topParty = r.partyScores
                      ?.sort((a, b) => b.votes - a.votes)[0];
                    return (
                      <div
                        key={r.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                          r.isAnomalous ? 'bg-amber-950/30 border border-amber-900/40' : 'bg-gray-800/40'
                        }`}
                      >
                        {r.isAnomalous && (
                          <span className="text-amber-400 text-xs">⚠</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">
                            {r.pollingUnit?.name ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.pollingUnit?.ward?.name} · {r.pollingUnit?.ward?.lga?.name}
                          </p>
                        </div>
                        {topParty && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: topParty.party.color }}
                            />
                            <span className="text-xs font-medium text-gray-300">
                              {topParty.party.abbreviation} {formatNumber(topParty.votes)}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-gray-600 flex-shrink-0">
                          {timeAgo(r.createdAt)}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            r.status === 'verified'
                              ? 'bg-green-900/50 text-green-400'
                              : r.status === 'flagged'
                              ? 'bg-red-900/50 text-red-400'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Incidents + Live feed */}
          <div className="space-y-5">
            {/* Incident stats */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">
                Incident Monitor
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    label: 'Critical',
                    value: incStats?.critical ?? 0,
                    color: 'text-red-400',
                    bg: 'bg-red-950/40',
                    border: 'border-red-900/40',
                  },
                  {
                    label: 'Escalated',
                    value: incStats?.escalated ?? 0,
                    color: 'text-orange-400',
                    bg: 'bg-orange-950/40',
                    border: 'border-orange-900/40',
                  },
                  {
                    label: 'Open',
                    value: incStats?.open ?? 0,
                    color: 'text-amber-400',
                    bg: 'bg-amber-950/40',
                    border: 'border-amber-900/40',
                  },
                  {
                    label: 'Resolved',
                    value: incStats?.resolved ?? 0,
                    color: 'text-green-400',
                    bg: 'bg-green-950/40',
                    border: 'border-green-900/40',
                  },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} className={`${bg} border ${border} rounded-xl p-3 text-center`}>
                    <p className={`text-2xl font-bold ${color} ${value > 0 && label !== 'Resolved' ? 'animate-pulse' : ''}`}>
                      {value}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Active incident list */}
              {activeIncidents.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Active</p>
                  {activeIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className={`flex items-start gap-2.5 py-2 px-3 rounded-xl ${
                        inc.status === IncidentStatus.ESCALATED
                          ? 'bg-red-950/30 border border-red-900/30'
                          : 'bg-gray-800/40'
                      }`}
                    >
                      <SeverityDot severity={inc.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-300">
                          {incidentTypeLabel(inc.type)}
                        </p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">
                          {inc.pollingUnit?.name ?? inc.ward?.name ?? inc.lga?.name ?? 'Unknown location'}
                        </p>
                        <p className="text-xs text-gray-700 line-clamp-1 mt-0.5">
                          {inc.description}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {inc.status === IncidentStatus.ESCALATED && (
                          <span className="text-xs text-red-400 font-bold">ESC</span>
                        )}
                        <span className="text-xs text-gray-700">{timeAgo(inc.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-500 py-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">No active incidents</span>
                </div>
              )}
            </div>

            {/* Live activity feed */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                  Live Activity
                </h2>
              </div>
              {events.length === 0 ? (
                <p className="text-xs text-gray-600 py-4 text-center">
                  Waiting for events…
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {events.slice(0, 20).map((ev, i) => {
                    const isResult = ev.type.startsWith('result');
                    const isIncident = ev.type.startsWith('incident');
                    const isAnomaly = ev.type === 'result:anomaly';
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg text-xs transition-all ${
                          isAnomaly
                            ? 'bg-amber-950/40 border border-amber-900/30'
                            : isIncident
                            ? 'bg-red-950/30'
                            : 'bg-gray-800/40'
                        }`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                            isAnomaly
                              ? 'bg-amber-400'
                              : isIncident
                              ? 'bg-red-400'
                              : isResult
                              ? 'bg-green-400'
                              : 'bg-gray-500'
                          }`}
                        />
                        <span className={`font-mono flex-1 ${
                          isAnomaly ? 'text-amber-400' : isIncident ? 'text-red-400' : 'text-gray-300'
                        }`}>
                          {ev.type}
                        </span>
                        <span className="text-gray-700 tabular-nums">
                          {ev.timestamp.toLocaleTimeString('en-NG', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Geography stats */}
            {geoStats && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Coverage
                </h2>
                <div className="space-y-2.5">
                  {[
                    { label: 'LGAs', value: geoStats.lgas },
                    { label: 'Wards', value: geoStats.wards },
                    { label: 'Polling Units', value: geoStats.pollingUnits },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-sm font-bold text-gray-300 tabular-nums">
                        {formatNumber(value)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Reporting rate</span>
                      <span className="text-sm font-bold text-green-400">{reportingPct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-700"
                        style={{ width: `${reportingPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-2 flex items-center justify-between">
        <p className="text-xs text-gray-700">
          Sitroom v0.1 · {user?.name} · {user?.role?.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-gray-700">
          Auto-refresh every 30s · {events.length} events received
        </p>
      </footer>
    </div>
  );
}

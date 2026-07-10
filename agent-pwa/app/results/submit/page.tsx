'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/lib/types';
import type { Party } from '@/lib/types';

interface PartyVote {
  partyId: string;
  votes: string;
}

export default function SubmitResultPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [partyVotes, setPartyVotes] = useState<PartyVote[]>([]);
  const [form, setForm] = useState({
    pollingUnitId: '',
    accreditedVoters: '',
    totalVotesCast: '',
    rejectedBallots: '',
    totalValidVotes: '',
    iNecFormImageUrl: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = [
    Role.AGENT,
    Role.WARD_COORDINATOR,
    Role.LGA_COORDINATOR,
    Role.STATE_COORDINATOR,
    Role.ADMIN,
  ].includes(user?.role as Role);

  useEffect(() => {
    if (!canSubmit) {
      router.replace('/results');
      return;
    }

    setLoading(true);
    // Pre-fill polling unit from auth context user
    if (user?.pollingUnit?.id) {
      setForm((f) => ({ ...f, pollingUnitId: user.pollingUnit!.id }));
    }

    api.getParties()
      .then((partyList) => {
        setParties(partyList);
        setPartyVotes(partyList.map((p) => ({ partyId: p.id, votes: '' })));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [canSubmit, router, user]);

  function setField(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setVote(partyId: string, votes: string) {
    setPartyVotes((prev) =>
      prev.map((pv) => (pv.partyId === partyId ? { ...pv, votes } : pv))
    );
  }

  // Auto-compute totalValidVotes when party votes change
  useEffect(() => {
    const sum = partyVotes.reduce((acc, pv) => acc + (parseInt(pv.votes) || 0), 0);
    setForm((f) => ({ ...f, totalValidVotes: sum > 0 ? String(sum) : f.totalValidVotes }));
  }, [partyVotes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.pollingUnitId) {
      setError('Polling unit ID is required. Contact your coordinator.');
      return;
    }

    const partyScores = partyVotes
      .filter((pv) => pv.votes !== '')
      .map((pv) => ({ partyId: pv.partyId, votes: parseInt(pv.votes) }));

    const payload = {
      pollingUnitId: form.pollingUnitId,
      accreditedVoters: parseInt(form.accreditedVoters),
      totalVotesCast: parseInt(form.totalVotesCast),
      rejectedBallots: parseInt(form.rejectedBallots),
      totalValidVotes: parseInt(form.totalValidVotes),
      partyScores,
      ...(form.iNecFormImageUrl ? { iNecFormImageUrl: form.iNecFormImageUrl } : {}),
    };

    setSubmitting(true);
    try {
      await api.submitResult(payload);
      router.push('/results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Submit Result" backHref="/results">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  return (
    <AppShell title="Submit Result" backHref="/results">
      <div className="px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Polling unit info */}
          {user?.pollingUnit && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Your polling unit</p>
              <p className="text-sm font-semibold text-green-900">{user.pollingUnit.name}</p>
              <p className="text-xs text-green-700 mt-0.5">
                {user.pollingUnit.ward?.name} · {user.pollingUnit.ward?.lga?.name}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Registered voters: {user.pollingUnit.registeredVoters?.toLocaleString() ?? '—'}
              </p>
            </div>
          )}

          {/* Manual PU ID for non-agent roles */}
          {user?.role !== Role.AGENT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Polling Unit ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.pollingUnitId}
                onChange={(e) => setField('pollingUnitId', e.target.value)}
                placeholder="UUID of the polling unit"
                className={inputClass}
              />
            </div>
          )}

          {/* Vote counts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Vote counts</h3>
            <div className="space-y-3">
              {[
                { key: 'accreditedVoters', label: 'Accredited voters' },
                { key: 'totalVotesCast', label: 'Total votes cast' },
                { key: 'rejectedBallots', label: 'Rejected ballots' },
                { key: 'totalValidVotes', label: 'Total valid votes' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    required
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setField(key as keyof typeof form, e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Party votes */}
          {parties.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Party votes</h3>
              <div className="space-y-3">
                {parties.map((party) => {
                  const pv = partyVotes.find((p) => p.partyId === party.id);
                  return (
                    <div key={party.id} className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: party.color || '#6b7280' }}
                      >
                        {party.abbreviation.slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {party.abbreviation} — {party.name}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={pv?.votes ?? ''}
                          onChange={(e) => setVote(party.id, e.target.value)}
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* INEC form image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              INEC form image URL <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="url"
              value={form.iNecFormImageUrl}
              onChange={(e) => setField('iNecFormImageUrl', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Spinner size="sm" className="text-white" /> : null}
            {submitting ? 'Submitting…' : 'Submit result'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { IncidentType, IncidentSeverity } from '@/lib/types';
import { incidentTypeLabel } from '@/lib/utils';

export default function NewIncidentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: '',
    severity: '',
    description: '',
    pollingUnitId: '',
    wardId: '',
    lgaId: '',
    mediaUrls: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill location from user profile
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        pollingUnitId: user.pollingUnit?.id ?? '',
        wardId: user.ward?.id ?? user.pollingUnit?.ward?.id ?? '',
        lgaId: user.lga?.id ?? user.pollingUnit?.ward?.lga?.id ?? '',
      }));
    }
  }, [user]);

  function setField(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.type || !form.severity || !form.description.trim()) {
      setError('Type, severity, and description are required.');
      return;
    }

    const payload: {
      type: string;
      severity: string;
      description: string;
      pollingUnitId?: string;
      wardId?: string;
      lgaId?: string;
      mediaUrls?: string[];
    } = {
      type: form.type,
      severity: form.severity,
      description: form.description.trim(),
    };

    if (form.pollingUnitId) payload.pollingUnitId = form.pollingUnitId;
    if (form.wardId) payload.wardId = form.wardId;
    if (form.lgaId) payload.lgaId = form.lgaId;
    if (form.mediaUrls.trim()) {
      payload.mediaUrls = form.mediaUrls.split('\n').map((u) => u.trim()).filter(Boolean);
    }

    setSubmitting(true);
    try {
      await api.createIncident(payload);
      router.push('/incidents');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to report incident');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white';

  return (
    <AppShell title="Report Incident" backHref="/incidents">
      <div className="px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Incident type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              className={inputClass}
            >
              <option value="">Select type…</option>
              {Object.values(IncidentType).map((t) => (
                <option key={t} value={t}>{incidentTypeLabel(t)}</option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Severity <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(IncidentSeverity).map((sev) => {
                const colors: Record<IncidentSeverity, string> = {
                  [IncidentSeverity.LOW]: 'border-green-300 bg-green-50 text-green-700 data-[selected=true]:bg-green-600 data-[selected=true]:text-white data-[selected=true]:border-green-600',
                  [IncidentSeverity.MEDIUM]: 'border-amber-300 bg-amber-50 text-amber-700 data-[selected=true]:bg-amber-500 data-[selected=true]:text-white data-[selected=true]:border-amber-500',
                  [IncidentSeverity.HIGH]: 'border-orange-300 bg-orange-50 text-orange-700 data-[selected=true]:bg-orange-500 data-[selected=true]:text-white data-[selected=true]:border-orange-500',
                  [IncidentSeverity.CRITICAL]: 'border-red-300 bg-red-50 text-red-700 data-[selected=true]:bg-red-600 data-[selected=true]:text-white data-[selected=true]:border-red-600',
                };
                return (
                  <button
                    key={sev}
                    type="button"
                    data-selected={form.severity === sev}
                    onClick={() => setField('severity', sev)}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold capitalize transition-colors ${colors[sev]}`}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Describe what happened in detail…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Location (auto-filled for agents) */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Location (optional)</h3>

            {user?.pollingUnit && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-green-700">Pre-filled from your profile</p>
                  <p className="text-xs text-green-600">{user.pollingUnit.name}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Polling Unit ID</label>
              <input
                type="text"
                value={form.pollingUnitId}
                onChange={(e) => setField('pollingUnitId', e.target.value)}
                placeholder="UUID (auto-filled for agents)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ward ID</label>
              <input
                type="text"
                value={form.wardId}
                onChange={(e) => setField('wardId', e.target.value)}
                placeholder="UUID"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">LGA ID</label>
              <input
                type="text"
                value={form.lgaId}
                onChange={(e) => setField('lgaId', e.target.value)}
                placeholder="UUID"
                className={inputClass}
              />
            </div>
          </div>

          {/* Media URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Media URLs <span className="text-gray-400 text-xs">(one per line, optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.mediaUrls}
              onChange={(e) => setField('mediaUrls', e.target.value)}
              placeholder="https://..."
              className={`${inputClass} resize-none`}
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Spinner size="sm" className="text-white" /> : null}
            {submitting ? 'Reporting…' : 'Report incident'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

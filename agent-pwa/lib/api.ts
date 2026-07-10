import { getToken } from './auth';
import type {
  User,
  Result,
  Incident,
  Party,
  Lga,
  Ward,
  PollingUnit,
  Aggregation,
  LgaAggregation,
  IncidentStats,
  AdminStats,
  GeoStats,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${API_PREFIX}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────
  login(phone: string, password: string) {
    return request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  getProfile() {
    return request<User>('/auth/profile');
  },

  // ── Results ───────────────────────────────────────────────────────
  getResults(params?: { lgaId?: string; wardId?: string; anomalous?: boolean }) {
    const q = new URLSearchParams();
    if (params?.lgaId) q.set('lgaId', params.lgaId);
    if (params?.wardId) q.set('wardId', params.wardId);
    if (params?.anomalous !== undefined) q.set('anomalous', String(params.anomalous));
    return request<Result[]>(`/results${q.size ? `?${q}` : ''}`);
  },

  getResult(id: string) {
    return request<Result>(`/results/${id}`);
  },

  submitResult(data: {
    pollingUnitId: string;
    accreditedVoters: number;
    totalVotesCast: number;
    rejectedBallots: number;
    totalValidVotes: number;
    partyScores: Array<{ partyId: string; votes: number }>;
    iNecFormImageUrl?: string;
  }) {
    return request<Result>('/results/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAggregation() {
    return request<Aggregation>('/results/aggregation');
  },

  getLgaAggregation() {
    return request<LgaAggregation[]>('/results/aggregation/lga');
  },

  verifyResult(id: string) {
    return request<Result>(`/results/${id}/verify`, { method: 'PATCH' });
  },

  flagResult(id: string, reasons: string[]) {
    return request<Result>(`/results/${id}/flag`, {
      method: 'PATCH',
      body: JSON.stringify({ reasons }),
    });
  },

  // ── Incidents ─────────────────────────────────────────────────────
  getIncidents(params?: {
    lgaId?: string;
    wardId?: string;
    severity?: string;
    status?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.lgaId) q.set('lgaId', params.lgaId);
    if (params?.wardId) q.set('wardId', params.wardId);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.status) q.set('status', params.status);
    return request<Incident[]>(`/incidents${q.size ? `?${q}` : ''}`);
  },

  getIncident(id: string) {
    return request<Incident>(`/incidents/${id}`);
  },

  createIncident(data: {
    type: string;
    severity: string;
    description: string;
    pollingUnitId?: string;
    wardId?: string;
    lgaId?: string;
    mediaUrls?: string[];
  }) {
    return request<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getIncidentStats() {
    return request<IncidentStats>('/incidents/stats');
  },

  escalateIncident(id: string) {
    return request<Incident>(`/incidents/${id}/escalate`, { method: 'PATCH' });
  },

  resolveIncident(id: string, note: string) {
    return request<Incident>(`/incidents/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
  },

  // ── Parties ───────────────────────────────────────────────────────
  getParties() {
    return request<Party[]>('/parties');
  },

  // ── Geography ─────────────────────────────────────────────────────
  getLgas() {
    return request<Lga[]>('/geography/lgas');
  },

  getWards(lgaId?: string) {
    return request<Ward[]>(`/geography/wards${lgaId ? `?lgaId=${lgaId}` : ''}`);
  },

  getPollingUnits(wardId?: string, lgaId?: string) {
    const q = new URLSearchParams();
    if (wardId) q.set('wardId', wardId);
    if (lgaId) q.set('lgaId', lgaId);
    return request<PollingUnit[]>(`/geography/polling-units${q.size ? `?${q}` : ''}`);
  },

  // ── Geography Stats ───────────────────────────────────────────────
  getGeoStats() {
    return request<GeoStats>('/geography/stats');
  },

  // ── Admin ─────────────────────────────────────────────────────────
  getAdminStats() {
    return request<AdminStats>('/admin/stats');
  },
};

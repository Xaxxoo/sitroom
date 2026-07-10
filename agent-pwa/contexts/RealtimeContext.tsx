'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/auth';

export interface RealtimeEvent {
  type: string;
  data: unknown;
  timestamp: Date;
}

interface RealtimeContextValue {
  connected: boolean;
  lastEvent: RealtimeEvent | null;
  events: RealtimeEvent[];
}

const RealtimeContext = createContext<RealtimeContextValue>({
  connected: false,
  lastEvent: null,
  events: [],
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_EVENTS = 50;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(`${API_URL}/sitroom`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const handleEvent = (type: string) => (data: unknown) => {
      const event: RealtimeEvent = { type, data, timestamp: new Date() };
      setLastEvent(event);
      setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    };

    socket.on('result:submitted', handleEvent('result:submitted'));
    socket.on('result:anomaly', handleEvent('result:anomaly'));
    socket.on('incident:reported', handleEvent('incident:reported'));
    socket.on('incident:updated', handleEvent('incident:updated'));
    socket.on('agent:status', handleEvent('agent:status'));
    socket.on('aggregation:update', handleEvent('aggregation:update'));

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ connected, lastEvent, events }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

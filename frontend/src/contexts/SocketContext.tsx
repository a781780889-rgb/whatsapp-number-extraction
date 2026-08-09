import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { createDashboardSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [connected, setConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setSocketInstance((prev) => {
        prev?.disconnect();
        return null;
      });
      setConnected(false);
      return;
    }

    const socket = createDashboardSocket(accessToken);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    setSocketInstance(socket);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [accessToken]);

  const value = useMemo(() => ({ socket: socketInstance, connected }), [socketInstance, connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

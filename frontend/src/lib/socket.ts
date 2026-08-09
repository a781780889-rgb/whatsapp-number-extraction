import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined; // undefined = نفس المضيف الحالي (proxy في التطوير)

export function createDashboardSocket(accessToken: string): Socket {
  return io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token: accessToken },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    transports: ['websocket', 'polling'],
  });
}

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 
  (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000');

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    // Reuse existing socket if already connected for same user
    if (socketRef.current?.connected) {
      return;
    }

    // Create new socket connection
    const socket = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500, // Faster reconnection
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false // Try to reuse existing connection
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id, 'User:', user.name);
    });

    socket.on('disconnect', (reason) => {
      // Only log unexpected disconnects, not normal page refresh disconnects
      // 'transport close' happens on page refresh - this is normal
      if (reason !== 'transport close' && reason !== 'io client disconnect') {
        console.log('Socket disconnected:', reason);
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Cleanup on unmount
    return () => {
      // Note: On page refresh, this cleanup runs but the socket will naturally disconnect
      // because the entire JavaScript context is destroyed. This is expected behavior.
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  return socketRef.current;
};


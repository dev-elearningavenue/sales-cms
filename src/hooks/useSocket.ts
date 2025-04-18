'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/lib/socket';

let socket: Socket | null = null;

export interface UseSocketOptions {
  onNewLead?: (lead: any) => void;
  onLeadAssigned?: (data: { lead: any }) => void;
  onLeadStatusChanged?: (data: { lead: any }) => void;
  onLeadDeleted?: (data: { leadId: string }) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);

  const setupSocket = useCallback(() => {
    if (!socket) {
      // Create socket instance if doesn't exist
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
      socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Set up event listeners based on provided options
    if (options.onNewLead) {
      socket.on(SOCKET_EVENTS.NEW_LEAD, options.onNewLead);
    }

    if (options.onLeadAssigned) {
      socket.on(SOCKET_EVENTS.LEAD_ASSIGNED, options.onLeadAssigned);
    }

    if (options.onLeadStatusChanged) {
      socket.on(SOCKET_EVENTS.LEAD_STATUS_CHANGED, options.onLeadStatusChanged);
    }

    if (options.onLeadDeleted) {
      socket.on(SOCKET_EVENTS.LEAD_DELETED, options.onLeadDeleted);
    }

    return () => {
      // Clean up event listeners when the component unmounts
      if (options.onNewLead) {
        socket?.off(SOCKET_EVENTS.NEW_LEAD, options.onNewLead);
      }
      if (options.onLeadAssigned) {
        socket?.off(SOCKET_EVENTS.LEAD_ASSIGNED, options.onLeadAssigned);
      }
      if (options.onLeadStatusChanged) {
        socket?.off(SOCKET_EVENTS.LEAD_STATUS_CHANGED, options.onLeadStatusChanged);
      }
      if (options.onLeadDeleted) {
        socket?.off(SOCKET_EVENTS.LEAD_DELETED, options.onLeadDeleted);
      }
    };
  }, [options]);

  useEffect(() => {
    // Set up socket connection and event listeners
    const cleanup = setupSocket();

    return () => {
      // Clean up when the component unmounts
      cleanup();
    };
  }, [setupSocket]);

  return {
    isConnected,
    socket
  };
}; 
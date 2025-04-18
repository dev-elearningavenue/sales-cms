'use client';

import { type Socket as ClientSocket } from 'socket.io-client';

// Events we'll use
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Lead events
  NEW_LEAD: 'new_lead',
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  LEAD_DELETED: 'lead_deleted'
};

// This file now only contains client-side code
// Server-side socket initialization is moved to a separate file 
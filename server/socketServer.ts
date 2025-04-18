import { Server as IOServer } from 'socket.io';
import { Server as NetServer } from 'http';

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

// Socket.io server instance
let io: IOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export const initSocketServer = (server: NetServer) => {
  io = new IOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get Socket.IO server instance
 */
export const getSocketServer = () => {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  return io;
};

/**
 * Emit lead assigned event
 */
export const emitLeadAssigned = (lead: any) => {
  if (!io) return;
  
  io.emit(SOCKET_EVENTS.LEAD_ASSIGNED, {
    lead: {
      _id: lead._id,
      assigned: true,
      assigned_to: lead.assigned_to,
      assignedAt: lead.assignedAt || new Date()
    }
  });
};

/**
 * Emit new lead event
 */
export const emitNewLead = (lead: any) => {
  if (!io) return;
  
  io.emit(SOCKET_EVENTS.NEW_LEAD, {
    lead
  });
};

/**
 * Emit lead status changed event
 */
export const emitLeadStatusChanged = (lead: any) => {
  if (!io) return;
  
  io.emit(SOCKET_EVENTS.LEAD_STATUS_CHANGED, {
    lead: {
      _id: lead._id,
      status: lead.status,
      resolve_status: lead.resolve_status,
      updatedAt: new Date()
    }
  });
};

/**
 * Emit lead deleted event
 */
export const emitLeadDeleted = (leadId: string) => {
  if (!io) return;
  
  io.emit(SOCKET_EVENTS.LEAD_DELETED, {
    leadId
  });
}; 
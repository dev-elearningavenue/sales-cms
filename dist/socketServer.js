"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitLeadDeleted = exports.emitLeadStatusChanged = exports.emitNewLead = exports.emitLeadAssigned = exports.getSocketServer = exports.initSocketServer = exports.SOCKET_EVENTS = void 0;
const socket_io_1 = require("socket.io");
// Events we'll use
exports.SOCKET_EVENTS = {
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
let io = null;

/**
 * Initialize Socket.IO server
 */
const initSocketServer = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    io.on(exports.SOCKET_EVENTS.CONNECT, (socket) => {
        console.log(`Client connected: ${socket.id}`);
        socket.on(exports.SOCKET_EVENTS.DISCONNECT, () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocketServer = initSocketServer;

/**
 * Get Socket.IO server instance
 */
const getSocketServer = () => {
    if (!io) {
        throw new Error('Socket.IO server not initialized');
    }
    return io;
};
exports.getSocketServer = getSocketServer;

/**
 * Emit lead assigned event
 */
const emitLeadAssigned = (lead) => {
    if (!io)
        return;
    io.emit(exports.SOCKET_EVENTS.LEAD_ASSIGNED, {
        lead: {
            _id: lead._id,
            assigned: true,
            assigned_to: lead.assigned_to,
            assignedAt: lead.assignedAt || new Date()
        }
    });
};
exports.emitLeadAssigned = emitLeadAssigned;

/**
 * Emit new lead event
 */
const emitNewLead = (lead) => {
    if (!io)
        return;
    io.emit(exports.SOCKET_EVENTS.NEW_LEAD, {
        lead
    });
};
exports.emitNewLead = emitNewLead;

/**
 * Emit lead status changed event
 */
const emitLeadStatusChanged = (lead) => {
    if (!io)
        return;
    io.emit(exports.SOCKET_EVENTS.LEAD_STATUS_CHANGED, {
        lead: {
            _id: lead._id,
            status: lead.status,
            resolve_status: lead.resolve_status,
            updatedAt: new Date()
        }
    });
};
exports.emitLeadStatusChanged = emitLeadStatusChanged;

/**
 * Emit lead deleted event
 */
const emitLeadDeleted = (leadId) => {
    if (!io)
        return;
    io.emit(exports.SOCKET_EVENTS.LEAD_DELETED, {
        leadId
    });
};
exports.emitLeadDeleted = emitLeadDeleted;

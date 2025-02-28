import { Server } from "socket.io";

let io: Server | null = null;

export function initWebSocket(server: any) {
  if (!io) {
    io = new Server(server);
    console.log("WebSocket Server Initialized");

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);
    });
  }
}

export function notifyUI(data: any) {
  if (io) {
    io.emit("newData", data);
    console.log("Notification sent to UI");
  }
}
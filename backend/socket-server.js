const express = require("express");
const { useAzureSocketIO } = require("@azure/web-pubsub-express");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.SOCKET_PORT || 3001;
const HUB = "chat";
const CONNECTION_STRING =
  process.env.AZURE_WEBPUBSUB_CONNECTION_STRING ||
  "Endpoint=https://zpi-chat.webpubsub.azure.com;AccessKey=32w3dxZ4TunKbTtUV0EHr07LRJ5iRSBzXKNpvVCKdk2H50K8kKx5JQQJ99BKACE1PydXJ3w3AAAAAWPSLPXJ;Version=1.0;";

console.log(
  `🚀 Starting Socket.IO server with Azure Web PubSub for Socket.IO...`
);
console.log(`📡 Hub: ${HUB}`);
console.log(`🌐 Port: ${PORT}`);

// Create Socket.IO server
const io = new Server({
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  },
});

// Use Azure Web PubSub for Socket.IO
useAzureSocketIO(io, {
  hub: HUB,
  connectionString: CONNECTION_STRING,
});

// Socket.IO event handlers
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on("joinGroup", ({ group, userId }) => {
    console.log(`📥 ${userId} joining group: ${group}`);
    socket.join(group);
    socket.to(group).emit("message", {
      from: "system",
      userId: "system",
      text: `${userId} joined ${group}`,
      group: group,
      timestamp: Date.now(),
    });
  });

  socket.on("leaveGroup", ({ group, userId }) => {
    console.log(`📤 ${userId} leaving group: ${group}`);
    socket.leave(group);
    socket.to(group).emit("message", {
      from: "system",
      userId: "system",
      text: `${userId} left ${group}`,
      group: group,
      timestamp: Date.now(),
    });
  });

  socket.on("message", (data) => {
    console.log(
      `💬 Message from ${data.from} to group ${data.group}:`,
      data.text
    );
    // Broadcast to everyone in the group including sender
    io.to(data.group).emit("message", {
      from: data.from,
      userId: data.userId,
      text: data.text,
      message: data.message,
      group: data.group,
      timestamp: data.timestamp || Date.now(),
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
  });
});

// Serve Socket.IO with Azure Web PubSub middleware
app.use(express.json());
useAzureSocketIO(app, io);

app.listen(PORT, () => {
  console.log(`✅ Socket.IO server running on http://localhost:${PORT}`);
  console.log(`🔗 Clients should connect to: http://localhost:${PORT}`);
});

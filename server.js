import { WebSocketServer } from "ws"; // ⬅️ require() hatao, import karo
import { firestore } from "./firebase.js"; // .js ka extension lagao

const wss = new WebSocketServer({ port: 8080 });

console.log("🔵 WebSocket Server Running on ws://localhost:8080");

let clients = {};

wss.on("connection", (ws) => {
  console.log("✅ New Client Connected");

  ws.on("message", async (data) => {
    const msg = JSON.parse(data);
    clients[msg.sender] = ws;

    console.log(`📩 Message from ${msg.sender} to ${msg.receiver}: ${msg.message}`);

    if (clients[msg.receiver]) {
      clients[msg.receiver].send(JSON.stringify(msg));
    } else {
      console.log("❌ Orphanage Not Online, Storing in Firebase");

      await firestore.collection("messages").add({
        sender: msg.sender,
        receiver: msg.receiver,
        message: msg.message,
        timestamp: Date.now()
      });
    }
  });

  ws.on("close", () => {
    console.log("❌ Client Disconnected");
  });
});

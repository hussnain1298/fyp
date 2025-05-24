import { WebSocketServer } from "ws";
import admin from "firebase-admin";

admin.initializeApp();
const firestore = admin.firestore();

const wss = new WebSocketServer({ port: 8080 });
console.log("🔵 WebSocket Server Running on ws://localhost:8080");

let clients = {};

wss.on("connection", (ws) => {
  console.log("✅ New Client Connected");

  ws.on("message", async (data) => {
    try {
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
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  });

  ws.on("close", () => {
    console.log("❌ Client Disconnected");
    for (const [key, client] of Object.entries(clients)) {
      if (client === ws) {
        delete clients[key];
        break;
      }
    }
  });
});

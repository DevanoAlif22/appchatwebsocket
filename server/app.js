const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Setup Express
const app = express();
const server = http.createServer(app);

// Setup gemini AI
require("dotenv").config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Setup WebSocket server
const wss = new WebSocket.Server({ server });

// simpan data pengguna dalam bentuk map
const connections = new Map();
let userCount = 0;

// Function untuk broadcast pengiriman pesan kepada user yang sedang online
function broadcastMessage(message) {
  connections.forEach((_, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      const { username, message: messageContent } = data;

      // ketika user pertama login
      if (
        messageContent.type === "system" &&
        messageContent.text === "Active"
      ) {
        connections.set(ws, username);
        userCount += 1;
        const systemMessage = {
          username: "System",
          userCount: userCount,
          message: {
            text: `${username} bergabung dalam chat`,
            type: "text",
          },
        };
        broadcastMessage(systemMessage);
        console.log(`${username} joined the chat`);
        return;
      }
      // ketika ada kata AI
      const regex = /\bAI\b/;
      if (
        messageContent.type === "text" &&
        regex.test(messageContent.text.toUpperCase())
      ) {
        try {
          const result = await model.generateContent(messageContent.text);
          const aiResponse = result.response.text();
          console.log("ini tes response");
          console.log(result.response);

          broadcastMessage(data);

          const aiMessage = {
            username: "AI",
            message: {
              text: aiResponse,
              type: "text",
            },
          };
          broadcastMessage(aiMessage);
        } catch (error) {
          console.error("Error generating AI response:", error);
          const errorMessage = {
            username: "System",
            message: {
              text: "Maaf, terjadi kesalahan saat memproses permintaan AI",
              type: "text",
            },
          };
          ws.send(JSON.stringify(errorMessage));
        }
      } else {
        // Broadcast regular message
        broadcastMessage(data);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  // Handle client disconnect
  ws.on("close", () => {
    const username = connections.get(ws);
    if (username) {
      userCount -= 1;
      const systemMessage = {
        username: "System",
        userCount: userCount,
        message: {
          text: `${username} meninggalkan chat`,
          type: "text",
        },
      };
      broadcastMessage(systemMessage);
      console.log(`${username} disconnected`);
    }
    connections.delete(ws);
  });
});

app.get("/", (req, res) => {
  res.send("Halo Dunia");
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://192.168.1.19:${PORT}`);
});

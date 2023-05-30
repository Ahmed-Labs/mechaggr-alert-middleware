import { PrismaClient } from "@prisma/client";
import { Socket, Server } from "socket.io";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import http from "http";
dotenv.config();
const prisma = new PrismaClient();

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Keeping track of connected clients
const connectedClients = new Map();

function getAllUserAlerts() {
  return prisma.userAlerts
    .findMany({
      select: {
        userId: true,
        alerts: true,
      },
    })
    .then(console.log);
}

async function processListing(listingType: string, data: any) {
  // return listingType,
}

async function main() {
  await prisma.$connect();
  console.log("Prisma Connected");
  await getAllUserAlerts();
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);

    console.log("Mongoose Connected");

    const db = mongoose.connection;
    const discordStream = db.collection("DiscordMessage").watch();
    const redditStream = db.collection("Post").watch();

    discordStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        const data = change.fullDocument;
        const userId = data.userId;
        console.log("Discord:", data);

        // // Get the specific client with matching userId
        // const clients = await io.in(userId).fetchSockets();

        // // Send data to the specific client
        // clients.forEach((client) => {
        //   client.emit("data", data);
        // });
      }
    });

    redditStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        const data = change.fullDocument;
        const userId = data.userId;
        console.log("Reddit:", data);

        // // Get the specific client with matching userId
        // const clients = await io.in(userId).fetchSockets();

        // // Send data to the specific client
        // clients.forEach((client) => {
        //   client.emit("data", data);
        // });
      }
    });

    io.on("connection", async (socket) => {

      socket.on("join", (userId) => {
        connectedClients.set(socket.id, userId);
        console.log(connectedClients);

        userId = userId
      });

      socket.on("disconnect", () => {
        console.log(socket.id);
        
        const userId = connectedClients.get(socket.id);
        // console.log(userId + " disconnected");
        connectedClients.delete(socket.id);
        console.log(connectedClients);
        
      });
    });

    server.listen(3333, () => {
      console.log("Websocket server listening on port 3333");
    });
  } catch (err) {
    console.log("Failed to connect through Mongoose:", err);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

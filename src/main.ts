import { PrismaClient } from "@prisma/client";
import { Socket, Server } from "socket.io";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import http from "http";
import { RedditType, DiscordType } from "./types/types";
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

async function getAllUserAlerts(): Promise<
  { userId: string; alerts: string[] }[]
> {
  const userAlerts = await prisma.userAlerts.findMany({
    select: {
      userId: true,
      alerts: true,
    },
  });

  return userAlerts;
}

function preprocessAlerts(userAlerts: string[]): {
  alertType: string;
  inclusionKeywords: string[];
  exclusionKeywords: string[];
}[] {
  const processedAlerts = [];

  for (const alert of userAlerts) {
    const splitAlert = alert.split(",");
    const alertType = splitAlert[0];
    const keywords = splitAlert.slice(1);

    const inclusionKeywords: string[] = [];
    const exclusionKeywords: string[] = [];

    for (const keyword of keywords) {
      if (keyword.startsWith("-")) {
        exclusionKeywords.push(keyword.slice(1));
      } else {
        inclusionKeywords.push(keyword);
      }
    }
    processedAlerts.push({
      alertType,
      inclusionKeywords,
      exclusionKeywords,
    });
  }
  return processedAlerts;
}

async function sendAlert(matchingListing: string) {}

async function processDiscordAlerts(data: DiscordType) {
  const userAlerts = await getAllUserAlerts();

  const body = data.content;
  const matchedUsers = [];
  for (const user of userAlerts) {
    console.log(user.userId);
    
    const preprocessedAlerts = preprocessAlerts(user.alerts);
    for (const alert of preprocessedAlerts) {
      let isMatch = true;
      if (alert.alertType.toLowerCase() != data.postType.toLowerCase()) {
        continue;
      }
      for (const keyword of alert.inclusionKeywords) {
        if (!body.includes(keyword)) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        for (const keyword of alert.exclusionKeywords) {
          if (body.includes(keyword)) {
            isMatch = false;
            break;
          }
        }
      }
      if (isMatch) matchedUsers.push(user.userId);
    }
  }
  console.log(matchedUsers);

  return matchedUsers;
}
async function processRedditAlerts(data: RedditType) {
  const userAlerts = await getAllUserAlerts();
}

function isMatching(body: string, alert: string) {}

async function main() {
  await prisma.$connect();
  console.log("Prisma Connected");
  console.log(await getAllUserAlerts());

  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    console.log("Mongoose Connected");

    const db = mongoose.connection;
    const discordStream = db.collection("DiscordMessage").watch();
    const redditStream = db.collection("Post").watch();
    let socketInstance: Socket;

    io.on("connection", async (socket) => {
      socketInstance = socket;
      socket.on("join", (userId) => {
        connectedClients.set(userId, socket.id);
        console.log(connectedClients);
      });

      socket.on("disconnect", () => {
        const userId = connectedClients.get(socket.id);
        connectedClients.delete(userId);
        console.log(connectedClients);
      });
    });

    discordStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        const data = change.fullDocument;
        const userId = data.userId;
        console.log("Discord:", data._id);
  
        const matchedUsers = await processDiscordAlerts({
          id: data._id,
          content: data.content,
          author: data.author,
          postType: data.postType,
          dateCreated: data.dateCreated,
          serverName: data.serverName,
          channelName: data.channelName,
        });
        console.log("matchd users:", matchedUsers);
        
        matchedUsers.forEach(async (user) => {
          const socketId = connectedClients.get(user);
          const listingID = "Discord:" + data._id;
          console.log(socketId, listingID);
          console.log(user);
          console.log(connectedClients);

          if (socketId) {
            socketInstance.to(socketId).emit("alert", listingID);
            
            console.log("We throughhh", socketId);
          }
          // await prisma.userAlerts.update({
          //   where: {
          //     userId: userId,
          //   },
          //   data: {
          //     matchedListings: {
          //       push: listingID,
          //     },
          //   },
          // });
        });
      }
    });

    redditStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        const data = change.fullDocument;
        const userId = data.userId;
        console.log("Reddit:", data);
      }
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

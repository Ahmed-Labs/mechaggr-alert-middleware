"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv = __importStar(require("dotenv"));
const http_1 = __importDefault(require("http"));
dotenv.config();
const prisma = new client_1.PrismaClient();
const server = http_1.default.createServer();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});
// Keeping track of connected clients
const connectedClients = new Map();
function getAllUserAlerts() {
    return __awaiter(this, void 0, void 0, function* () {
        const userAlerts = yield prisma.userAlerts.findMany({
            select: {
                userId: true,
                alerts: true,
            },
        });
        return userAlerts;
    });
}
function preprocessAlerts(userAlerts) {
    const processedAlerts = [];
    for (const alert of userAlerts) {
        const splitAlert = alert.split(",");
        const alertType = splitAlert[0];
        const keywords = splitAlert.slice(1);
        const inclusionKeywords = [];
        const exclusionKeywords = [];
        for (const keyword of keywords) {
            if (keyword.startsWith("-")) {
                exclusionKeywords.push(keyword.slice(1));
            }
            else {
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
function sendAlert(matchingListing) {
    return __awaiter(this, void 0, void 0, function* () { });
}
function processDiscordAlerts(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const userAlerts = yield getAllUserAlerts();
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
                if (isMatch)
                    matchedUsers.push(user.userId);
            }
        }
        console.log(matchedUsers);
        return matchedUsers;
    });
}
function processRedditAlerts(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const userAlerts = yield getAllUserAlerts();
    });
}
function isMatching(body, alert) { }
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma.$connect();
        console.log("Prisma Connected");
        console.log(yield getAllUserAlerts());
        try {
            yield mongoose_1.default.connect(process.env.DATABASE_URL);
            console.log("Mongoose Connected");
            const db = mongoose_1.default.connection;
            const discordStream = db.collection("DiscordMessage").watch();
            const redditStream = db.collection("Post").watch();
            let socketInstance;
            io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
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
            }));
            discordStream.on("change", (change) => __awaiter(this, void 0, void 0, function* () {
                if (change.operationType === "insert") {
                    const data = change.fullDocument;
                    const userId = data.userId;
                    console.log("Discord:", data._id);
                    const matchedUsers = yield processDiscordAlerts({
                        id: data._id,
                        content: data.content,
                        author: data.author,
                        postType: data.postType,
                        dateCreated: data.dateCreated,
                        serverName: data.serverName,
                        channelName: data.channelName,
                    });
                    console.log("matchd users:", matchedUsers);
                    matchedUsers.forEach((user) => __awaiter(this, void 0, void 0, function* () {
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
                    }));
                }
            }));
            redditStream.on("change", (change) => __awaiter(this, void 0, void 0, function* () {
                if (change.operationType === "insert") {
                    const data = change.fullDocument;
                    const userId = data.userId;
                    console.log("Reddit:", data);
                }
            }));
            server.listen(3333, () => {
                console.log("Websocket server listening on port 3333");
            });
        }
        catch (err) {
            console.log("Failed to connect through Mongoose:", err);
        }
    });
}
main()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}))
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(e);
    yield prisma.$disconnect();
    process.exit(1);
}));

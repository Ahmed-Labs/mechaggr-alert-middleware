import * as dotenv from "dotenv";
dotenv.config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient()


async function main() {
    await prisma.$connect();
    console.log("CONNECTED!");
    
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
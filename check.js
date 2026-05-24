const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();
prisma.room.findMany().then(r => console.log(JSON.stringify(r, null, 2))).finally(() => prisma.$disconnect());

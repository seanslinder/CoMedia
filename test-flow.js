const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.create({ data: { username: "test_bot_" + Date.now() } });
  console.log("User:", user.id);
  const room = await prisma.room.create({
    data: {
      name: "Buggy Room",
      is_private: true,
      password: "pass",
      owner_id: user.id,
    }
  });
  console.log("Created Room:", room.id);
  const fetched = await prisma.room.findUnique({ where: { id: room.id } });
  console.log("Fetched Room:", fetched ? "Found" : "Not Found");
}

run().finally(() => prisma.$disconnect());

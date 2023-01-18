import { PrismaClient } from '@prisma/client';
import express from 'express';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

app.get('/', async (req, res) => {
  res.json('hello');
});

app.get('/players', async (req, res) => {
  const players = await prisma.players.findMany();
  res.json(players);
});

const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

async function main() {
  await prisma.$connect();
  // await prisma.players.create({
  //   data: {
  //     name: 'Alice',
  //     gameCount: 0,
  //     games: [],
  //     totalHands: 0,
  //     totalScore: 0,
  //     wins: 0,
  //     v: 0,
  //   },
  // });

  const alice = await prisma.players.findFirst({ where: { name: 'Alice' } });

  await prisma.players.update({
    where: { id: alice?.id },
    data: {
      gameCount: 1,
      totalHands: 1,
      totalScore: 12,
    },
  });

  const allPlayers = await prisma.players.findMany();
  console.log(allPlayers);
}

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });

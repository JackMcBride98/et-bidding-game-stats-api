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

app.get('/game/:number/bid-get-percentage', async (req, res) => {
  const { number } = req.params;

  const game = await prisma.games.findFirst({
    where: { number: parseInt(number) },
    include: { players2: true },
  });

  if (!game) {
    return res.status(404).send('Game not found');
  }

  const bidGets = game.players.map((player) => 0);

  for (let i = 0; i < game.rounds.length; i++) {
    for (let j = 0; j < game.players.length; j++) {
      if ((game.bids as number[][])[i][j] === (game.gets as number[][])[i][j]) {
        bidGets[j]++;
      }
    }
  }

  const bidGetsPercentages = bidGets.map(
    (bidGet) => bidGet / game.rounds.length
  );

  return res.status(200).send(bidGetsPercentages);
});

const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

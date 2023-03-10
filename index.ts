import { PrismaClient } from '@prisma/client';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

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

app.get('/game/:number/hands-percentage', async (req, res) => {
  const { number } = req.params;

  const game = await prisma.games.findFirst({
    where: { number: parseInt(number) },
    include: { players2: true },
  });

  if (!game) {
    return res.status(404).send('Game not found');
  }

  const hands = game.players.map((player) => 0);

  for (let i = 0; i < game.rounds.length; i++) {
    for (let j = 0; j < game.players.length; j++) {
      hands[j] += (game.gets as number[][])[i][j];
    }
  }

  const totalHands = game.rounds.reduce((prev, curr) => prev + curr.hands, 0);

  const handsPercentage = hands.map((hand) => hand / totalHands);

  return res.status(200).send(handsPercentage);
});

app.get('/games/:number/bid-aggression', async (req, res) => {
  const { number } = req.params;

  const game = await prisma.games.findFirst({
    where: { number: parseInt(number) },
  });

  if (!game) {
    return res.status(404).send('Game not found');
  }

  const bidAggression = game.players.map((player) => 0);

  for (let i = 0; i < game.rounds.length; i++) {
    for (let j = 0; j < game.players.length; j++) {
      bidAggression[j] +=
        (game.bids as number[][])[i][j] / game.rounds[i].hands;
    }
  }

  const bidAgressionPercentages = bidAggression.map(
    (bidAggression) => bidAggression / game.rounds.length
  );

  return res.status(200).send(bidAgressionPercentages);
});

app.get('/game/:number/bid-get-percentage', async (req, res) => {
  const { number } = req.params;

  const game = await prisma.games.findFirst({
    where: { number: parseInt(number) },
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

app.get('/stats', async (req, res) => {
  const players = await (
    await prisma.players.findMany()
  ).map((player) => ({
    name: player.name,
    bidGets: 0,
    rounds: 0,
    bidGetPercentage: 0,
  }));
  const games = await prisma.games.findMany({
    include: { players2: true },
  });

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    if (game.addToLeaderboard === false) {
      continue;
    }
    const playerNames = game.players.map(
      (player) => game.players2.find((player2) => player2.id === player)?.name
    );
    const bidGets = game.players.map((player) => 0);

    for (let i = 0; i < game.rounds.length; i++) {
      for (let j = 0; j < game.players.length; j++) {
        if (
          (game.bids as number[][])[i][j] === (game.gets as number[][])[i][j]
        ) {
          bidGets[j]++;
        }
      }
    }
    for (let i = 0; i < bidGets.length; i++) {
      const player = players.find((player) => player.name === playerNames[i]);
      if (player) {
        player.bidGets += bidGets[i];
        player.rounds += game.rounds.length;
      }
    }
  }
  players.forEach((player) => {
    player.bidGetPercentage = player.bidGets / player.rounds;
  });

  res.status(200).send(players);
});

const server = app.listen(PORT, () => {
  console.log('Server is running on port 3000');
});

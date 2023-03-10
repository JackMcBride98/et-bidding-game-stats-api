import { PrismaClient } from '@prisma/client';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const PORT = process.env.PORT || 3000;

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

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

app.get('/game/:number/bid-aggression', async (req, res) => {
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
  )
    .filter((player) => player.gameCount > 0)
    .map((player) => ({
      name: player.name,
      games: player.gameCount,
      bidGets: 0,
      handsWon: 0,
      possibleHandsWon: 0,
      handsWonPercentage: 0,
      rounds: 0,
      bidGetPercentage: 0,
      bidAggression: 0,
      bonusRoundPoints: 0,
      bounusRounds: 0,
      heartRoundPoints: 0,
      heartRounds: 0,
      diamondRoundPoints: 0,
      diamondRounds: 0,
      spadeRoundPoints: 0,
      spadeRounds: 0,
      clubRoundPoints: 0,
      clubRounds: 0,
      pph: player.totalScore / player.totalHands,
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
    const handsWon = game.players.map((player) => 0);
    const bidAggression = game.players.map((player) => 0);
    const roundCounts = game.players.map((player) => ({
      bonus: 0,
      bonusPoints: 0,
      heart: 0,
      heartPoints: 0,
      diamond: 0,
      diamondPoints: 0,
      spade: 0,
      spadePoints: 0,
      club: 0,
      clubPoints: 0,
    }));

    for (let i = 0; i < game.rounds.length; i++) {
      for (let j = 0; j < game.players.length; j++) {
        if (
          (game.bids as number[][])[i][j] === (game.gets as number[][])[i][j]
        ) {
          bidGets[j]++;
        }
        handsWon[j] += (game.gets as number[][])[i][j];
        bidAggression[j] +=
          (game.bids as number[][])[i][j] / game.rounds[i].hands;

        // This is done as previously the suit was not saved as B for bonus rounds
        const isUpAndDownBonusRound =
          game.upAndDown && i === game.rounds.length / 2;

        if (game.rounds[i].suit === 'B' || isUpAndDownBonusRound) {
          roundCounts[j].bonusPoints += (game.scores as number[][])[i][j];
          roundCounts[j].bonus++;
        }
        if (game.rounds[i].suit === '♥' && !isUpAndDownBonusRound) {
          roundCounts[j].heartPoints += (game.scores as number[][])[i][j];
          roundCounts[j].heart++;
        }
        if (game.rounds[i].suit === '♦' && !isUpAndDownBonusRound) {
          roundCounts[j].diamondPoints += (game.scores as number[][])[i][j];
          roundCounts[j].diamond++;
        }
        if (game.rounds[i].suit === '♠' && !isUpAndDownBonusRound) {
          roundCounts[j].spadePoints += (game.scores as number[][])[i][j];
          roundCounts[j].spade++;
        }
        if (game.rounds[i].suit === '♣' && !isUpAndDownBonusRound) {
          roundCounts[j].clubPoints += (game.scores as number[][])[i][j];
          roundCounts[j].club++;
        }
      }
    }
    const totalHands = game.rounds.reduce((prev, curr) => prev + curr.hands, 0);
    for (let i = 0; i < bidGets.length; i++) {
      const player = players.find((player) => player.name === playerNames[i]);
      if (player) {
        player.bidGets += bidGets[i];
        player.bidAggression += bidAggression[i];
        player.rounds += game.rounds.length;
        player.bonusRoundPoints += roundCounts[i].bonusPoints;
        player.bounusRounds += roundCounts[i].bonus;
        player.heartRoundPoints += roundCounts[i].heartPoints;
        player.heartRounds += roundCounts[i].heart;
        player.diamondRoundPoints += roundCounts[i].diamondPoints;
        player.diamondRounds += roundCounts[i].diamond;
        player.spadeRoundPoints += roundCounts[i].spadePoints;
        player.spadeRounds += roundCounts[i].spade;
        player.clubRoundPoints += roundCounts[i].clubPoints;
        player.clubRounds += roundCounts[i].club;
        player.handsWon += handsWon[i];
        player.possibleHandsWon += totalHands;
      }
    }
  }
  players.forEach((player) => {
    player.bidGetPercentage = player.bidGets / player.rounds;
    player.bidAggression = player.bidAggression / player.rounds;
    player.handsWonPercentage = player.handsWon / player.possibleHandsWon;
  });

  res.status(200).send({ players });
});

const server = app.listen(PORT, () => {
  console.log('Server is running on port 3000');
});

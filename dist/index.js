"use strict";
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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json('hello');
}));
app.get('/players', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const players = yield prisma.players.findMany();
    res.json(players);
}));
app.get('/game/:number/bid-get-percentage', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { number } = req.params;
    const game = yield prisma.games.findFirst({
        where: { number: parseInt(number) },
        include: { players2: true },
    });
    if (!game) {
        return res.status(404).send('Game not found');
    }
    const bidGets = game.players.map((player) => 0);
    for (let i = 0; i < game.rounds.length; i++) {
        for (let j = 0; j < game.players.length; j++) {
            if (game.bids[i][j] === game.gets[i][j]) {
                bidGets[j]++;
            }
        }
    }
    const bidGetsPercentages = bidGets.map((bidGet) => bidGet / game.rounds.length);
    return res.status(200).send(bidGetsPercentages);
}));
const server = app.listen(PORT, () => {
    console.log('Server is running on port 3000');
});

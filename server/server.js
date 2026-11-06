const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const GRID_SIZE = 20;
const FOOD_TYPES = ['🌮', '🌶️', '🌽', '🥑', '🫔'];

let rooms = {};

function generateFood() {
  return {
    x: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
    y: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
    type: FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)]
  };
}

// Función helper para enviar Top 10 a todos
async function broadcastTop10() {
  const top10 = await db.getTop10();
  io.emit('updateTop10', top10);
}

app.get('/api/top10', async (req, res) => {
  const scores = await db.getTop10();
  res.json(scores);
});

io.on('connection', async (socket) => {
  // Enviar el Top 10 actual en cuanto un jugador se conecta
  const currentTop10 = await db.getTop10();
  socket.emit('updateTop10', currentTop10);

  socket.on('joinRoom', ({ roomCode, name, color }) => {
    const code = (roomCode || 'MEXA').toUpperCase();
    socket.join(code);
    socket.roomCode = code;

    if (!rooms[code]) {
      rooms[code] = {
        players: {},
        food: generateFood()
      };
    }

    rooms[code].players[socket.id] = {
      id: socket.id,
      name: name || 'Ajolote',
      color: color || '#FF007F',
      body: [{ x: 5, y: 5 }, { x: 4, y: 5 }],
      direction: { x: 1, y: 0 },
      score: 0
    };

    io.to(code).emit('updateState', rooms[code]);
  });

  socket.on('changeDirection', (dir) => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const player = rooms[code].players[socket.id];
    if (!player) return;

    if (dir.x !== -player.direction.x || dir.y !== -player.direction.y) {
      player.direction = dir;
    }
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      delete rooms[code].players[socket.id];
      io.to(code).emit('updateState', rooms[code]);
    }
  });
});

setInterval(async () => {
  for (let code in rooms) {
    let room = rooms[code];
    let players = room.players;

    for (let id in players) {
      let p = players[id];
      let head = {
        x: p.body[0].x + p.direction.x,
        y: p.body[0].y + p.direction.y
      };

      // Colisión con paredes
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        if (p.score > 0) {
          await db.saveScore(p.name, p.score);
          await broadcastTop10(); // Actualizar a todos en vivo al morir
        }
        delete players[id];
        io.to(id).emit('gameOver');
        continue;
      }

      p.body.unshift(head);

      if (head.x === room.food.x && head.y === room.food.y) {
        p.score += 10;
        room.food = generateFood();
      } else {
        p.body.pop();
      }
    }

    io.to(code).emit('updateState', room);
  }
}, 250);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));
const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 20;
const TILE_SIZE = canvas.width / GRID_SIZE;

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('room')) {
  document.getElementById('roomCode').value = urlParams.get('room').toUpperCase();
}

function startGame() {
  const name = document.getElementById('playerName').value || 'Ajolote';
  const roomCode = (document.getElementById('roomCode').value || 'MEXA').toUpperCase();
  const color = document.getElementById('colorPicker').value;

  document.getElementById('displayRoom').innerText = roomCode;
  document.getElementById('login').style.display = 'none';
  document.getElementById('gameArea').style.display = 'flex';

  socket.emit('joinRoom', { roomCode, name, color });
}

function copyInviteLink() {
  const roomCode = document.getElementById('displayRoom').innerText;
  const inviteUrl = `${window.location.origin}?room=${roomCode}`;
  navigator.clipboard.writeText(inviteUrl);
  alert(`¡Link de la sala "${roomCode}" copiado!\n\nComparte este link: ${inviteUrl}`);
}

window.addEventListener('keydown', (e) => {
  const keyMap = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
  };
  if (keyMap[e.key]) socket.emit('changeDirection', keyMap[e.key]);
});

// Evento que actualiza el Top 10 en tiempo real al finalizar partidas
socket.on('updateTop10', (scores) => {
  const list = document.getElementById('top10List');
  if (!scores || scores.length === 0) {
    list.innerHTML = `<li style="color: #776b94;">Sin puntajes aún</li>`;
    return;
  }
  list.innerHTML = scores.map(item => `<li><b>${item.player_name || item.name}</b>: ${item.score} pts</li>`).join('');
});

// Evento que renderiza el canvas y muestra los ajolotes en tiempo real
socket.on('updateState', ({ players, food }) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Dibujar comida
  ctx.font = '16px serif';
  ctx.fillText(food.type, food.x * TILE_SIZE + 2, food.y * TILE_SIZE + 16);

  // 2. Dibujar Ajolotes
  for (let id in players) {
    let p = players[id];
    
    p.body.forEach((seg, index) => {
      const x = seg.x * TILE_SIZE;
      const y = seg.y * TILE_SIZE;

      if (index === 0) {
        // Cabeza
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 6);
        ctx.fill();

        // Branquias rosas
        ctx.fillStyle = '#FF1493';
        ctx.fillRect(x - 2, y + 3, 3, 4);
        ctx.fillRect(x - 2, y + 13, 3, 4);
        ctx.fillRect(x + TILE_SIZE - 1, y + 3, 3, 4);
        ctx.fillRect(x + TILE_SIZE - 1, y + 13, 3, 4);

        // Ojos
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + 5, y + 7, 2, 0, Math.PI * 2);
        ctx.arc(x + TILE_SIZE - 5, y + 7, 2, 0, Math.PI * 2);
        ctx.fill();

        // Sonrisa
        ctx.strokeStyle = '#8B0045';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + 11, 3, 0, Math.PI);
        ctx.stroke();
      } else {
        // Cuerpo
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
        ctx.fill();
      }
    });
  }
});

socket.on('gameOver', () => {
  alert('¡Tu ajolote chocó! Fin del juego.');
  location.reload();
});

// Función para enviar la dirección desde los botones táctiles
function sendDir(x, y) {
  socket.emit('changeDirection', { x, y });
}

// Control táctil deslizando el dedo sobre el Canvas (Swipes)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, false);

canvas.addEventListener('touchend', (e) => {
  let touchEndX = e.changedTouches[0].clientX;
  let touchEndY = e.changedTouches[0].clientY;
  
  let dx = touchEndX - touchStartX;
  let dy = touchEndY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) > 20) sendDir(dx > 0 ? 1 : -1, 0);
  } else {
    if (Math.abs(dy) > 20) sendDir(0, dy > 0 ? 1 : -1);
  }
}, false);
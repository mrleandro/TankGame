const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public")); // servirá os arquivos do jogo

let players = {};

io.on("connection", (socket) => {
  console.log("Novo jogador conectado:", socket.id);

  // atribuir jogador 1 ou 2
  let playerNumber = Object.keys(players).length < 1 ? 1 : 2;
  players[socket.id] = {
    id: socket.id,
    num: playerNumber,
    x: playerNumber === 1 ? 150 : 600,
    y: 220,
    dir: "up",
    vida: 3,
  };

  // enviar info do jogador
  socket.emit("init", { id: socket.id, num: playerNumber });

  // enviar estado inicial a todos
  io.emit("updatePlayers", players);

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].dir = data.dir;
      io.emit("updatePlayers", players);
    }
  });

  socket.on("shoot", (tiro) => {
    // repassar tiro aos outros
    socket.broadcast.emit("shoot", { ...tiro, dono: players[socket.id].num });
  });

  socket.on("hit", (targetNum) => {
    // reduzir vida do jogador atingido
    for (const id in players) {
      if (players[id].num === targetNum) {
        players[id].vida -= 1;
        io.emit("updatePlayers", players);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Jogador saiu:", socket.id);
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

http.listen(3000, () =>
  console.log("Servidor rodando em http://localhost:3000")
);

const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const MAX_PLAYERS = 10;
const players = {};

function randomColor() {
  const cores = [
    "lime",
    "cyan",
    "yellow",
    "magenta",
    "orange",
    "white",
    "red",
    "blue",
    "green",
    "pink",
  ];
  return cores[Math.floor(Math.random() * cores.length)];
}

function randomPosition() {
  return {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 400) + 50,
  };
}

io.on("connection", (socket) => {
  socket.on("join", (clientId) => {
    // Se o jogador já existe, reconecta
    const existingPlayer = Object.values(players).find(
      (p) => p.clientId === clientId
    );

    if (existingPlayer) {
      // Substitui o socket antigo
      console.log("Reconectando jogador:", clientId);
      delete players[existingPlayer.id];
      existingPlayer.id = socket.id;
      players[socket.id] = existingPlayer;
    } else {
      // Verifica limite de jogadores
      if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit("full", "Servidor cheio! Máximo de 10 jogadores.");
        socket.disconnect();
        return;
      }

      // Cria novo jogador
      const pos = randomPosition();
      players[socket.id] = {
        id: socket.id,
        clientId,
        x: pos.x,
        y: pos.y,
        dir: "up",
        vida: 3,
        cor: randomColor(),
      };
      console.log("Novo jogador conectado:", clientId);
    }

    // Envia estado inicial
    socket.emit("init", { id: socket.id, players });
    io.emit("updatePlayers", players);
  });

  socket.on("move", (data) => {
    if (players[socket.id]) {
      Object.assign(players[socket.id], data);
      io.emit("updatePlayers", players);
    }
  });

  socket.on("shoot", (tiro) => {
    socket.broadcast.emit("shoot", { ...tiro, dono: socket.id });
  });

  socket.on("hit", (targetId) => {
    if (players[targetId]) {
      players[targetId].vida -= 1;
      if (players[targetId].vida <= 0) delete players[targetId];
      io.emit("updatePlayers", players);
    }
  });

  socket.on("disconnect", () => {
    setTimeout(() => {
      // Espera 2s para ver se foi um refresh rápido
      const stillExists = Object.values(players).find(
        (p) => p.id === socket.id
      );
      if (stillExists) {
        console.log("Removendo jogador:", socket.id);
        delete players[socket.id];
        io.emit("updatePlayers", players);
      }
    }, 2000);
  });
});

http.listen(3000, () =>
  console.log("Servidor rodando em http://localhost:3000")
);

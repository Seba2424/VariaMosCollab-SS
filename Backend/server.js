const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }));

const port = 4000;

io.on('connection', (socket) => {
  console.log('New client connected');

  // Evento para manejar la actualización de nodos
  socket.on('updateNode', (data) => {
    console.log('Node updated:', data);
    // Emitir el evento a todos los clientes, excepto al que lo envió
    socket.broadcast.emit('nodeUpdated', data);
  });

  // Evento para manejar la eliminación de nodos
  socket.on('deleteNode', (data) => {
    console.log('Node deleted:', data);
    // Emitir el evento a todos los clientes, excepto al que lo envió
    socket.broadcast.emit('nodeDeleted', data);
  });

  // Evento para manejar la creación de nodos
  socket.on('createNode', (data) => {
    console.log('Node created:', data);
    // Emitir el evento a todos los clientes, excepto al que lo envió
    socket.broadcast.emit('nodeCreated', data);
  });

  // Manejar la desconexión de un cliente
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => console.log(`Server listening on port ${port}`));

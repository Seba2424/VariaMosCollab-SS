const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('projectCreated', (project) => {
    console.log('Project Created:', project);
    socket.join(project.id); // Join the room with project ID
    io.to(project.id).emit('projectCreated', project);
  });

  socket.on('joinProject', (projectId) => {
    socket.join(projectId);
    console.log(`Joining project with ID: ${projectId}`);
    io.to(projectId).emit('joinProject', projectId);
  });

  socket.on('leaveProject', (projectId) => {
    socket.leave(projectId);
    console.log(`Leaving project with ID: ${projectId}`);
  });

  socket.on('updateProject', (updatedProject) => {
    console.log('Updating project:', updatedProject);
    io.to(updatedProject.id).emit('updateProject', updatedProject);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

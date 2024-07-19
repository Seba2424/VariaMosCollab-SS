const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(bodyParser.json());

let jsonData = {};  // Almacena temporalmente el archivo .json

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');  // Registro de nueva conexión
  socket.emit('initialData', jsonData);  // Envía el archivo .json inicial al nuevo cliente

  socket.on('update', (data) => {
    jsonData = deepMerge(jsonData, data);  // Actualiza el archivo .json en el servidor fusionando los datos
    console.log('JSON actualizado: ', JSON.stringify(jsonData, null, 2));  // Añadir esta línea para registrar los cambios
    socket.broadcast.emit('update', jsonData);  // Envía actualizaciones a otros clientes
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

app.post('/save', (req, res) => {
  // Endpoint para guardar el archivo .json en la base de datos o sistema de archivos
  jsonData = deepMerge(jsonData, req.body);
  console.log('JSON guardado: ', JSON.stringify(jsonData, null, 2));  // Añadir esta línea para registrar los cambios
  res.status(200).send('JSON data saved successfully');
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server is listening on port 3001');
});

// Función para fusionar profundamente dos objetos y arrays
function deepMerge(target, source) {
  const isObject = (obj) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = [...targetValue, ...sourceValue];  // Fusiona arrays en lugar de reemplazar
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = deepMerge(targetValue, sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
}

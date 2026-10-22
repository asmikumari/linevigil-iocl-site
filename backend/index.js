const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const { corsOrigins } = require('./lib/config');

const app = createApp();
const server = http.createServer(app);

// Socket.IO carries live alerts (new detections, patrol proximity) and chat messages.
const origins = corsOrigins();
const io = new Server(server, { cors: { origin: origins.length ? origins : '*', methods: ['GET', 'POST'] } });
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('send-message', (data) => {
    // Relay chat messages; ignore anything that is not a small plain object.
    if (!data || typeof data !== 'object' || JSON.stringify(data).length > 4000) return;
    socket.broadcast.emit('receive-message', data);
  });
});

// On Vercel the app is exported as a serverless handler; elsewhere start a normal server.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => console.log(`LineVigil API listening on port ${PORT}`));
}

module.exports = app;

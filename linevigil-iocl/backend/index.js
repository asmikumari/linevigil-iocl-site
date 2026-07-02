const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const excavationRoutes = require('./routes/excavations');
const pipelineRoutes = require('./routes/pipelines');
const patrolRoutes = require('./routes/patrol');
const imageryRoutes = require('./routes/imagery');
const cgdRoutes = require('./routes/cgd');

const app = express();
const PORT = process.env.PORT || 5000;

// Set up server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

app.use(cors());
app.use(express.json());

// Request logger middleware for telemetry diagnosis
app.use((req, res, next) => {
  console.log(`📥 [API REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Database connection check
const db = require('./db');
const checkDb = async () => {
  if (db.isMock()) {
    console.log('✅ Database connector initialized and healthy (IN-MEMORY MOCK MODE)');
  } else {
    try {
      const mongoDb = db.getDb();
      if (mongoDb) {
        await mongoDb.command({ ping: 1 });
        console.log('✅ MongoDB connector initialized and healthy');
      } else {
        console.log('📡 Database connection handshake in progress...');
      }
    } catch (err) {
      console.error('❌ Database connection check failed:', err.message);
    }
  }
};
checkDb();

// Socket.IO events
io.on('connection', (socket) => {
  console.log('📡 Cinematic GIS HUD Link Established:', socket.id);
  
  socket.on('send-message', (data) => {
    console.log('💬 Message telemetry transmission:', data);
    socket.broadcast.emit('receive-message', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Telemetry link disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/excavations', excavationRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/patrol', patrolRoutes);
app.use('/api/imagery', imageryRoutes);
app.use('/api/cgd', cgdRoutes);

app.get('/', (req, res) => {
  res.send('LineVigil Cinematic Command API is running');
});

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`📡 Command center server running on port ${PORT}`);
  });
}

module.exports = app;

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db, initDb } = require('./database.js');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-is-long-and-secure';
const SALT_ROUNDS = 10;

const clientURL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: clientURL }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientURL,
    methods: ["GET", "POST"]
  }
});

// --- API Endpoints ---

// Register a new user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    // Use RETURNING id to get the new user's ID from PostgreSQL
    const sql = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id';
    const { rows } = await db.query(sql, [username, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully.', userId: rows[0].id });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation error code
      return res.status(409).json({ message: 'Username already exists.' });
    }
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login a user
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const sql = 'SELECT * FROM users WHERE username = $1';
        const { rows } = await db.query(sql, [username]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful.', token, user: { id: user.id, username: user.username } });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Get all messages
app.get('/api/messages', async (req, res) => {
    try {
        const sql = 'SELECT * FROM messages ORDER BY timestamp ASC';
        const { rows } = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages.' });
    }
});


// --- Socket.IO Real-time Logic ---

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token not provided.'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token.'));
        }
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  socket.on('sendMessage', async (messageContent) => {
    const { user } = socket;
    // Use RETURNING * to get the full new message object back from PostgreSQL
    const sql = 'INSERT INTO messages (user_id, username, message) VALUES ($1, $2, $3) RETURNING *';
    const params = [user.id, user.username, messageContent];

    try {
        const { rows } = await db.query(sql, params);
        const newMessage = rows[0];
        io.emit('newMessage', newMessage); // Broadcast to all clients
    } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', 'Failed to send message.');
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
  });
});

const PORT = process.env.PORT || 3001;

// Initialize DB and start server
initDb().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
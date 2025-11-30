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
app.use(cors({ origin: clientURL })); // Restrict CORS to a specific client URL
app.use(express.json()); // Middleware to parse JSON bodies

// Initialize Database
initDb();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientURL, // Use the same client URL
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
    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(sql, [username, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        return res.status(500).json({ message: 'Error registering user.', error: err.message });
      }
      res.status(201).json({ message: 'User registered successfully.', userId: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login a user
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Server error during login.' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful.', token, user: { id: user.id, username: user.username } });
    });
});

// Get all messages
app.get('/api/messages', (req, res) => {
    const sql = 'SELECT * FROM messages ORDER BY timestamp ASC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching messages.' });
        }
        res.json(rows);
    });
});


// --- Socket.IO Real-time Logic ---

// Middleware to authenticate socket connections
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token not provided.'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token.'));
        }
        socket.user = decoded; // Attach user info to the socket object
        next();
    });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  // Handle incoming messages
  socket.on('sendMessage', (messageContent) => {
    const { user } = socket;
    const sql = 'INSERT INTO messages (user_id, username, message) VALUES (?, ?, ?)';
    const params = [user.id, user.username, messageContent];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving message:', err.message);
            // Optionally, send an error back to the client
            socket.emit('error', 'Failed to send message.');
            return;
        }
        
        const newMessage = {
            id: this.lastID,
            user_id: user.id,
            username: user.username,
            message: messageContent,
            timestamp: new Date().toISOString()
        };

        // Broadcast the new message to all clients
        io.emit('newMessage', newMessage);
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

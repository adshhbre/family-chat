require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initDb, dbRun, dbGet, dbAll } = require('./database.js');

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

// --- Middleware ---
// Middleware to authenticate JWT for API routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // if no token, unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // if token is no longer valid
    req.user = user;
    next();
  });
};


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
    const result = await dbRun(sql, [username, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully.', userId: result.lastID });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') { 
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
        const sql = 'SELECT * FROM users WHERE username = ?';
        const user = await dbGet(sql, [username]);

        if (!user) {
            return res.status(401).json({ message: '아이디 또는 비밀번호를 확인해주세요.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: '아이디 또는 비밀번호를 확인해주세요.' });
        }

        // Include avatar in the JWT payload
        const tokenPayload = { id: user.id, username: user.username, avatar: user.avatar };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
        
        // Return user object including avatar
        res.json({ message: 'Login successful.', token, user: { id: user.id, username: user.username, avatar: user.avatar } });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Get all messages
app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        const sql = 'SELECT * FROM messages ORDER BY timestamp ASC';
        const rows = await dbAll(sql);
        // DEBUG: Log the messages being sent to the client
        console.log(`[DEBUG] Fetched ${rows.length} messages for user ${req.user.username}.`);
        console.log(rows);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages.' });
    }
});

// Set user avatar
app.post('/api/user/avatar', authenticateToken, async (req, res) => {
    const { avatar } = req.body;
    const { id, username } = req.user; // Get user info from the decoded token

    if (!avatar) {
        return res.status(400).json({ message: 'Avatar is required.' });
    }

    try {
        const sql = 'UPDATE users SET avatar = ? WHERE id = ?';
        await dbRun(sql, [avatar, id]);

        // After updating, create a new token with the updated avatar info
        const tokenPayload = { id, username, avatar };
        const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

        // Send back a success message and the new token
        res.json({ message: 'Avatar updated successfully.', token: newToken });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ message: 'Server error updating avatar.' });
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
        socket.user = decoded; // Decoded token now includes avatar
        next();
    });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  socket.on('sendMessage', async (messageContent) => {
    const { user } = socket;
    // Include avatar when inserting a new message
    const insertSql = 'INSERT INTO messages (user_id, username, avatar, message) VALUES (?, ?, ?, ?)';
    const params = [user.id, user.username, user.avatar, messageContent];

    try {
        const result = await dbRun(insertSql, params);
        const selectSql = 'SELECT * FROM messages WHERE id = ?';
        const newMessage = await dbGet(selectSql, [result.lastID]);
        
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
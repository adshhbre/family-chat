const express = require('express');
const cors = require('cors');
const path = require('path');
const { kv } = require('@vercel/kv');

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// This static path is for local development. Vercel will handle serving the 'client' directory automatically.
// We add it here to ensure `vercel dev` works as expected.
app.use(express.static(path.join(__dirname, '../client')));

// --- API Endpoints ---

// Endpoint to handle form submission
app.post('/api/submit', async (req, res) => {
    try {
        const { name, mood, message, secretMessage } = req.body;
        const timestamp = new Date().toISOString();
        const ipAddress = req.ip;

        const newMessage = {
            TIMESTAMP: timestamp,
            NAME: name,
            MOOD: mood,
            MESSAGE: message,
            SECRET_MESSAGE: secretMessage,
            IP_ADDRESS: ipAddress,
        };

        // Get current messages, or initialize an empty array
        const messages = await kv.get('messages') || [];
        
        // Add new message
        messages.push(newMessage);
        
        // Save back to Vercel KV
        await kv.set('messages', messages);

        res.status(200).json({ message: 'Message saved' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error saving message' });
    }
});

// Endpoint to get all messages
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await kv.get('messages') || [];
        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error reading messages' });
    }
});

// Export the app for Vercel's serverless environment
module.exports = app;

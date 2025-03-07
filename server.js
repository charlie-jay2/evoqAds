require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());  // For parsing JSON request bodies

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
const dbName = "EvoVisionDB"; // Change this to your database name
const collectionName = "evoqAds";
const boardsCollectionName = "evoqBoards";  // New collection for board management

// Helper function to parse time strings (e.g., "1d", "2h")
const parseTime = (timeStr) => {
    const timeRegex = /^(\d+)([smhdwyt])$/;
    const match = timeStr.match(timeRegex);

    if (!match) return null;

    const number = parseInt(match[1], 10);
    const unit = match[2];

    let milliseconds = 0;

    switch (unit) {
        case 's':
            milliseconds = number * 1000; // Seconds
            break;
        case 'm':
            milliseconds = number * 60000; // Minutes
            break;
        case 'h':
            milliseconds = number * 3600000; // Hours
            break;
        case 'd':
            milliseconds = number * 86400000; // Days
            break;
        case 'w':
            milliseconds = number * 604800000; // Weeks
            break;
        case 'y':
            milliseconds = number * 31536000000; // Years
            break;
    }

    return milliseconds;
};

// POST route to add new board data on game start
app.post('/gameStart', async (req, res) => {
    const { gameID, userAds } = req.body;

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(boardsCollectionName);

        // Check if the board already exists
        const existingBoard = await collection.findOne({ gameID });

        if (existingBoard) {
            return res.status(400).json({ error: "Board already exists for this gameID" });
        }

        // Insert new board data into the evoqBoards collection
        const newBoard = {
            gameID,
            userAds,
            status: 'active', // Default to active when game starts
            visibility: true,
            createdAt: new Date(),
            suspended: false,
            blacklisted: false,
            suspensionEnd: null,
            blacklistEnd: null,
        };

        await collection.insertOne(newBoard);

        res.json({ message: "Game data added successfully!", board: newBoard });
    } catch (error) {
        console.error("Error adding game data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// GET route for EvoqAds (existing functionality)
app.get('/evoqAds', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const adData = await collection.findOne({ _id: "global" });
        if (!adData) return res.status(404).json({ error: "No EvoqAds found" });

        res.json({ ads: adData.ads });
    } catch (error) {
        console.error("Error fetching EvoqAds:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Suspend API (same as before, but now uses evoqBoards collection)
app.post('/suspend', async (req, res) => {
    const { gameID, time } = req.body;

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(boardsCollectionName);

        const board = await collection.findOne({ gameID });

        if (!board) return res.status(404).json({ error: 'Board not found' });

        let suspensionDuration = null;
        if (time) {
            suspensionDuration = parseTime(time);
        }

        if (suspensionDuration) {
            const suspensionEnd = Date.now() + suspensionDuration;
            await collection.updateOne(
                { gameID },
                { $set: { suspended: true, suspensionEnd } }
            );
            res.json({ message: `Board suspended for ${time}` });
        } else {
            await collection.updateOne(
                { gameID },
                { $set: { suspended: true, suspensionEnd: null } }
            );
            res.json({ message: 'Board suspended permanently' });
        }
    } catch (error) {
        console.error("Error suspending board:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Enable API (same as before, but now uses evoqBoards collection)
app.post('/enable', async (req, res) => {
    const { gameID } = req.body;

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(boardsCollectionName);

        const board = await collection.findOne({ gameID });

        if (!board) return res.status(404).json({ error: 'Board not found' });

        await collection.updateOne(
            { gameID },
            { $set: { status: 'active', visibility: true } }
        );

        res.json({ message: 'Board enabled and visible' });
    } catch (error) {
        console.error("Error enabling board:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Disable API (same as before, but now uses evoqBoards collection)
app.post('/disable', async (req, res) => {
    const { gameID } = req.body;

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(boardsCollectionName);

        const board = await collection.findOne({ gameID });

        if (!board) return res.status(404).json({ error: 'Board not found' });

        await collection.updateOne(
            { gameID },
            { $set: { status: 'disabled', visibility: false } }
        );

        res.json({ message: 'Board disabled and hidden' });
    } catch (error) {
        console.error("Error disabling board:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Blacklist API (same as suspend, now using evoqBoards collection)
app.post('/blacklist', async (req, res) => {
    const { gameID, time } = req.body;

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(boardsCollectionName);

        const board = await collection.findOne({ gameID });

        if (!board) return res.status(404).json({ error: 'Board not found' });

        let blacklistDuration = null;
        if (time) {
            blacklistDuration = parseTime(time);
        }

        if (blacklistDuration) {
            const blacklistEnd = Date.now() + blacklistDuration;
            await collection.updateOne(
                { gameID },
                { $set: { blacklisted: true, blacklistEnd } }
            );
            res.json({ message: `Board blacklisted for ${time}` });
        } else {
            await collection.updateOne(
                { gameID },
                { $set: { blacklisted: true, blacklistEnd: null } }
            );
            res.json({ message: 'Board blacklisted permanently' });
        }
    } catch (error) {
        console.error("Error blacklisting board:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ EvoqAds API running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Middleware to parse JSON requests

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
const dbName = "EvoVisionDB";
const adsCollection = "evoqAds";  // Collection for Evoq ads
const whitelistCollection = "evoqWhitelist"; // Collection for whitelisted users

// Serve static files
app.use(express.static(__dirname));

// Route: Serve Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route: Fetch EvoqAds
app.get('/evoqAds', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(adsCollection);

        const adData = await collection.findOne({ _id: "global" });
        if (!adData) return res.status(404).json({ error: "No EvoqAds found" });

        res.json({ ads: adData.ads });
    } catch (error) {
        console.error("Error fetching EvoqAds:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Function to convert duration strings (e.g., "1h", "2d") into milliseconds
function parseDuration(duration) {
    const timeUnits = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, y: 31536000000 };
    const match = duration.match(/^(\d+)([smhdwy])$/);
    return match ? parseInt(match[1]) * timeUnits[match[2]] : null;
}

// Route: Fetch Whitelist Status
app.get('/whitelist/:userID', async (req, res) => {
    const userID = Number(req.params.userID); // Convert to number

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(whitelistCollection);

        // Check if the user exists in the whitelist
        const user = await collection.findOne({ userID });

        if (!user) {
            return res.json({ whitelisted: false, enabled: false });
        }

        const currentTime = Date.now();

        // Check if suspension or blacklist has expired
        if (user.suspended && user.suspendedDuration && currentTime >= user.suspendedDuration) {
            await collection.updateOne({ userID }, { $set: { suspended: false, suspendedDuration: null } });
            user.suspended = false;
            user.suspendedDuration = null;
        }

        if (user.blacklisted && user.blacklistedDuration && currentTime >= user.blacklistedDuration) {
            await collection.updateOne({ userID }, { $set: { blacklisted: false, blacklistedDuration: null } });
            user.blacklisted = false;
            user.blacklistedDuration = null;
        }

        res.json({
            whitelisted: true,
            enabled: user.enabled ?? true,
            suspended: user.suspended ?? false,
            suspendedDuration: user.suspendedDuration,
            blacklisted: user.blacklisted ?? false,
            blacklistedDuration: user.blacklistedDuration
        });
    } catch (error) {
        console.error("Error checking whitelist:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route: Add/Update Whitelist Entry
app.post('/whitelist', async (req, res) => {
    const { userID, suspended, suspendedDuration, blacklisted, blacklistedDuration, enabled } = req.body;

    if (!userID || typeof userID !== 'number') {
        return res.status(400).json({ error: "Invalid or missing userID (must be a number)" });
    }

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(whitelistCollection);

        // Convert duration to timestamp if provided
        const currentTime = Date.now();
        const suspendUntil = suspendedDuration ? currentTime + parseDuration(suspendedDuration) : null;
        const blacklistUntil = blacklistedDuration ? currentTime + parseDuration(blacklistedDuration) : null;

        // Update or insert user whitelist data
        await collection.updateOne(
            { userID },
            {
                $set: {
                    userID,
                    suspended: suspended ?? false,
                    suspendedDuration: suspendUntil,
                    blacklisted: blacklisted ?? false,
                    blacklistedDuration: blacklistUntil,
                    enabled: enabled ?? true
                }
            },
            { upsert: true } // Create new entry if not found
        );

        res.json({ message: `User ${userID} has been updated in the whitelist.` });
    } catch (error) {
        console.error("Error updating whitelist:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route: Serve Video File
app.get('/evovision.mp4', (req, res) => {
    res.sendFile(path.join(__dirname, 'evovision.mp4'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ EvoqAds API running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());

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

// Route: Fetch Whitelist Status
app.get('/whitelist/:userID', async (req, res) => {
    const userID = Number(req.params.userID); // Convert to number

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(whitelistCollection);

        // Check if the user is whitelisted
        const user = await collection.findOne({ userID });

        if (user) {
            res.json({ whitelisted: true });
        } else {
            res.json({ whitelisted: false });
        }
    } catch (error) {
        console.error("Error checking whitelist:", error);
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

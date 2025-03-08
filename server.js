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
const dbName = "EvoVisionDB"; // Change this to your database name
const collectionName = "evoqAds";

// Serve static files
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

// Serve video file
app.get('/evovision.mp4', (req, res) => {
    res.sendFile(path.join(__dirname, 'evovision.mp4'));
});

// Import and use the whitelist API
const evoqWhitelist = require('evoqWhitelist.js');
app.use('/whitelist', evoqWhitelist);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ EvoqAds API running on port ${PORT}`);
});

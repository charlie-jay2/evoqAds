require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
app.use(cors());

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
const dbName = "EvoVisionDB"; // Change this to your database name
const collectionName = "evoqAds";

// Serve static files from the current directory
app.use(express.static(__dirname));

// Route to get EvoqAds data
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

// Route to serve the video file
app.get('/evovision.mp4', (req, res) => {
    const videoPath = path.join(__dirname, 'evovision.mp4');
    res.sendFile(videoPath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ EvoqAds API running on port ${PORT}`);
});

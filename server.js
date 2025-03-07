require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json()); // To parse JSON bodies for POST requests

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
const dbName = "EvoVisionDB"; // Database name
const adsCollectionName = "evoqAds"; // Collection for EvoqAds
const whitelistCollectionName = "evoqWhitelist"; // New collection for whitelisted users

// Route to get EvoqAds data
app.get('/evoqAds', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(adsCollectionName);

        const adData = await collection.findOne({ _id: "global" });
        if (!adData) return res.status(404).json({ error: "No EvoqAds found" });

        res.json({ ads: adData.ads });
    } catch (error) {
        console.error("Error fetching EvoqAds:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to get all whitelisted users
app.get('/evoqWhitelist', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(whitelistCollectionName);

        const whitelist = await collection.find({}).toArray(); // Fetch all users in the whitelist
        if (whitelist.length === 0) return res.status(404).json({ error: "No whitelisted users found" });

        res.json({ users: whitelist });
    } catch (error) {
        console.error("Error fetching whitelist data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to add a user to the whitelist
app.post('/evoqWhitelist', async (req, res) => {
    const { userId } = req.body; // Expecting userId to be passed in the request body

    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(whitelistCollectionName);

        // Check if the user is already whitelisted
        const existingUser = await collection.findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ error: "User already whitelisted" });
        }

        // Add user to whitelist
        await collection.insertOne({ userId });
        res.status(201).json({ message: "User added to whitelist" });
    } catch (error) {
        console.error("Error adding user to whitelist:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ EvoqAds API running on port ${PORT}`);
});

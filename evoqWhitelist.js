require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const router = express.Router();
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
const dbName = "EvoVisionDB"; // Change this to match your database name
const collectionName = "evoqWhitelist";

// Route to check if a user is whitelisted
router.get('/:userID', async (req, res) => {
    const { userID } = req.params;

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const user = await collection.findOne({ userID: Number(userID) });

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

module.exports = router;

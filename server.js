require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
const dbName = "EvoVisionDB"; // Change this to your database name
const evoqAdsCollection = "evoqAds";
const evoqBoardCollection = "evoqBoard";

app.get('/evoqAds', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);

        // Fetch evoqAds data
        const evoqAdsData = await db.collection(evoqAdsCollection).findOne({ _id: "global" });
        const ads = evoqAdsData ? evoqAdsData.ads : [];

        // Send the ads data in the response
        res.json({ ads: ads });
    } catch (error) {
        console.error("Error fetching evoqAds:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/evoqBoard/:gameID', async (req, res) => {
    const { gameID } = req.params;
    try {
        await client.connect();
        const db = client.db(dbName);

        // Fetch or create evoqBoard data
        let boardData = await db.collection(evoqBoardCollection).findOne({ gameID: gameID });
        if (!boardData) {
            boardData = {
                gameID: gameID,
                userAds: [],
                enabled: true,
                visibility: true,
                createdAt: new Date(),
                suspended: false,
                blacklisted: false,
                suspensionEnd: null,
                blacklistEnd: null
            };
            await db.collection(evoqBoardCollection).insertOne(boardData); // Insert new schema
        }

        // Send the board data in the response
        res.json(boardData);
    } catch (error) {
        console.error("Error fetching evoqBoard data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ EvoqAds API running on port ${PORT}`);
});

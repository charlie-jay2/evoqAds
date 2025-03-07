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

// Fetches EvoqAds to check if they are still present
async function fetchEvoqAds() {
    try {
        await client.connect();
        const db = client.db(dbName);
        const evoqAdsData = await db.collection(evoqAdsCollection).findOne({ _id: "global" });
        return evoqAdsData ? evoqAdsData.ads : [];
    } catch (error) {
        console.error("Error fetching EvoqAds:", error);
        return [];
    }
}

app.get('/evoqBoard/:gameID', async (req, res) => {
    const { gameID } = req.params;
    try {
        await client.connect();
        const db = client.db(dbName);

        // Fetch the EvoqAds to check if they are still present
        const evoqAds = await fetchEvoqAds();
        const evoqAdsPresent = evoqAds.length > 0;

        // Count the number of EvoVision models (assuming they are stored in a collection or a structure)
        // For the sake of this example, I'll set it to a fixed number as we don't have actual game data here.
        const evoVisionsCount = 3; // Example count, replace with actual count logic

        // Check if board data already exists for this game
        let boardData = await db.collection(evoqBoardCollection).findOne({ gameID: gameID });
        if (!boardData) {
            // If no existing data, create a new entry
            boardData = {
                gameID: gameID,
                userAds: [],
                enabled: true,
                suspended: false,
                blacklisted: false,
                evoqAdsPresent: evoqAdsPresent,
                evoVisionsCount: evoVisionsCount,
                createdAt: new Date(),
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

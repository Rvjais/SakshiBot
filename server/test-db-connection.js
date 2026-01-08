require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

console.log("Testing MongoDB Connection...");
console.log("MONGO_URI is defined:", !!MONGO_URI);

if (!MONGO_URI) {
    console.error("MONGO_URI is missing in .env file");
    process.exit(1);
}

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("Successfully connected to MongoDB!");
        process.exit(0);
    })
    .catch(err => {
        console.error("Connection failed:", err);
        process.exit(1);
    });

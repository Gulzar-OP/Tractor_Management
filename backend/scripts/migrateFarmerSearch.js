
import dotenv from "dotenv";
import mongoose from "mongoose";

import Farmer from "../models/farmer.model.js";

import {
  generateFarmerSearchFields,
} from "../utils/searchTransliteration.js";

dotenv.config();

/* =========================================================
   MIGRATE EXISTING FARMERS
========================================================= */

const migrateFarmerSearch = async () => {
  try {
    // Connect MongoDB
    const MONGO_URI =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI;

    if (!MONGO_URI) {
      throw new Error("MongoDB connection string not found in .env");
    }

    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected successfully");

    let processed = 0;
    let updated = 0;

    const BATCH_SIZE = 500;
    let operations = [];

    // Fetch existing farmers
    const cursor = Farmer.find({})
      .select("_id name village district")
      .lean()
      .cursor();

    for await (const farmer of cursor) {
      const searchFields = generateFarmerSearchFields({
        name: farmer.name,
        village: farmer.village,
        district: farmer.district,
      });

      operations.push({
        updateOne: {
          filter: {
            _id: farmer._id,
          },
          update: {
            $set: searchFields,
          },
        },
      });

      processed++;

      // Execute bulk update after every 500 records
      if (operations.length >= BATCH_SIZE) {
        const result = await Farmer.bulkWrite(operations);

        updated += result.modifiedCount;

        console.log(
          `Processed: ${processed} | Updated: ${updated}`
        );

        operations = [];
      }
    }

    // Update remaining records
    if (operations.length > 0) {
      const result = await Farmer.bulkWrite(operations);

      updated += result.modifiedCount;
    }

    console.log("\n================================");
    console.log("FARMER SEARCH MIGRATION COMPLETED");
    console.log("================================");
    console.log("Total processed:", processed);
    console.log("Total updated:", updated);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
};

migrateFarmerSearch();

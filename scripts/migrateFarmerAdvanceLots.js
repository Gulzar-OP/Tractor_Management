
import "dotenv/config";
import mongoose from "mongoose";

import Farmer from "../models/farmer.model.js";
import FarmerAdvanceLot from "../models/farmerAdvanceLot.model.js";
import FarmerAdvanceLedger from "../models/farmerAdvanceLedger.model.js";

const OPENING_MARKER = "OPENING_BALANCE_MIGRATION_V1";

const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const nearlyEqual = (a, b) =>
  Math.abs(round2(a) - round2(b)) <= 0.01;

const stats = {
  total: 0,
  migrated: 0,
  alreadyCovered: 0,
  skipped: 0,
  mismatched: 0,
  failed: 0,
  openingAmountCreated: 0,
};

async function migrateFarmer(farmerId) {
  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      const farmer = await Farmer.findById(farmerId)
        .session(session);

      if (!farmer) {
        throw new Error("Farmer not found.");
      }

      if (!farmer.owner) {
        result = {
          type: "MISMATCH",
          reason: "Farmer has no owner.",
        };
        return;
      }

      const balance = round2(
        farmer.advanceAmount || 0
      );

      if (!Number.isFinite(balance) || balance < 0) {
        result = {
          type: "MISMATCH",
          reason: `Invalid farmer advance balance: ${balance}`,
        };
        return;
      }

      // Find all active lots for this farmer.
      const activeLots = await FarmerAdvanceLot.find({
        owner: farmer.owner,
        farmerID: farmer._id,
        status: "ACTIVE",
      }).session(session);

      const activeLotBalance = round2(
        activeLots.reduce(
          (sum, lot) =>
            sum + Number(lot.remainingAmount || 0),
          0
        )
      );

      // Check whether opening migration was already performed.
      const existingOpeningLot =
        await FarmerAdvanceLot.findOne({
          owner: farmer.owner,
          farmerID: farmer._id,
          sourceType: "OPENING",
          description: OPENING_MARKER,
        }).session(session);

      // Existing lot balance cannot exceed farmer balance.
      if (activeLotBalance > balance + 0.01) {
        result = {
          type: "MISMATCH",
          reason: `Active lots ₹${activeLotBalance} exceed farmer balance ₹${balance}.`,
        };
        return;
      }

      // Existing opening lot means migration was attempted before.
      // Never create another opening lot automatically.
      if (existingOpeningLot) {
        if (nearlyEqual(activeLotBalance, balance)) {
          result = {
            type: "ALREADY_COVERED",
            balance,
            activeLotBalance,
          };
        } else {
          result = {
            type: "MISMATCH",
            reason:
              `Opening lot already exists, but active lot balance ₹${activeLotBalance} does not match farmer balance ₹${balance}.`,
          };
        }

        return;
      }

      // No opening lot needed if existing payment lots
      // already account for the complete balance.
      if (nearlyEqual(activeLotBalance, balance)) {
        result = {
          type: "ALREADY_COVERED",
          balance,
          activeLotBalance,
        };
        return;
      }

      const openingAmount = round2(
        balance - activeLotBalance
      );

      if (openingAmount <= 0) {
        result = {
          type: "MISMATCH",
          reason: "Calculated opening amount is invalid.",
        };
        return;
      }

      // Create opening lot for only the missing balance.
      await FarmerAdvanceLot.create(
        [
          {
            owner: farmer.owner,
            farmerID: farmer._id,
            sourceType: "OPENING",
            paymentId: null,
            originalAmount: openingAmount,
            remainingAmount: openingAmount,
            status: "ACTIVE",
            description: OPENING_MARKER,
          },
        ],
        { session }
      );

      // Record opening balance in advance ledger.
      await FarmerAdvanceLedger.create(
        [
          {
            owner: farmer.owner,
            farmerID: farmer._id,
            type: "CREDIT",
            amount: openingAmount,
            balanceAfter: balance,
            paymentId: null,
            workId: null,
            description:
              "Opening advance balance migrated from existing farmer record.",
            referenceId:
              `OPENING-MIGRATION-${farmer._id}`,
          },
        ],
        { session }
      );

      result = {
        type: "MIGRATED",
        previousBalance: balance,
        existingLots: activeLotBalance,
        openingAmount,
        finalBalance: round2(
          activeLotBalance + openingAmount
        ),
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("\nStarting farmer advance migration...\n");

  const cursor = Farmer.find({})
    .select("_id")
    .lean()
    .cursor();

  for await (const farmer of cursor) {
    stats.total++;

    try {
      const result = await migrateFarmer(farmer._id);

      if (!result) {
        stats.skipped++;
        continue;
      }

      switch (result.type) {
        case "MIGRATED":
          stats.migrated++;
          stats.openingAmountCreated = round2(
            stats.openingAmountCreated +
            result.openingAmount
          );

          console.log(
            `✅ Migrated ${farmer._id}: Opening ₹${result.openingAmount}`
          );
          break;

        case "ALREADY_COVERED":
          stats.alreadyCovered++;
          console.log(
            `ℹ️ Already covered ${farmer._id}: ₹${result.balance}`
          );
          break;

        case "MISMATCH":
          stats.mismatched++;
          console.error(
            `⚠️ Mismatch ${farmer._id}: ${result.reason}`
          );
          break;

        default:
          stats.skipped++;
      }
    } catch (error) {
      stats.failed++;

      console.error(
        `❌ Failed ${farmer._id}:`,
        error.message
      );
    }
  }

  console.log("\n========== MIGRATION REPORT ==========");
  console.table(stats);
  console.log("======================================\n");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

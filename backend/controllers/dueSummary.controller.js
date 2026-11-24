
import mongoose from "mongoose";
import { scopeFilter } from "./work.controller.js";
import WorkLog from "../models/work.model.js";

export const dueSummary = async (req, res) => {
  try {
    // 1. Get user scope
    const filter = scopeFilter(req);

    // 2. Convert string IDs into ObjectIds
    const aggregateFilter = { ...filter };

    if (aggregateFilter.owner) {
      aggregateFilter.owner = new mongoose.Types.ObjectId(
        aggregateFilter.owner
      );
    }

    if (aggregateFilter.createdBy) {
      aggregateFilter.createdBy = new mongoose.Types.ObjectId(
        aggregateFilter.createdBy
      );
    }

    // 3. Aggregate farmer-wise work summary
    const farmers = await WorkLog.aggregate([
      {
        $match: aggregateFilter,
      },

      {
        $group: {
          _id: "$farmer",

          totalBilledAmount: {
            $sum: { $ifNull: ["$totalAmount", 0] },
          },

          totalPaidAmount: {
            $sum: { $ifNull: ["$paidAmount", 0] },
          },

          totalDueAmount: {
            $sum: { $ifNull: ["$dueAmount", 0] },
          },

          totalWorks: {
            $sum: 1,
          },
        },
      },

      // 4. Lookup farmer details
      {
        $lookup: {
          from: "farmers",
          localField: "_id",
          foreignField: "_id",
          as: "farmer",
        },
      },

      // 5. Preserve records even if farmer is missing
      {
        $unwind: {
          path: "$farmer",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 6. Select response fields
      {
        $project: {
          _id: 0,

          farmerId: "$_id",

          name: {
            $ifNull: ["$farmer.name", "Unknown Farmer"],
          },

          phone: {
            $ifNull: ["$farmer.phone", ""],
          },

          village: {
            $ifNull: ["$farmer.village", ""],
          },

          totalBilledAmount: 1,
          totalPaidAmount: 1,
          totalDueAmount: 1,
          totalWorks: 1,
        },
      },

      // 7. Highest due first
      {
        $sort: {
          totalDueAmount: -1,
        },
      },
    ]);

    // 8. Calculate overall summary
    const totalBilled = farmers.reduce(
      (sum, farmer) =>
        sum + Number(farmer.totalBilledAmount || 0),
      0
    );

    const totalCollected = farmers.reduce(
      (sum, farmer) =>
        sum + Number(farmer.totalPaidAmount || 0),
      0
    );

    const totalOutstanding = farmers.reduce(
      (sum, farmer) =>
        sum + Number(farmer.totalDueAmount || 0),
      0
    );

    const totalWorks = farmers.reduce(
      (sum, farmer) =>
        sum + Number(farmer.totalWorks || 0),
      0
    );

    const farmersWithDue = farmers.filter(
      (farmer) => farmer.totalDueAmount > 0
    );

    const fullyClearedFarmers = farmers.filter(
      (farmer) => farmer.totalDueAmount <= 0
    );

    // 9. Send response
    return res.status(200).json({
      success: true,

      summary: {
        totalBilled,
        totalCollected,
        totalOutstanding,

        farmersWithDue: farmersWithDue.length,
        fullyClearedFarmers: fullyClearedFarmers.length,

        totalFarmers: farmers.length,
        totalWorks,
      },

      farmers,
    });
  } catch (error) {
    console.error("Due summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch due summary",
      error: error.message,
    });
  }
};

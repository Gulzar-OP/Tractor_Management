import Work from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";
import { scopeFilter} from "./work.controller.js" ;

export const dueSummary = async (req, res) => {
  try {
    const filter = scopeFilter(req);

    const farmers = await Work.aggregate([
      {
        $match: filter,
      },

      // Group work records farmer-wise
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

      // Get farmer details
      {
        $lookup: {
          from: "farmers",
          localField: "_id",
          foreignField: "_id",
          as: "farmer",
        },
      },

      {
        $unwind: {
          path: "$farmer",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Select required fields
      {
        $project: {
          _id: 0,

          farmerId: "$_id",

          name: {
            $ifNull: ["$farmer.name", "Unknown"],
          },

          phone: "$farmer.phone",

          village: "$farmer.village",

          totalBilledAmount: 1,
          totalPaidAmount: 1,
          totalDueAmount: 1,
          totalWorks: 1,
        },
      },

      // Highest due first
      {
        $sort: {
          totalDueAmount: -1,
        },
      },
    ]);

    const totalBilled = farmers.reduce(
      (sum, farmer) => sum + farmer.totalBilledAmount,
      0
    );

    const totalCollected = farmers.reduce(
      (sum, farmer) => sum + farmer.totalPaidAmount,
      0
    );

    const totalOutstanding = farmers.reduce(
      (sum, farmer) => sum + farmer.totalDueAmount,
      0
    );

    const farmersWithDue = farmers.filter(
      (farmer) => farmer.totalDueAmount > 0
    );

    const fullyClearedFarmers = farmers.filter(
      (farmer) => farmer.totalDueAmount <= 0
    );

    return res.status(200).json({
      success: true,

      summary: {
        totalBilled,
        totalCollected,
        totalOutstanding,

        farmersWithDue: farmersWithDue.length,
        fullyClearedFarmers: fullyClearedFarmers.length,
        totalFarmers: farmers.length,
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
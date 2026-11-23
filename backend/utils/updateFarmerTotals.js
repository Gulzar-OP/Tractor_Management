import Work from "../models/work.model.js";
import Farmer from "../models/farmer.model.js";

export const updateFarmerTotals = async (farmerId) => {
  const totals = await Work.aggregate([
    {
      $match: {
        farmer: farmerId,
      },
    },
    {
      $group: {
        _id: "$farmer",

        totalBilledAmount: {
          $sum: "$totalAmount",
        },

        totalPaidAmount: {
          $sum: "$paidAmount",
        },

        totalDueAmount: {
          $sum: "$dueAmount",
        },
      },
    },
  ]);

  const result = totals[0] || {
    totalBilledAmount: 0,
    totalPaidAmount: 0,
    totalDueAmount: 0,
  };

  await Farmer.findByIdAndUpdate(
    farmerId,
    {
      $set: {
        totalBilledAmount: result.totalBilledAmount,
        totalPaidAmount: result.totalPaidAmount,
        totalDueAmount: result.totalDueAmount,
      },
    },
    {
      new: true,
    }
  );

  return result;
};
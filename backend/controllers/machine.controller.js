import Machine from "../models/machine.model.js";

export const saveMachines = async (req, res) => {
  try {
    const { machines } = req.body;

    // VALIDATION
    if (!machines || !Array.isArray(machines)) {
      return res.status(400).json({
        success: false,
        message: "Machines required",
      });
    }

    // CLEAN DATA
    const cleanedMachines = machines.map((item) => ({
      name: item.name.trim().toUpperCase(),
      rate: Number(item.rate),
    }));

    // SAVE TO DATABASE
    const savedMachines = await Machine.insertMany(cleanedMachines);

    res.status(200).json({
      success: true,
      message: "Machines saved",
      machines: savedMachines,
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
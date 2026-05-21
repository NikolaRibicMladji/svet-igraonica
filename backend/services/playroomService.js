const Playroom = require("../models/Playroom");
const PLAYROOM_STATUS = require("../constants/playroomStatus");
const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");
const logger = require("../utils/logger");
const {
  generateTimeSlotsForPlayroom,
  syncTimeSlotsWithWorkingHours,
} = require("../utils/generateTimeSlots");

const createPlayroomWithSlots = async (playroomData) => {
  const playroom = await Playroom.create(playroomData);

  try {
    const slotResult = await generateTimeSlotsForPlayroom(playroom._id);

    return {
      playroom,
      slotResult,
      slotError: null,
    };
  } catch (error) {
    logger.error("Greška pri generisanju termina nakon kreiranja igraonice:", {
      message: error.message,
    });

    return {
      playroom,
      slotResult: null,
      slotError: error.message,
    };
  }
};

const verifyPlayroomAndGenerateSlots = async (playroomId) => {
  if (!mongoose.isValidObjectId(playroomId)) {
    throw new ErrorResponse("ID igraonice nije validan", 400);
  }

  const playroom = await Playroom.findById(playroomId);

  if (!playroom) {
    throw new ErrorResponse("Igraonica nije pronađena", 404);
  }

  if (playroom.verifikovan && playroom.status === PLAYROOM_STATUS.AKTIVAN) {
    return {
      playroom,
      slotResult: {
        createdCount: 0,
        existingCount: 0,
        skippedDays: 0,
      },
    };
  }

  playroom.verifikovan = true;
  playroom.status = PLAYROOM_STATUS.AKTIVAN;
  await playroom.save();

  const slotResult = await generateTimeSlotsForPlayroom(playroom._id, 30);

  return {
    playroom,
    slotResult,
  };
};

const regenerateSlotsForPlayroom = async (playroomId) => {
  if (!mongoose.isValidObjectId(playroomId)) {
    throw new ErrorResponse("ID igraonice nije validan", 400);
  }

  const playroom = await Playroom.findById(playroomId);

  if (!playroom) {
    throw new ErrorResponse("Igraonica nije pronađena", 404);
  }

  const result = await syncTimeSlotsWithWorkingHours(playroom._id);

  if (!result.success) {
    throw new ErrorResponse(
      result.message || "Greška pri sinhronizaciji termina",
      400,
    );
  }

  return result;
};

module.exports = {
  createPlayroomWithSlots,
  verifyPlayroomAndGenerateSlots,
  regenerateSlotsForPlayroom,
};

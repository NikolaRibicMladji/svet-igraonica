const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const logger = require("./logger");

const uploadFileToCloudinary = ({
  filePath,
  folder,
  resourceType = "image",
  transformation = [],
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!filePath) {
        return reject(new Error("Putanja fajla je obavezna"));
      }

      await fs.promises.access(filePath, fs.constants.R_OK);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          transformation,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          if (!result?.secure_url || !result?.public_id) {
            return reject(
              new Error("Cloudinary upload nije vratio validan rezultat"),
            );
          }

          return resolve(result);
        },
      );

      const readStream = fs.createReadStream(filePath);

      readStream.on("error", (error) => {
        uploadStream.destroy(error);
        reject(error);
      });

      uploadStream.on("error", (error) => {
        reject(error);
      });

      readStream.pipe(uploadStream);
    } catch (error) {
      reject(error);
    }
  });
};

const safeRemoveFile = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.error("Greška pri brisanju temp fajla:", {
        message: error.message,
      });
    }
  }
};

module.exports = {
  uploadFileToCloudinary,
  safeRemoveFile,
};

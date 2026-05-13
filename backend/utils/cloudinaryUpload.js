const fs = require("fs");
const cloudinary = require("../config/cloudinary");

const uploadFileToCloudinary = ({
  filePath,
  folder,
  resourceType,
  transformation,
}) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary ENV varijable nisu podešene.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        folder,
        resource_type: resourceType,
        transformation,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    const readStream = fs.createReadStream(filePath);

    readStream.on("error", (err) => {
      uploadStream.destroy(err);
      reject(err);
    });

    readStream.pipe(uploadStream);
  });
};

const safeRemoveFile = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Greška pri brisanju temp fajla:", err.message);
    }
  }
};

module.exports = {
  uploadFileToCloudinary,
  safeRemoveFile,
};

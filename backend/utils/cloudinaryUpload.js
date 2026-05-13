const fs = require("fs");
const cloudinary = require("../config/cloudinary");
console.log("CLOUDINARY RUNTIME CONFIG", {
  cloud_name: cloudinary.config().cloud_name,
  has_api_key: Boolean(cloudinary.config().api_key),
  api_key_start: cloudinary.config().api_key
    ? String(cloudinary.config().api_key).slice(0, 4)
    : null,
});

const uploadFileToCloudinary = ({
  filePath,
  folder,
  resourceType,
  transformation,
}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
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

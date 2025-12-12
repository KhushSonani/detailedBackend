import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
    });
    //file has been uploaded succesfully
    console.log("file is uploaded on cloudinary !", response.url);
    return response;
  } catch (err) {
    fs.unlinkSync(localfilepath); // remove the locally saved temp file as the operation got failed
    return null;
  }
};

export { uploadToCloudinary };

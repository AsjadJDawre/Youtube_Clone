import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDNARY_API_KEY,
    api_secret: process.env.CLOUDNARY_API_SECRET
});
console.log("Cloud Name:", process.env.CLOUD_NAME);
console.log("API Key:", process.env.CLOUDNARY_API_KEY);
console.log("API Secret:", process.env.CLOUDNARY_API_SECRET);


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // Log the uploaded file's URL
        // console.log("File uploaded to Cloudinary:", response.url);

        fs.unlinkSync(localFilePath)
        // Return the response which contains the URL and other details
        return response;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);

        // Remove the local file since the upload failed
        fs.unlinkSync(localFilePath);

        // Return null to indicate failure
        return null;
    }
};

export { uploadOnCloudinary };

import {v2 as cloudinary} from "cloudinary";
import fs from "fs"
cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key: process.env.CLOUDNARY_API_KEY,
    api_secret:process.env.CLOUDNARY_API_SECRET
})

const uploadOnCloudinary=async (localFilePath)=>{

    try {
        if(!localFilePath)return null ;
        // upload the file on cloudinary 
       const response = await  cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // file has been uploaded Successfully 
        console.log("file is uploaded on Cloudinary : ",response.url);
        return response;
        
    } catch (error) {
        // to Unlink file from Server OR  remove the locally saved temp file as the upload operation got failed!
         fs.unlinkSync(localFilePath)
         return null
        
    }

}


cloudinary.v2.uploader.upload("xyx",{public_id:"img"},(err,result)=>{console.log(result);;
})
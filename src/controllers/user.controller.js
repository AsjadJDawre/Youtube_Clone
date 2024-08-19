import {asyncHandler}from "../utils/ayncHandler.js"
import {ApiError} from"../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens= async (userId) =>{
    try {
        const user =await User.findById(userId)
        const RefreshToken=user.generateRefreshToken()
        const AccessToken=user.generateAccessToken()
        user.refreshToken=RefreshToken

     await user.save({valdidateBeforeSave:false})
return {AccessToken,RefreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while Generating Tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullname, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password "
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

// login user 
// 1.read data from body 2.sanitization of inputs 3. check if user for that email exists or not if yes then compare entererd password with decryptes DB password if match then create access and refresh token . send cookies response =login else throw error 

const loginUser =asyncHandler(async (req,res)=>{
    const {username,email,password}=req.body;
    console.log(email);

    if (!username && !email){
        throw new ApiError(400,"Username or Email is required")
    }
const user=await User.findOne({
    $or:[{username},{email}]
})

console.log(user);
if(!user){
    throw new ApiError(404,"User Does not Exists!")
}


const isPassValid = await user.isPasswordCorrect(password)
if(!isPassValid){
    throw new ApiError(401,"Invalid User Credentials!")
}

  const {AccessToken,RefreshToken}=await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user.id).select("-password -refreshToken")

  const options={
    httpOnly:true,
    secure:true
  }

  return res.status(200)
  .cookie("accessToken",AccessToken,options)
  .cookie("refreshToken",RefreshToken,options)
  .json(
    new ApiResponse(
        200, 
        {
            user: loggedInUser, AccessToken, RefreshToken
        },
        "User logged In Successfully"
    )
  )

})

const logOutuser =asyncHandler(async(req,res)=>{
   await  User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1 // this remove the field from document 
            }

        },{
            new:true
        }
     )
     const options={
        httpOnly:true,
        secure:true
     }
     return res.status(200).clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out SuccessFully"))
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorised request ")
    }

 try {
      const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
      const user = await User.findById(decodedToken?._id)
      if(!user){
       throw new ApiError(401,"Invalid refresh Token")
   
      }
   
   if(incomingRefreshToken!==user?.refreshToken){
       throw new ApiError(401,"refresh token is Expired or used")
       
   }
   
   const options={
       httpOnly:true,
       secure:true
   }
   
   const {AccessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
   return res.status(200)
   .cookie("accessToken",AccessToken,options)
   .cookie("refreshToken",newRefreshToken,options)
   .json(
       new ApiResponse(200,{
           accessToken:AccessToken,refreshToken:newRefreshToken,
           
       },"Access Token Refreshed")
       
   )
   
 } catch (error) {
    throw new ApiError(404,error?.message||"Invalid refresh TOken")
 }

})


const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;
    if(!(oldPassword || newPassword)){
        throw new ApiError(401,"Old Password and new Password is required")
    }

    const userId =req.user?._id;
    const user = await User.findById(userId);
    const isPassCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPassCorrect){
        throw new ApiError(400,"Invalid password")
    }

    user.password= newPassword;
    await user.save({valdidateBeforeSave:false})
    return res.status(200)
    .json(new ApiResponse(200,"password Changed SuccessFully "))
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"Current user Fetched Successfully"))
})

const updateAccountDetails =asyncHandler(async (req,res)=>{
    const {fullname,email}=req.body;
    console.log(fullname,email)
    if(!fullname || !email){
        throw new ApiError(400,"all fields are required ")
    }

   const user= User.findByIdAndUpdate(req.user?._id,{
    $set:{
        fullname,
        email
    }
   },{new:true}).select("-password")
return res.status(200)
.json(new ApiResponse(200,user,"Account details updated Successfully!"))

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
     const avatarLocalPath=req.file?.path
     if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Missing")
     }
     const avatar =await uploadOnCloudinary(avatarLocalPath)
     if(!avatar.url){
        throw new ApiError(400,"Error While Uploading Avatar")
     }

   const user=  await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar:avatar.url
        }
     },{new:true}).select("-password")

 
return res.status(200)
.json(new ApiResponse(200,user,"Avatar Image Updated Successfully!"))
})

const updateCoverImage =asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage is Missing !")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"error While Uploading CoverImage!")
    }

  const user =await  User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage:coverImage.url
        }
    },{
        new:true
    }).select("-password")


    //Todo : delete old Image after successfully adding new one create a utility for this 

return res.status(200)
.json(new ApiResponse(200,user,"Cover Image Updated Successfully!"))
})


const getUserChannelProfile = asyncHandler(async(req,res)=>{
const {username}=req.params

if(!username?.trim()){
throw new ApiError(400,"Username Is missing ")
}

const channel=await User.aggregate([{
    $match:{
        username:username?.toLowerCase()
    }
},
{
    $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"

    }
},
{
    $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"


    }
},
{
    $addFields:{
        subscriberCount:{
            $size:"$subscribers"
        },
        channelsSubscribedToCount:{
$size:"$subscribedTo"
        },
      isSubscribed:  {
$cond:{
    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
    then:true,
    else:false
}
        }
    }
},
{
    $project:{
        fullname:1,
        username:1,
        email:1,
        subscriberCount:1,
        channelsSubscribedToCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,


    }
}])

console.log(channel,typeof(channel));

if(!channel?.length){
    throw new ApiError(404,"channel does not Exists!")
}

return res.status(200)
.json(new ApiResponse(200,channel[0],"user channel fetched SuccessFully"))


})

const getWatchHistory= asyncHandler(async(req,res)=>{
    const user = User.aggregate([{
        $match:{
            _id: new mongoose.Types.ObjectId(req.user._id)
        },
        
    },

    {
        $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[

                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[{
                            $project:{
                                fullname:1,
                                username:1,
                                avatar:1
                            }
                        }]
                    }
                },
                {
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }
            ]
        }
    }



])

return res.status(200)
.json(new ApiResponse(200,user[0].watchHistory,"Watch History Fetechd SuccessFully !"))

})


export  {registerUser ,loginUser,logOutuser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateCoverImage,getUserChannelProfile,getWatchHistory}
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, "Token generation failed");
    // console.error("generateAccessAndRefreshToken error:", err);

    // // rethrow ApiError unchanged
    // if (err instanceof ApiError) throw err;

    // // convert other errors into ApiError, preserving message for debugging
    // throw new ApiError(500, err.message || "Token generation failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // S1
  const { fullname, email, username, password } = req.body;
  // console.log(fullname);

  //S2
  // if(fullname === "" || email === "" || username === "" || password === ""){
  //   throw new ApiError(400,"All fields are required");
  // }

  if (
    [fullname, email, username, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //S3
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists with this email or username");
  }
  console.log(req.files);

  //S4
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  //S5

  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = await uploadToCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //S6
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //S7
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //S8
  if (!createdUser) {
    throw new ApiError(500, "User registration failed");
  }
  //S9
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookies

  const { email, username, password } = req.body;
  if ((!email && !username) || !password) {
    throw new ApiError(400, "Username or email and password are required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token - user not found");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used !");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (err) {
    throw new ApiError(401, err?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
   
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if(!isPasswordCorrect){
    throw new ApiError(400,"Old password is incorrect");
  }  
  user.password = newPassword;
  await user.save({validateBeforeSave:false});

  return res.status(200)
  .json(new ApiResponse(200,{}, "Password changed successfully"));

})

const getCurrentUser = asyncHandler(async (req,res) => {
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullname, email} = req.body;
  
  if(!fullname || !email){{
    throw new ApiError(400,"Fullname and email are required");
  }}

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullname : fullname,
        email : email,
      }
    },
    {new : true}
  ).select("-password")

  return res.status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"));

}) 

const updateUserAvatar = asyncHandler(async (req,res) =>{
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required");
  }

  const avatar = await uploadToCloudinary(avatarLocalPath);
  if(!avatar.url){
    throw new ApiError(500,"Error while uploading avatar"); 
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar : avatar.url,
      }
    },
    {new : true}
  ).select("-password")
  //TODO : delete old avatar image

  return res.status(200)
  .json(new ApiResponse(200, user, "Avatar updated successfully"));

})

const updateUserCoverImage = asyncHandler(async (req,res) =>{
  const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
    throw new ApiError(400,"Cover image file is required");
  }

  const coverImage = await uploadToCloudinary(coverImageLocalPath);
  if(!coverImage.url){
    throw new ApiError(500,"Error while uploading cover image"); 
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage : coverImage.url,
      }
    },
    {new : true}
  ).select("-password")

  //TODO : delete old cover image
  return res
  .status(200)
  .json(new ApiResponse(200, user, "Cover image updated successfully"));
})

const getUserChannelProfile = asyncHandler(async (req,res) => {
  const {username} = req.body;
  if(!username?.trim()){
    throw new ApiError(400,"User is missing !")
  }

  const channel = await User.aggregate([
    {
      $match:{
        username: username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField:"channel",
        as: "subscribers"
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField:"subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields:{
        subscribersCount: {
          $size: "$subscribres"
        },
        channelsSubsribredToCount:{
          $size: "$subscribedTo"
        },
        isSubscribed:{
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false,
          }
        }
      }
    },
    {
      $project: {
        fullname:1,
        username:1,
        subscribersCount:1,
        channelsSubsribredToCount:1,
        isSubscribed:1,
        avatar:1,
        coverImage:1,
        email:1,
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404,"channel does not exists !")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"User Channel fetched successfully !"))

})

const getWatchHistory = asyncHandler(async (req,res) => {
  const user = await User.aggregate([
    {
      $match:{
        _id : new mongoose.Types.ObjectId(req.user._id)
      },
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
              pipeline:[
                {
                  $project:{
                    fullname:1,
                    username:1,
                    avatar:1,
                  }
                }
              ]
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

  return res.status(200).json(new ApiResponse(200,user[0].WatchHistory,"watch history fetched successfully"))

})


export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};

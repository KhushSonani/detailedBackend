import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"; 
import {User} from "../models/user.model.js"; 
import { uploadToCloudinary } from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  
  // S1
  const {fullname,email,username,password} = req.body;
  // console.log(fullname);

  //S2
  // if(fullname === "" || email === "" || username === "" || password === ""){
  //   throw new ApiError(400,"All fields are required"); 
  // }

  if(
    [fullname,email,username,password].some((field)=>field.trim() === "")
  ){
    throw new ApiError(400,"All fields are required");
  }


  //S3
  const existedUser = User.findOne({
    $or: [{ email }, { username }],
  })

  if(existedUser){
    throw new ApiError(409,"User already exists with this email or username"); 
  }
  //S4
  const avatarLocalPath = req.files?.avatar[0]?.path
  const coverImageLocalPath = req.files?.coverImage[0]?.path

  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar image is required"); 
  }
  //S5

  const avatar = await uploadToCloudinary(avatarLocalPath)
  const coverImage = await uploadToCloudinary(coverImageLocalPath)
  if(!avatar){
    throw new ApiError(400,"Avatar file is required");
  }

  //S6
  const user = await User.create({
    fullname,
    avatar:avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  })

  //S7
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  //S8
  if(!createdUser){
    throw new ApiError(500,"User registration failed");
  }
  //S9
  return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered successfully")
  )

});

export { registerUser };

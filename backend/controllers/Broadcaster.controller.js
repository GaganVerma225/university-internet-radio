import { asyncHandler } from "../helpers/asyncHandler.js";
import { ApiError } from "../helpers/ApiError.js";
import { Broadcaster } from "../models/Broadcaster.model.js";
import { ApiResponse } from "../helpers/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (BroadcasterId) => {
  try {
    const broadcaster = await Broadcaster.findById(BroadcasterId);
    const accessToken = await broadcaster.generateAccessToken();
    const refreshToken = await broadcaster.generateRefreshToken();
    broadcaster.refreshToken = refreshToken;
    await broadcaster.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

const registerBroadcaster = asyncHandler(async (req, res) => {
  // get Broadcaster details from frontend
  const { name, email, hashed_password } = req.body;

  // validation - not empty
  if (
    [email, name, hashed_password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  // check if Broadcaster already exists: username, email
  const existedBroadcaster = await Broadcaster.findOne({
    email
  });

  if (existedBroadcaster) {
    throw new ApiError(409, "Broadcaster with email already exists");
  }

  // create Broadcaster object - create entry in db
  const broadcaster = await Broadcaster.create({
    name,
    hashed_password,
    email
  });

  // remove password and refresh token field from response
  const createdBroadcaster = await Broadcaster.findById(broadcaster._id).select(
    "-hashed_password -refreshToken2 "
  );

  // check for Broadcaster creation
  if (!createdBroadcaster) {
    throw new ApiError(
      500,
      "Something went wrong while registering the Broadcaster"
    );
  }

  // return res
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        createdBroadcaster,
        "Broadcaster registered successfully"
      )
    );
});

const loginBroadcaster = asyncHandler(async (req, res) => {
  // Steps -:

  // get data from req.body
  const { email, hashed_password } = req.body;

  // username or email
  if (!email) {
    throw new ApiError(400, "email is required");
  }

  // find the Broadcaster
  const broadcaster = await Broadcaster.findOne({ email });

  if (!broadcaster) {
    throw new ApiError(404, "Broadcaster does not exist");
  }

  // password check

  const isPasswordValid = await broadcaster.isPasswordCorrect(hashed_password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password is incorrect");
  }

  // access and refresh token generate
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    broadcaster._id
  );

  // send cookies
  const loggedInBroadcaster = await Broadcaster.findById(broadcaster._id).select(
    "-password -refreshToken2"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          loggedInBroadcaster,
          accessToken,
          refreshToken,
        },
        "Broadcaster logged In Successfully"
      )
    );
});

const logoutBroadcaster = asyncHandler(async (req, res) => {
  await Broadcaster.findByIdAndUpdate(
    req.broadcaster._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "Broadcaster logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const broadcaster = await Broadcaster.findById(decodedToken?._id);

    if (!broadcaster) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== broadcaster?.refreshToken) {
      next();
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      broadcaster._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid access token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const broadcaster = await Broadcaster.findById(req.broadcaster?._id);

  const isPasswordCorrect = await broadcaster.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(404, "incorrect old password");
  }

  broadcaster.hashed_password = newPassword;
  broadcaster.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password is changed successfully"));
});

const getCurrentBroadcaster = asyncHandler(async (req, res) => {
  const broadcaster = req.broadcaster;
  return res
    .status(200)
    .json(
      new ApiResponse(200, broadcaster, "Current Broadcaster fetched successfully")
    );
});

const getBroadcaster = asyncHandler(async (req, res) => {
  const { BroadcasterId } = req.body;

  if (!BroadcasterId) {
    return res.status(400).json({
      message: "Broadcaster ID is required.",
    });
  }

  try {
    const broadcaster = await Broadcaster.findById(BroadcasterId);

    if (!broadcaster) {
      return res.status(404).json({
        message: "Broadcaster not found.",
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, broadcaster, "Broadcaster fetched successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "Server error. Could not fetch Broadcaster.")
      );
  }
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, "All fields are required");
  }
  
  const broadcaster = await Broadcaster.findByIdAndUpdate(
    req.broadcaster?._id,
    {
      $set: {
        name,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, broadcaster, "Account details is updated successfully")
    );
});

const deleteBroadcaster = asyncHandler(async (req, res) => {
  const BroadcasterId = req.broadcaster?._id;

  if (!BroadcasterId) {
    throw new ApiError(400, "Broadcaster not found");
  }

  const broadcaster = await Broadcaster.findByIdAndDelete(BroadcasterId);

  if (!broadcaster) {
    throw new ApiError(404, "Broadcaster not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Broadcaster deleted successfully"));
});

const getAllBroadcasters = asyncHandler(async (req, res) => {
  try {
    const broadcaster = await Broadcaster.find({});
    return res
      .status(200)
      .json(
        new ApiResponse(200, broadcaster, "All Broadcaster fetched successfully")
      );
  } catch (err) {
    console.error("Error fetching Broadcasters:", err);
  }
});

export {
  registerBroadcaster,
  loginBroadcaster,
  logoutBroadcaster,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentBroadcaster,
  updateAccountDetails,
  deleteBroadcaster,
  getAllBroadcasters,
  getBroadcaster,
};

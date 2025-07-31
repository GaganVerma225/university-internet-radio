import { Broadcaster } from "../models/Broadcaster.model.js";
import { ApiError } from "../helpers/ApiError.js";
import { asyncHandler } from "../helpers/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const broadcaster = await Broadcaster.findById(decodedToken?._id).select(
      "-password -refreshToken -publicHash"
    );

    if (!broadcaster) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.broadcaster = broadcaster;

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

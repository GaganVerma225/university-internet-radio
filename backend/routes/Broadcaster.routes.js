import { Router } from "express";
import {
  changeCurrentPassword,
  deleteBroadcaster,
  getAllBroadcasters,
  getBroadcaster,
  getCurrentBroadcaster,
  loginBroadcaster,
  logoutBroadcaster,
  refreshAccessToken,
  registerBroadcaster,
  updateAccountDetails,
} from "../controllers/Broadcaster.controller.js";
import { verifyJWT } from "../middlewares/Broadcaster.auth.middleware.js";

const router = Router();

router.route("/register").post(registerBroadcaster);

router.route("/login").post(loginBroadcaster);

router.route("/logout").post(verifyJWT, logoutBroadcaster);

router
  .route("/refresh-token")
  .post(refreshAccessToken, verifyJWT, logoutBroadcaster);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/current-Broadcaster").get(verifyJWT, getCurrentBroadcaster);

router.route("/get-Broadcaster").post(getBroadcaster);

router.route("/all-Broadcasters").get(getAllBroadcasters);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router.delete("/delete", verifyJWT, deleteBroadcaster);

export default router;
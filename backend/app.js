import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = ["https://gc632dbx-5173.inc1.devtunnels.ms", "http://localhost:5173", "http://192.168.248.18:5173", "*"];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow credentials
  })
);

// app.use(cors())

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes import
import broadcasterRouter from "./routes/Broadcaster.routes.js";

// Routes declaration
app.use("/api/v1/broadcaster", broadcasterRouter);

export { app };

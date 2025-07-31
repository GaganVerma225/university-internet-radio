import { Schema , model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const broadcasterSchema = new Schema(
    {
        name: {
            type: String,
            trim: true,
            required: "Name is required"
        },

        email: {
            type: String,
            trim: true,
            unique: true,
            match:  [/.+\@.+\..+/, 'Please fill a valid email address'],
            required: "Email is required",
        },

        hashed_password: {
            type: String,
            required: "Password is required"
        },

        refreshToken: String,

    }, { timestamps: true }
);

broadcasterSchema.pre("save", async function (next) {
    if (this.isModified("hashed_password"))
        this.hashed_password = await bcrypt.hash(this.hashed_password, 10);
    next();
});

broadcasterSchema.methods.isPasswordCorrect = async function (hashed_password) {
    return await bcrypt.compare(hashed_password, this.hashed_password);
};

broadcasterSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

broadcasterSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const Broadcaster = model("Broadcaster", broadcasterSchema);

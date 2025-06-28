import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        if(!accessToken) {
            throw new ApiError(401, "Unauthorised Access No Token")
        }
        
        let decodedToken
        try {
            decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
        } catch (jwtError) {
            if (jwtError.name === 'JsonWebTokenError') {
                throw new ApiError(401, "Invalid token")
            } else if (jwtError.name === 'TokenExpiredError') {
                throw new ApiError(401, "Token expired")
            } else {
                throw new ApiError(401, "Invalid Access Token")
            }
        }
        
        if(!decodedToken) {
            throw new ApiError(401, "Unauthorised Access Invalid Token")
        }
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
        
        if (!user) {
            throw new ApiError(401, "User not found")
        }
    
        req.user = user
        next()
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        } else {
            throw new ApiError(401, "Invalid Access Token")
        }
    }
})

export { verifyJWT }
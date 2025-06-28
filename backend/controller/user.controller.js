import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import { io } from '../index.js'; // Import io for socket events (use require to avoid circular import issues)
import crypto from "crypto";

const registerUser = asyncHandler(async(req, res) => {
    const { username, email, fullName, password, userType = "user", phone } = req.body

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if( 
        [username, email, fullName, password].some((field) => (
        field?.trim() === "" || !field))
    ) {
        throw new ApiError(400, `username, email, fullName, password all are required`)
    }

    // Validate userType
    if (!["user", "mechanic"].includes(userType)) {
        throw new ApiError(400, "userType must be either 'user' or 'mechanic'")
    }

    // Validate mechanic-specific fields
    if (userType === "mechanic") {
        if (!phone || phone.trim() === "") {
            throw new ApiError(400, "phone is required for mechanics")
        }
    }
    
    const existingUser = await User.findOne({
        $or: [ {username}, {email} ]
    })
    
    if(existingUser) {
        throw new ApiError(409, "User with same email or username already exists")
    }
    
    let coverImage = "", avatar = ""
    if(avatarLocalPath) {
        avatar = await uploadOnCloudinary(avatarLocalPath)
    }
    if(coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    }

    const userData = {
        username,
        email,
        fullName,
        userType,
        avatar: avatar?.url || "http://localhost:8000/images/default_avatar.jpg",
        coverImage: coverImage?.url || "http://localhost:8000/images/default_coverImage.jpg",
        password
    }

    // Add mechanic-specific fields if userType is mechanic
    if (userType === "mechanic") {
        userData.phone = phone;
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour
    userData.emailVerificationToken = emailVerificationToken;
    userData.emailVerificationTokenExpiry = emailVerificationTokenExpiry;
    userData.emailVerified = false;

    const user = await User.create(userData)

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Internal error while registering new user")
    }

    // Send verification email
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;
    
    try {
        await sendEmail({
            email: email,
            subject: "Verify your RoadResQ account",
            message: `Hi ${fullName},\n\nThank you for registering. Please verify your email by clicking the link below:\n\n${verifyUrl}\n\nThis link will expire in 1 hour.\n\nBest regards,\nRoadResQ Team`
        });
        
        // Return success response when email is sent successfully
        return res.status(200).json(
            new ApiResponse(200, { 
                email,
                verificationUrl: verifyUrl,
                message: "Registration successful! Please check your email to verify your account."
            }, `Registration successful! Please check your email to verify your account.`)
        );
    } catch (error) {
        // If email sending fails, return the verification URL for development
        console.log('Email sending failed, returning verification URL for development:', error.message);
        return res.status(200).json(
            new ApiResponse(200, { 
                email,
                verificationUrl: verifyUrl,
                message: "Registration successful! Email verification URL (for development):"
            }, `Registration successful! Please check your email to verify your account.`)
        );
    }
})

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
    
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")        
    }
}

const secureCookieWithExpiry = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
}

const loginUser = asyncHandler(async(req, res) => {
    const { email, username, password } = req.body
    
    if(!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    if(!password) {
        throw new ApiError(400, "password field cannot be empty")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "user does not exists")
    }

    const isValidPassword = await user.isPasswordCorrect(password)
    if(!isValidPassword) {
        throw new ApiError(400, "Incorrect Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    return res
    .status(200)
    .cookie("accessToken", accessToken, secureCookieWithExpiry)
    .cookie("refreshToken", refreshToken, secureCookieWithExpiry)
    .json(
        new ApiResponse(
            200,
            loggedInUser,
            "user logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const secureCookie = {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
    }

    return res
    .status(200)
    .clearCookie("accessToken", secureCookie)
    .clearCookie("refreshToken", secureCookie)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.headers["x-refresh-token"]
        if(!incomingRefreshToken)
            throw new ApiError(400, "Refresh Token Not Found")
    
        const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedRefreshToken._id)
        if(!user)
            throw new ApiError(400, "Invalid refresh token")
    
        if(user?.refreshToken !== incomingRefreshToken)
            throw new ApiError(400, "Refresh token expired")
    
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken", accessToken, secureCookieWithExpiry)
        .cookie("refreshToken", refreshToken, secureCookieWithExpiry)
        .json(
            new ApiResponse(
                200, 
                {
                    accessToken: accessToken,
                    refreshToken: refreshToken
                },
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid refresh Token")
    }
})

const changePassword = asyncHandler(async(req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
        throw new ApiError(400, "Invalid Old Password")

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password Updated Successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req, res) => {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Current User Sent"
        )
    )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const { fullName, email } = req.body

    const user = await User.findById(req.user?._id).select("-password")

    if(!user) {
        throw new ApiError(400, "Unable to fetch User")
    }

    if(fullName) {
        user.fullName = fullName
    }
    if(email) {
        user.email = email
    }

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath)
        throw new ApiError(404, "Avatar File Not Found")

    const newAvatar = await uploadOnCloudinary(avatarLocalPath)
    if(!newAvatar)
        throw new ApiError(500, "Internal Error while uploading avatar on Cloudinary")

    const user = await User.findById(req.user?._id)
    if(!user)
        throw new ApiError(400, "Invalid User Id")

    if(user.avatar)
        await deleteFromCloudinary(user.avatar)

    user.avatar = newAvatar.url
    await user.save({validateBeforeSave: false})

    const userObject = user.toObject()
    delete userObject.password

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            userObject,
            "Avatar Updated Successfully"
        )
    )
})

const updateCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req?.file?.path
    if(!coverImageLocalPath)
        throw new ApiError(404, "Cover Image File Not Found")

    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!newCoverImage)
        throw new ApiError(500, "Internal Error while uploading Cover Image on Cloudinary")

    const user = await User.findById(req.user._id)
    if(!user)
        throw new ApiError(400, "Invalid User Id")

    if(user.coverImage)
        await deleteFromCloudinary(user.coverImage)

    user.coverImage = newCoverImage.url
    await user.save({validateBeforeSave: false})

    const userObject = user.toObject()
    delete userObject.password

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            userObject,
            "Cover Image Updated Successfully"
        )
    )
})

const updateLocation = asyncHandler(async(req, res) => {
    const { location } = req.body

    if(!location || !Array.isArray(location) || location.length !== 2)
        throw new ApiError(400, "location field is required")

    const user = await User.findById(req.user._id).select("-password")
    if(!user)
        throw new ApiError(500, "Unable to fetch User Id")

    user.location = { type: "Point", coordinates: location }
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Location updated successfully"
        )
    )
})

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body

    const user = await User.findOne({ email })
    if (!user) {
        throw new ApiError(404, "User with this email does not exist")
    }

    const resetToken = jwt.sign(
        { 
            email: user.email
        }, 
        process.env.RESET_PASSWORD_SECRET, 
        { 
            expiresIn: process.env.RESET_PASSWORD_EXPIRY
        }
    )
    
    // For frontend reset page
    const resetURL = `${req.protocol}://${req.get("host")}/reset-password?token=${resetToken}`

    const message = `Forgot your password? Click here to generate a new password: ${resetURL}\nIf you didn't request a password reset, please ignore this email.`;

    try {
        const emailStatus = await sendEmail({
            email: user.email,
            subject: "Password Reset",
            message: message
        });
        
        if(!emailStatus) {
            throw new ApiError(500, "Internal error while sending email")
        }
        
        return res
        .status(200)
        .json(
            new ApiResponse(200, emailStatus, "Token sent to email")
        );
    } catch (error) {
        console.error("Email sending error:", error);
        
        // For development: if email is not configured, return the reset URL directly
        if (error.message && (error.message.includes('not properly configured') || error.message.includes('auth'))) {
            console.log("Email not configured - returning reset URL for development");
            return res
            .status(200)
            .json(
                new ApiResponse(200, 
                    { 
                        resetURL: resetURL,
                        message: "Email service not configured. Use this URL to reset your password:",
                        development: true
                    }, 
                    "Reset URL generated (email service not configured)"
                )
            );
        } else {
            throw new ApiError(500, "Failed to send email: " + error.message)
        }
    }
})

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const { password } = req.body;

    // Validate token
    if (!token) {
        throw new ApiError(400, "Reset token is required");
    }

    // Validate password
    if (!password || password.length < 6) {
        throw new ApiError(400, "Password is required and must be at least 6 characters long");
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    } catch (error) {
        console.error("Token verification error:", error);
        throw new ApiError(401, "Token is invalid or has expired");
    }

    const user = await User.findOne({ 
        email: decoded.email 
    });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.password = password;
    await user.save();

    return res.status(200).json(new ApiResponse(200, {}, "Password has been reset successfully. You can now log in with your new password."));
})

const getUserProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);

    const userProfile = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "creator",
                as: "followers"
            }
        },
        {
            $lookup: {
                from: "follows",
                localField: "_id",
                foreignField: "follower",
                as: "followings"
            }
        },
        {
            $addFields: {
                followersCount: {
                    $size: "$followers"
                },
                followingsCount: {
                    $size: "$followings"
                },
                isFollowed: {
                    $cond: {
                        if: {$in: [userId, "$followers.follower"]},
                        then: true,
                        else: false
                    }
                },
                canEmailNotify: {
                    $eq: [
                        {
                            $size: {
                                $filter: {
                                    input: "$followers",
                                    as: "f",
                                    cond: {
                                        $and: [
                                            { $eq: ["$$f.follower", userId] },
                                            { $eq: ["$$f.emailNotify", true] }
                                        ]
                                    }
                                }
                            }
                        },
                        1
                    ]
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                followersCount: 1,
                followingsCount: 1,
                isFollowed: 1,
                avatar: 1,
                coverImage: 1,
                email: {
                    $cond: [
                        { $eq: [ "$username", req.user?.username ] },
                        "$email",
                        "$$REMOVE"
                    ]
                },
                bio: 1,
                location: 1,
                canEmailNotify: 1
            }
        }
    ])

    if (!userProfile?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, userProfile[0], "User channel fetched successfully")
    )
})

const addOrUpdateGarage = asyncHandler(async (req, res) => {
    const { name, location } = req.body;
    if (!name || !location || !Array.isArray(location) || location.length !== 2) {
        throw new ApiError(400, 'Garage name and location [lng, lat] are required');
    }
    const user = await User.findById(req.user._id).select('-password');
    if (!user || user.userType !== 'mechanic') {
        throw new ApiError(403, 'Only mechanics can add or update garage details');
    }
    // Add new garage to garages array
    user.garages = user.garages || [];
    user.garages.push({
        name,
        location: {
            type: 'Point',
            coordinates: location
        },
        ratings: []
    });
    await user.save({ validateBeforeSave: false });

    // Emit socket event to all users about the updated garages
    try {
        io.emit('garagesUpdated', {
            mechanicId: user._id,
            garages: user.garages,
            mechanic: {
                username: user.username,
                fullName: user.fullName,
                phone: user.phone,
                avatar: user.avatar
            }
        });
    } catch (e) {
        console.error('Socket emit error:', e);
    }

    return res.status(200).json(new ApiResponse(200, user.garages, 'Garage added successfully'));
});

const deleteGarage = asyncHandler(async (req, res) => {
    const { index } = req.body;
    if (index === undefined || index === null) {
        throw new ApiError(400, 'Garage index is required');
    }
    const user = await User.findById(req.user._id).select('-password');
    if (!user || user.userType !== 'mechanic') {
        throw new ApiError(403, 'Only mechanics can delete garages');
    }
    if (!user.garages || index < 0 || index >= user.garages.length) {
        throw new ApiError(400, 'Invalid garage index');
    }
    // Remove garage at the specified index
    user.garages.splice(index, 1);
    await user.save({ validateBeforeSave: false });
    // Emit socket event to all users about the updated garages
    try {
        io.emit('garagesUpdated', {
            mechanicId: user._id,
            garages: user.garages,
            mechanic: {
                username: user.username,
                fullName: user.fullName,
                phone: user.phone,
                avatar: user.avatar
            }
        });
    } catch (e) {
        console.error('Socket emit error:', e);
    }
    return res.status(200).json(new ApiResponse(200, user.garages, 'Garage deleted successfully'));
});

const getUserGarages = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id).select('garages userType fullName username');
    if (!user || user.userType !== 'mechanic') {
        throw new ApiError(404, 'Mechanic not found');
    }
    return res.status(200).json(new ApiResponse(200, user.garages, 'Garages fetched successfully'));
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
        throw new ApiError(400, 'Verification token is required');
    }
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
        throw new ApiError(400, 'Invalid or expired verification token');
    }
    if (user.emailVerificationTokenExpiry < Date.now()) {
        throw new ApiError(400, 'Verification token has expired');
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, null, 'Email verified successfully!'));
});

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    updateLocation,
    forgotPassword,
    resetPassword,
    getUserProfile,
    addOrUpdateGarage,
    deleteGarage,
    getUserGarages,
    verifyEmail
}
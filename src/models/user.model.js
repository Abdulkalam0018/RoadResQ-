import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
        },
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        userType: {
            type: String,
            enum: ["user", "mechanic"],
            default: "user",
            required: true
        },
        avatar: {
            default: "http://localhost:8000/images/default_avatar.jpg",
            type: String, // cloudinary url
        },
        coverImage: {
            default: "http://localhost:8000/images/default_coverImage.jpg",
            type: String, // cloudinary url
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point"
            },
            coordinates: {
                type: [Number],
                default: [0, 0]
            }
        },
        // Mechanic-specific fields
        phone: {
            type: String,
            trim: true,
            required: function() { return this.userType === "mechanic"; }
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        },
        garages: [
            {
                _id: { type: mongoose.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
                name: { type: String },
                location: {
                    type: {
                        type: String,
                        enum: ["Point"],
                        default: "Point"
                    },
                    coordinates: {
                        type: [Number], // [lng, lat]
                        default: [0, 0]
                    }
                },
                ratings: [
                    {
                        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                        value: { type: Number, min: 1, max: 5 }
                    }
                ],
                averageRating: { type: Number, default: 0, min: 0, max: 5 }
            }
        ],
        // Email verification fields
        emailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationToken: {
            type: String
        },
        emailVerificationTokenExpiry: {
            type: Date
        },
    },
    {
        timestamps: true
    }
)

// Create 2dsphere indexes for geospatial queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ 'garages.location': '2dsphere' });

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)
import { Router } from 'express'
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { 
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
} from '../controller/user.controller.js'

const router = Router()

// Public routes
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)
router.route("/auth/refresh-token").post(refreshAccessToken)
router.route("/forgot-password").post(forgotPassword)
router.route("/reset-password").post(resetPassword)
router.route("/verify-email").post(verifyEmail)

// Secure routes (require authentication)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/get-current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails)
router.route("/update-avatar").put(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/update-cover-image").put(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/update-location").put(verifyJWT, updateLocation)
router.route("/get-user-profile/:username").get(verifyJWT, getUserProfile)
router.route("/add-or-update-garage").post(verifyJWT, addOrUpdateGarage)
router.route("/delete-garage").post(verifyJWT, deleteGarage)
router.route('/garages/:id').get(getUserGarages)

export default router
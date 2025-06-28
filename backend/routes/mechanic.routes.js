import { Router } from 'express';
import { getNearbyMechanics } from '../controller/nearby.mechanic.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';

const router = Router();

// Public route to get nearby garages (mechanics with garage info)
router.get('/nearby', getNearbyMechanics);

// Mechanic: Add/Edit garage details
router.post('/garage', verifyJWT, async (req, res) => {
    try {
        const { name, location } = req.body; // location: [lng, lat]
        const user = await User.findById(req.user._id);
        if (!user || user.userType !== 'mechanic') {
            return res.status(403).json({ success: false, message: 'Only mechanics can add/edit garage' });
        }
        // Check if garages array exists, if not initialize it
        if (!user.garages) {
            user.garages = [];
        }
        
        // If user already has a garage, update it, otherwise add a new one
        const existingGarageIndex = user.garages.findIndex(g => g.name === name);
        
        const garageData = {
            name,
            location: {
                type: 'Point',
                coordinates: location
            },
            ratings: existingGarageIndex >= 0 ? user.garages[existingGarageIndex].ratings || [] : [],
            averageRating: 0 // Initialize with 0, will be calculated below if ratings exist
        };
        
        // Calculate average rating if ratings exist
        if (garageData.ratings && garageData.ratings.length > 0) {
            const totalRating = garageData.ratings.reduce((sum, rating) => sum + rating.value, 0);
            garageData.averageRating = parseFloat((totalRating / garageData.ratings.length).toFixed(1));
        }
        
        if (existingGarageIndex >= 0) {
            user.garages[existingGarageIndex] = garageData;
        } else {
            user.garages.push(garageData);
        }
        await user.save();
        res.status(200).json({ success: true, data: user.garages, message: 'Garage details updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// User: Rate a garage
router.post('/rate/:mechanicId', verifyJWT, async (req, res) => {
    try {
        const { value, garageIndex = 0 } = req.body; // 1-5, garage index in the array
        const mechanicId = req.params.mechanicId;
        if (!value || value < 1 || value > 5) {
            return res.status(400).json({ success: false, message: 'Rating value must be between 1 and 5' });
        }
        const mechanic = await User.findById(mechanicId);
        if (!mechanic || mechanic.userType !== 'mechanic') {
            return res.status(404).json({ success: false, message: 'Mechanic not found' });
        }
        if (!mechanic.garages || !mechanic.garages[garageIndex]) {
            return res.status(404).json({ success: false, message: 'Garage not found' });
        }
        // Remove previous rating by this user if exists
        mechanic.garages[garageIndex].ratings = (mechanic.garages[garageIndex].ratings || []).filter(r => r.user.toString() !== req.user._id.toString());
        mechanic.garages[garageIndex].ratings.push({ user: req.user._id, value });
        
        // Calculate and store the average rating
        const ratings = mechanic.garages[garageIndex].ratings;
        if (ratings && ratings.length > 0) {
            const totalRating = ratings.reduce((sum, rating) => sum + rating.value, 0);
            const averageRating = totalRating / ratings.length;
            mechanic.garages[garageIndex].averageRating = parseFloat(averageRating.toFixed(1));
        } else {
            mechanic.garages[garageIndex].averageRating = 0;
        }
        
        await mechanic.save();
        res.status(200).json({ 
            success: true, 
            message: 'Rating submitted', 
            data: {
                averageRating: mechanic.garages[garageIndex].averageRating,
                totalRatings: ratings.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mechanic: Update availability
router.patch('/update-availability', verifyJWT, async (req, res) => {
    try {
        const { isAvailable } = req.body;
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user || user.userType !== "mechanic") {
            return res.status(403).json({ 
                success: false, 
                message: "Only mechanics can update availability" 
            });
        }
        user.isAvailable = isAvailable;
        await user.save();
        return res.status(200).json({
            success: true,
            data: { isAvailable: user.isAvailable },
            message: "Availability updated successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;

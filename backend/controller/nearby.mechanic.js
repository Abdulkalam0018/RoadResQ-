import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getNearbyMechanics = asyncHandler(async (req, res) => { 
  const { lat, lon, radius = 5 } = req.query; // radius in kilometers

  if (!lat || !lon) {
    throw new ApiError(400, "Latitude and Longitude are required");
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new ApiError(400, "Invalid latitude or longitude values");
  }

  try {
    // First check if we have any mechanics with properly configured garages
    const mechanicsWithGarages = await User.countDocuments({
      userType: 'mechanic',
      'garages.0': { $exists: true },
      'garages.location.type': 'Point',
      'garages.location.coordinates': { $exists: true, $type: 'array' }
    });
    
    if (mechanicsWithGarages === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No garages found in the system"));
    }
    
    const garages = await User.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          spherical: true,
          key: 'garages.location',
          maxDistance: radius * 1000,
          query: {
            userType: 'mechanic',
            'garages.location': { $exists: true, $ne: null, $type: 'object' },
            'garages.location.type': 'Point',
            'garages.location.coordinates': { $exists: true, $type: 'array' }
          }
        }
      },
      {
        $addFields: {
          'garages': {
            $map: {
              input: '$garages',
              as: 'garage',
              in: {
                $mergeObjects: [
                  '$$garage',
                  { garageIndex: { $indexOfArray: ['$garages', '$$garage'] } }
                ]
              }
            }
          }
        }
      },
      {$unwind: '$garages'},
      { $match: { 
        'garages.location': { $exists: true, $ne: null, $type: 'object' }, 
        'garages.location.type': 'Point',
        'garages.location.coordinates': { $exists: true, $type: 'array' }
      }},
      {
        $project: {
          _id: 1,
          username: 1,
          fullName: 1,
          phone: 1,
          avatar: 1,
          garage: '$garages',
          distance: 1,
          garageIndex: '$garages.garageIndex'
        }
      },
      // Add a stage to ensure averageRating is calculated if not already present
      {
        $addFields: {
          'garage.averageRating': {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$garage.ratings', []] } }, 0] },
              then: {
                $cond: {
                  if: { $gt: [{ $ifNull: ['$garage.averageRating', 0] }, 0] },
                  then: '$garage.averageRating',
                  else: {
                    $divide: [
                      { $reduce: {
                        input: '$garage.ratings',
                        initialValue: 0,
                        in: { $add: ['$$value', '$$this.value'] }
                      }},
                      { $size: '$garage.ratings' }
                    ]
                  }
                }
              },
              else: 0
            }
          }
        }
      },
      { $sort: { distance: 1 } }
    ]);
    if (!garages || garages.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No nearby garages found"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, garages, "Nearby garages fetched"));
  } catch (error) {
    console.error('Nearby garage error:', error);
    
    // Check for specific MongoDB errors
    if (error.name === 'MongoServerError') {
      // Handle specific MongoDB errors
      if (error.code === 16755) {
        // GeoJSON point must be specified as [longitude, latitude]
        throw new ApiError(500, "Invalid location format in database. Please contact support.");
      } else if (error.code === 2) {
        // Missing required index
        throw new ApiError(500, "Database configuration issue. Please contact support.");
      }
    }
    
    // Provide a more specific error message for common issues
    if (error.message && error.message.includes('2dsphere')) {
      throw new ApiError(500, "Location index issue. Please contact support.");
    }
    
    throw new ApiError(500, error.message || "Error while searching garages. Please try again later.");
  }
});

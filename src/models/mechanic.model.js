import mongoose, { Schema } from "mongoose";

const mechanicSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  services: {
    type: [String], // Example: ["tyre repair", "battery jumpstart"]
    default: []
  },
  rating: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  }
}, {
  timestamps: true
});

// Geospatial index for location field (required for $near)
mechanicSchema.index({ location: "2dsphere" });

export const Mechanic = mongoose.model("Mechanic", mechanicSchema);

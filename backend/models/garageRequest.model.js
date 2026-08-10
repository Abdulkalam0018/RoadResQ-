import mongoose, { Schema } from 'mongoose';

const garageRequestSchema = new Schema(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mechanic: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    garage: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    garageName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true },
);

garageRequestSchema.index({ mechanic: 1, status: 1, createdAt: -1 });

export const GarageRequest = mongoose.model('GarageRequest', garageRequestSchema);

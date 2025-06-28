import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    // Ensure exactly 2 participants (user and mechanic)
    lastMessage: {
      type: String,
      default: ""
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  { timestamps: true }
);

// Validate that there are exactly 2 participants
chatSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('A chat must have exactly 2 participants'));
  }
  next();
});

// Create index for efficient participant lookup
chatSchema.index({ participants: 1 });

export const Chat = mongoose.model("Chat", chatSchema);
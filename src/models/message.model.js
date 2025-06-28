import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    read: {
      type: Boolean,
      default: false
    },
    chatId: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

// Create a compound index for efficient chat retrieval
messageSchema.index({ chatId: 1, createdAt: 1 });

export const Message = mongoose.model("Message", messageSchema);
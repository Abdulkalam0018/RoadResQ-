import { Chat } from '../models/chat.model.js';
import { User } from '../models/user.model.js';
import {
  buildActionResponse,
  extractRoadsideActionIntent,
  getAIResponse,
} from '../services/ai.service.js';

const askAI = async (req, res) => {
  try {
    const trimmedQuery = String(req.body?.query || '').trim();
    if (!trimmedQuery) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const user = await User.findById(req.user?._id).select('-password -refreshToken').lean();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    const chats = await Chat.find({
      participants: user._id,
    })
      .populate('participants', 'username fullName userType')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const unreadCount = chats.reduce((total, chat) => {
      const unreadValue = chat?.unreadCount?.[String(user._id)] || 0;
      return total + unreadValue;
    }, 0);

    const appData = {
      user: {
        _id: String(user._id),
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        userType: user.userType,
        phone: user.phone || '',
        isAvailable: Boolean(user.isAvailable),
        location: user.location?.coordinates || [0, 0],
      },
      garages: Array.isArray(user.garages)
        ? user.garages.map((garage) => ({
            name: garage.name,
            averageRating: garage.averageRating ?? 0,
            ratingsCount: Array.isArray(garage.ratings) ? garage.ratings.length : 0,
            coordinates: garage.location?.coordinates || [0, 0],
          }))
        : [],
      chats: chats.map((chat) => ({
        id: String(chat._id),
        lastMessage: chat.lastMessage || '',
        updatedAt: chat.updatedAt,
        unread: chat?.unreadCount?.[String(user._id)] || 0,
        participants: Array.isArray(chat.participants)
          ? chat.participants
              .filter((participant) => String(participant?._id) !== String(user._id))
              .map((participant) => ({
                id: String(participant._id),
                fullName: participant.fullName,
                username: participant.username,
                userType: participant.userType,
              }))
          : [],
      })),
      totals: {
        garageCount: Array.isArray(user.garages) ? user.garages.length : 0,
        chatCount: chats.length,
        unreadCount,
      },
    };

    const actionIntent = extractRoadsideActionIntent({
      query: trimmedQuery,
      userType: user.userType,
    });

    if (actionIntent) {
      return res.status(200).json(buildActionResponse(actionIntent));
    }

    const aiResult = await getAIResponse(trimmedQuery, String(user._id), appData);
    return res.status(200).json(aiResult);
  } catch (error) {
    console.error('AI controller error:', error);
    return res.status(500).json({ error: 'Failed to get AI response.' });
  }
};

export { askAI };

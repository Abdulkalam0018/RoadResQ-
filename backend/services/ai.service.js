const EMERGENCY_RESPONSE =
  'If there is an accident, injury, fire, or an unsafe roadside situation, contact local emergency services first. For non-emergency breakdown help, use Nearby Mechanics or Messages in RoadResQ.';

const getModelName = () => {
  const configured = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return configured.replace(/^models\//, '');
};

const getGeminiApiKey = () => process.env.GEMINI_API_KEY || '';

const getModelCandidates = () => {
  const configured = getModelName();
  return Array.from(
    new Set([
      configured,
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
    ])
  );
};

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ROAD_HELP_PATTERNS = [/\bnearby\b/, /\bfind\b.*\bmechanic\b/, /\bgarage\b/, /\broadside\b/];
const CHAT_PATTERNS = [/\bchat\b/, /\bmessage\b/, /\bcontact\b/, /\btalk\b/];
const PROFILE_PATTERNS = [/\bprofile\b/, /\baccount\b/, /\bpassword\b/, /\bemail\b/];
const GARAGE_PATTERNS = [/\bgarage\b/, /\bshop\b/, /\badd garage\b/, /\bmanage garage\b/];
const AVAILABILITY_PATTERNS = [/\bavailability\b/, /\bavailable\b/, /\bonline\b/, /\boffline\b/];
const EMERGENCY_PATTERNS = [/\bemergency\b/, /\baccident\b/, /\binjury\b/, /\bfire\b/, /\bunsafe\b/];

const matchesAny = (patterns, text) => patterns.some((pattern) => pattern.test(text));

const formatGarageList = (garages = []) => {
  const names = garages.map((garage) => garage?.name).filter(Boolean);
  if (names.length === 0) return 'no garages yet';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
};

const summarizeAppData = (appData = {}) => ({
  user: appData.user || null,
  totals: appData.totals || {},
  garages: Array.isArray(appData.garages) ? appData.garages : [],
  chats: Array.isArray(appData.chats)
    ? appData.chats.map((chat) => ({
        id: chat.id,
        lastMessage: chat.lastMessage,
        unread: chat.unread,
        participants: chat.participants,
        updatedAt: chat.updatedAt,
      }))
    : [],
});

export const buildRoadResQPrompt = ({ query, sessionId, appData }) => {
  const today = new Date().toISOString().split('T')[0];

  return `You are RoadResQ's AI roadside assistant.

Current date: ${today}
Session ID: ${sessionId}

User question: "${query}"

RoadResQ app data (JSON):
${JSON.stringify(summarizeAppData(appData), null, 2)}

Instructions:
- Use the provided app data whenever the question is about this user's account, garages, chats, or RoadResQ usage.
- If the user asks how to use the app, answer with clear steps inside RoadResQ.
- If the user asks about emergency or unsafe roadside situations, prioritize safety and tell them to contact local emergency services first.
- Do not invent user data that is not in the JSON.
- Do not claim a mechanic is nearby unless the data explicitly says so.
- Keep answers concise, friendly, and action-oriented.
- If the question cannot be answered from app data, give a short general RoadResQ-oriented response.
`;
};

export const extractRoadsideActionIntent = ({ query, userType }) => {
  const normalized = normalizeText(query);

  if (matchesAny(EMERGENCY_PATTERNS, normalized)) {
    return {
      type: 'safety_notice',
      answer: EMERGENCY_RESPONSE,
    };
  }

  if (matchesAny(CHAT_PATTERNS, normalized)) {
    return {
      type: 'navigate',
      path: '/chat',
      answer: 'Opening Messages so you can continue the conversation there.',
    };
  }

  if (matchesAny(PROFILE_PATTERNS, normalized)) {
    return {
      type: 'navigate',
      path: '/profile',
      answer: 'Opening Profile so you can manage your account details.',
    };
  }

  if (userType === 'mechanic' && matchesAny(GARAGE_PATTERNS, normalized)) {
    return {
      type: 'open_garage_manager',
      answer: 'Opening Garage Management so you can add or update your garage details.',
    };
  }

  if (matchesAny(ROAD_HELP_PATTERNS, normalized)) {
    return {
      type: 'navigate',
      path: '/nearby-mechanics',
      answer:
        userType === 'mechanic'
          ? 'Opening Nearby Mechanics so you can view the same search experience as your users.'
          : 'Opening Nearby Mechanics so you can search for roadside help now.',
    };
  }

  if (userType === 'mechanic' && matchesAny(AVAILABILITY_PATTERNS, normalized)) {
    return {
      type: 'open_garage_manager',
      answer: 'Opening your dashboard controls so you can review availability and garage details.',
    };
  }

  return null;
};

export const buildActionResponse = (intent) => {
  if (intent.type === 'safety_notice') {
    return {
      answer: intent.answer,
      source: 'local_action',
      action: {
        type: 'navigate',
        path: '/nearby-mechanics',
      },
    };
  }

  return {
    answer: intent.answer,
    source: 'local_action',
    action: {
      type: intent.type,
      path: intent.path || null,
    },
  };
};

export const ruleBasedFallback = ({ query, appData }) => {
  const normalized = normalizeText(query);
  const user = appData?.user || {};
  const totals = appData?.totals || {};
  const garages = Array.isArray(appData?.garages) ? appData.garages : [];

  if (matchesAny(EMERGENCY_PATTERNS, normalized)) {
    return EMERGENCY_RESPONSE;
  }

  if (matchesAny(ROAD_HELP_PATTERNS, normalized)) {
    return user.userType === 'mechanic'
      ? 'Use the Nearby Mechanics page to see the customer-facing search flow. Users can share location access there and browse listed garages.'
      : 'Use Nearby Mechanics, allow location access, then search within your preferred radius to find listed garages and start a conversation.';
  }

  if (matchesAny(CHAT_PATTERNS, normalized)) {
    const unread = totals.unreadCount || 0;
    const chatCount = totals.chatCount || 0;
    return unread > 0
      ? `You currently have ${chatCount} conversation${chatCount === 1 ? '' : 's'} and ${unread} unread message${unread === 1 ? '' : 's'}. Open Messages to continue chatting.`
      : `You currently have ${chatCount} conversation${chatCount === 1 ? '' : 's'}. Open Messages to contact a mechanic or follow up with users.`;
  }

  if (user.userType === 'mechanic' && matchesAny(GARAGE_PATTERNS, normalized)) {
    const garageCount = totals.garageCount || 0;
    return garageCount > 0
      ? `You currently have ${garageCount} garage listing${garageCount === 1 ? '' : 's'}: ${formatGarageList(garages)}. Use Garage Management on the dashboard to add or update them.`
      : 'You do not have any garages listed yet. Use Garage Management on the dashboard to add your first garage with its location.';
  }

  if (user.userType === 'mechanic' && matchesAny(AVAILABILITY_PATTERNS, normalized)) {
    return `Your availability is currently ${user.isAvailable ? 'ON' : 'OFF'}. You can change it from the mechanic dashboard.`;
  }

  if (matchesAny(PROFILE_PATTERNS, normalized)) {
    return `You are signed in as ${user.fullName || user.username || 'this account'}. Open Profile to update your details, email, or password.`;
  }

  return user.userType === 'mechanic'
    ? 'I can help with garage management, availability, messages, and general RoadResQ navigation. Try asking me to open garage management or explain how users find your listing.'
    : 'I can help you find nearby mechanics, open messages, explain RoadResQ features, and guide you through the app. Try asking how to find help near you.';
};

const callGemini = async (modelName, prompt, apiKey) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 350,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  const text =
    result?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim() || '';

  return text;
};

export const getAIResponse = async (query, sessionId, appData) => {
  const apiKey = getGeminiApiKey();
  const modelCandidates = getModelCandidates();
  const fallback = ruleBasedFallback({ query, appData });

  if (!apiKey) {
    return {
      answer:
        fallback ||
        "The AI service isn't configured yet. Please set GEMINI_API_KEY in the backend .env file.",
      source: 'local_fallback',
    };
  }

  const prompt = buildRoadResQPrompt({ query, sessionId, appData });

  for (const modelName of modelCandidates) {
    try {
      const text = await callGemini(modelName, prompt, apiKey);

      if (!text) {
        return {
          answer: fallback || 'I could not generate a useful answer right now.',
          source: fallback ? 'local_fallback' : 'gemini_empty',
        };
      }

      return {
        answer: text,
        source: 'gemini',
        model: modelName,
      };
    } catch (error) {
      const status = Number(error?.status || 0);
      const shouldRetry = status === 404 || status === 429 || status === 500 || status === 503;
      if (!shouldRetry || modelName === modelCandidates.at(-1)) {
        console.error('Gemini error:', error);
        return {
          answer: fallback
            ? `I couldn't reach the full AI right now, so I'm answering from your RoadResQ data.\n\n${fallback}`
            : 'I could not reach the AI service right now. Please try again in a moment.',
          source: 'local_fallback',
        };
      }
    }
  }

  return {
    answer: fallback || 'I could not generate a useful answer right now.',
    source: 'local_fallback',
  };
};

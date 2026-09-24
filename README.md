# RoadResQ

RoadResQ is a full-stack roadside assistance app with:

- user and mechanic accounts
- garage listing and availability management
- nearby mechanic search with geolocation
- in-app chat with Socket.IO
- password reset and email verification flows
- an AI roadside assistant for roadside help, garage guidance, and in-app navigation

---

## Project Structure

```
RoadResQ-/
├── backend/              # Express, MongoDB, Socket.IO, auth, garage, chat, AI
│   ├── controller/       # Route handlers (user, mechanic, chat, AI, garageRequest)
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route definitions
│   ├── services/         # Kafka, AI, notification services
│   ├── middlewares/      # JWT auth, multer upload
│   └── utils/            # Helpers (ApiError, cloudinary, email, etc.)
├── frontend/             # React app for user and mechanic dashboards
├── test_api.py           # Automated API test suite (pytest + requests)
├── pytest.ini            # pytest configuration
├── conftest.py           # pytest root marker
└── .env.example          # backend environment template
```

---

## API Endpoints

### Base URL
```
http://localhost:9000
```

| Route | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | ❌ | Server health check |
| `/api/v1` | GET | ❌ | API root with endpoint map |
| `/api/v1/users/register` | POST | ❌ | Register user or mechanic |
| `/api/v1/users/login` | POST | ❌ | Login and receive JWT tokens |
| `/api/v1/users/logout` | POST | ✅ | Logout current user |
| `/api/v1/users/auth/refresh-token` | POST | ❌ | Refresh access token |
| `/api/v1/users/forgot-password` | POST | ❌ | Send password reset email |
| `/api/v1/users/reset-password` | POST | ❌ | Reset password with token |
| `/api/v1/users/verify-email` | POST | ❌ | Verify email address |
| `/api/v1/users/get-current-user` | GET | ✅ | Get logged-in user |
| `/api/v1/users/update-account-details` | PATCH | ✅ | Update name / email |
| `/api/v1/users/update-location` | PUT | ✅ | Update user GPS location |
| `/api/v1/users/get-user-profile/:username` | GET | ✅ | Get a user's public profile |
| `/api/v1/users/change-password` | POST | ✅ | Change password |
| `/api/v1/users/add-or-update-garage` | POST | ✅ (mechanic) | Add / update a garage |
| `/api/v1/users/delete-garage` | POST | ✅ (mechanic) | Delete a garage by index |
| `/api/v1/users/garages/:id` | GET | ❌ | Get mechanic's garages |
| `/api/v1/mechanics/nearby` | GET | ❌ | Find nearby mechanics by `lat`/`lon` |
| `/api/v1/mechanics/garage` | POST | ✅ (mechanic) | Add a garage via mechanic route |
| `/api/v1/mechanics/update-availability` | PATCH | ✅ (mechanic) | Toggle availability |
| `/api/v1/mechanics/rate/:mechanicId` | POST | ✅ | Rate a mechanic's garage |
| `/api/v1/mechanics/:mechanicId/garages/:garageId/requests` | POST | ✅ (user) | Send garage service request |
| `/api/v1/mechanics/garage-requests/mine` | GET | ✅ (user) | Get my sent requests |
| `/api/v1/mechanics/garage-requests/incoming` | GET | ✅ (mechanic) | Get incoming requests |
| `/api/v1/mechanics/garage-requests/:requestId/status` | PATCH | ✅ (mechanic) | Accept / decline / complete request |
| `/api/v1/chats/` | GET | ✅ | List all my chats |
| `/api/v1/chats/user/:userId` | GET | ✅ | Get or create chat with a user |
| `/api/v1/chats/:chatId/messages` | GET | ✅ | Get messages in a chat |
| `/api/v1/chats/message` | POST | ✅ | Send a chat message |
| `/api/v1/chats/:chatId/mark-read` | POST | ✅ | Mark messages as read |
| `/api/v1/ai/ask` | POST | ✅ | Ask the AI roadside assistant |

---

## AI Roadside Assistant

RoadResQ includes a Gemini-backed AI roadside assistant that helps users and mechanics with:

- roadside help guidance
- nearby mechanic discovery
- garage management prompts
- chat and dashboard navigation
- fallback answers based on RoadResQ app data

Implementation files:

- `backend/services/ai.service.js`
- `backend/controller/ai.controller.js`
- `backend/routes/ai.routes.js`
- `frontend/src/components/AIRoadsideAssistant.js`

The assistant uses RoadResQ-specific prompts, action intents, and fallback logic for roadside assistance, garages, chats, and dashboard actions.

---

## Automated API Testing

The project includes a complete Python test suite (`test_api.py`) that tests the Node.js backend without any migration — using **pytest** and **requests**.

### Test Results

```
======================== 67 passed, 1 warning in 12.10s ========================
```

### Test Coverage

| Test Class | Tests | What is Covered |
|---|---|---|
| `TestHealthAndRoot` | 3 | `/health`, `/api/v1`, 404 handler |
| `TestUserRegistration` | 6 | Register user/mechanic, duplicates, missing fields, invalid type |
| `TestUserLogin` | 6 | Login with credentials, wrong password, missing fields |
| `TestAuthenticatedUserEndpoints` | 8 | Current user, update account/location/profile, change password |
| `TestPasswordReset` | 5 | Forgot/reset password with valid & invalid tokens |
| `TestEmailVerification` | 2 | Email verify with missing/invalid tokens |
| `TestGarageEndpoints` | 6 | Add/delete garages, role enforcement, fetch by ID |
| `TestMechanicEndpoints` | 9 | Nearby mechanics, garage CRUD, availability, ratings |
| `TestGarageRequests` | 8 | Create request, list mine/incoming, update status |
| `TestChatEndpoints` | 7 | Get chats, create chat, messages, mark-read |
| `TestAIEndpoint` | 3 | `/ai/ask` auth guard, query field, empty query |
| `TestTokenRefresh` | 2 | Refresh token missing/invalid |
| `TestLogout` | 2 | Logout for user and mechanic |

### How to Run the Tests

**1. Install Python dependencies**

```bash
pip install pytest requests
```

**2. Start the Node.js backend** (in a separate terminal)

```bash
npm start
# or for development:
npm run backend:dev
```

**3. Run the full test suite**

```bash
pytest test_api.py -v
```

**Sample output:**

```
test_api.py::TestHealthAndRoot::test_health_endpoint PASSED              [  1%]
test_api.py::TestHealthAndRoot::test_api_root_endpoint PASSED            [  2%]
test_api.py::TestUserRegistration::test_register_regular_user_success PASSED [  5%]
test_api.py::TestUserLogin::test_login_regular_user PASSED               [ 14%]
...
test_api.py::TestLogout::test_logout_mechanic PASSED                     [100%]

======================== 67 passed, 1 warning in 12.10s ========================
```

> **Note:** Tests depend on a running backend and a live MongoDB connection.
> Tests use random usernames and emails on every run, so they are safe to re-run repeatedly.

---

## Step-By-Step `.env` Setup

### 1. Create the backend env file

From the project root:

```bash
cp .env.example .env
```

### 2. Open `.env` and fill these values

Required for local app startup:

```env
PORT=9000
MONGODB_URI=mongodb://127.0.0.1:27017
DB_NAME=roadresq
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
FRONTEND_URL=http://localhost:3000

ACCESS_TOKEN_SECRET=replace_with_a_long_random_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=replace_with_another_long_random_secret
REFRESH_TOKEN_EXPIRY=30d
RESET_PASSWORD_SECRET=replace_with_a_third_long_random_secret
RESET_PASSWORD_EXPIRY=15m
```

Optional but recommended:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EMAIL_USER=
EMAIL_PASS=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Notes:

- `GEMINI_API_KEY` is required if you want the AI assistant to call Gemini.
- If email is not configured, registration still works and falls back to returning the verification URL for development.
- If Cloudinary is not configured, avoid avatar and cover uploads until it is set.

### 2a. Enable Kafka for garage requests (optional in development)

Incoming requests sent from a user to a garage are stored in MongoDB, published to
Kafka, and consumed into the garage's Socket.IO notification room. Start the local
single-node broker with:

```bash
docker compose -f docker-compose.kafka.yml up -d
```

Then set the Kafka values in `.env` (the included defaults work with that compose file):

```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=roadresq-api
KAFKA_GARAGE_REQUEST_TOPIC=roadresq.garage-request.created
KAFKA_GARAGE_REQUEST_GROUP_ID=roadresq-garage-notifications
```

If `KAFKA_BROKERS` is not set, requests still work locally and use the existing Socket.IO delivery path instead.

### 3. Create the frontend env file

```bash
cp frontend/.env.example frontend/.env
```

### 4. Open `frontend/.env` and set:

```env
REACT_APP_API_URL=http://localhost:9000
REACT_APP_SOCKET_URL=http://localhost:9000
```

### 5. Start MongoDB

Make sure your local MongoDB server is running before starting the backend.

---

## Install and Run

### 1. Install backend dependencies

```bash
npm install
```

### 2. Install frontend dependencies

```bash
npm install --prefix frontend
```

### 3. Start the backend

```bash
npm run backend:dev
```

### 4. Start the frontend

```bash
npm run frontend:dev
```

### 5. Open the app

Visit:

- `http://localhost:3000`

Backend health check:

- `http://localhost:9000/health`

## One-Command Dev Startup

After your backend `.env`, frontend `.env`, and MongoDB are ready, you can start everything with:

```bash
npm run dev
```

This root command:

- starts the backend dev server
- starts the frontend dev server
- opens `http://localhost:3000` automatically when the frontend is ready

---

## Current Status

Completed:

- backend entry and scripts fixed to use `backend/index.js`
- frontend build restored
- Gemini-based AI assistant added
- Socket.IO auth aligned with token-based frontend usage
- frontend API base URL and socket URL made configurable
- backend and frontend `.env.example` files added
- **67-test automated API test suite added (`test_api.py`)**

Verified locally:

- backend modules import successfully
- frontend production build completes
- all 67 API tests pass (`pytest test_api.py -v`)

---

## Helpful Commands

```bash
# Run the app
npm run backend:dev
npm run start
npm run frontend:dev
cd frontend && npm run build

# Run API tests
pip install pytest requests
pytest test_api.py -v
```

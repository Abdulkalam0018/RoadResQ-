# RoadResQ

RoadResQ is a full-stack roadside assistance app with:

- user and mechanic accounts
- garage listing and availability management
- nearby mechanic search with geolocation
- in-app chat with Socket.IO
- password reset and email verification flows
- an AI roadside assistant for roadside help, garage guidance, and in-app navigation

## Project Structure

- `backend/`: Express, MongoDB, Socket.IO, auth, garage, chat, AI routes
- `frontend/`: React app for user and mechanic dashboards
- `.env.example`: backend environment template
- `frontend/.env.example`: frontend environment template

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

## Current Status

Completed:

- backend entry and scripts fixed to use `backend/index.js`
- frontend build restored
- Gemini-based AI assistant added
- Socket.IO auth aligned with token-based frontend usage
- frontend API base URL and socket URL made configurable
- backend and frontend `.env.example` files added

Verified locally:

- backend modules import successfully
- frontend production build completes

## Helpful Commands

```bash
npm run backend:dev
npm run start
npm run frontend:dev
cd frontend && npm run build
```

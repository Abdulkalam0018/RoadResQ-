# RoadResQ Backend

This is the backend server for the RoadResQ application, a platform that connects users with nearby mechanics.

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```
   npm install
   ```
4. Configure environment variables (see below)
5. Start the server:
   ```
   npm start
   ```

## Environment Variables

Create a `.env` file in the root of the backend directory with the following variables:

```
# Server Configuration
PORT=9000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=roadresq

# JWT Configuration
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=10d

# Password Reset
RESET_PASSWORD_SECRET=your_reset_password_secret
RESET_PASSWORD_EXPIRY=15m

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Email Configuration (for password reset functionality)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

# Cloudinary Configuration (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Email Configuration

To enable the password reset functionality, you need to configure the email service:

1. **Gmail Setup**:
   - Use a Gmail account for sending emails
   - Enable 2-factor authentication on your Gmail account
   - Generate an "App Password" from your Google Account settings:
     - Go to your Google Account > Security > 2-Step Verification
     - At the bottom, select "App passwords"
     - Select "Mail" as the app and "Other" as the device
     - Enter a name (e.g., "RoadResQ")
     - Click "Generate"

2. **Update .env File**:
   - Set `EMAIL_USER` to your Gmail address
   - Set `EMAIL_PASS` to the App Password generated above

**Note**: Never commit your .env file to version control.

## API Documentation

The API endpoints are organized into the following routes:

- `/api/v1/users` - User authentication and profile management
- `/api/v1/mechanics` - Mechanic-specific functionality
- `/api/v1/chat` - Chat and messaging functionality

Detailed API documentation is available in the `/docs` directory.

## Features

- User authentication (register, login, logout)
- Password management (change, reset via email)
- Profile management
- Real-time chat using Socket.IO
- Mechanic availability and location tracking
- Garage management for mechanics
- Rating system for mechanics

## License

MIT
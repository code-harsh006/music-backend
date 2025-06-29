# 🎵 Music Backend API

A complete production-ready backend for a modern music web application built with Node.js, Express, MongoDB, and AWS S3.

## 🚀 Features

- **User Authentication**: JWT-based auth with secure password hashing
- **File Upload**: Direct S3 upload for music files (MP3, WAV)
- **Music Management**: CRUD operations for songs with metadata
- **Playlist System**: Create, manage, and share playlists
- **Security**: Rate limiting, CORS, input validation, and access controls
- **Production Ready**: PM2 clustering, error handling, and logging

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- AWS S3 bucket
- PM2 (for production)

## 🛠️ Installation

1. **Clone and Install**
\`\`\`bash
git clone <repository-url>
cd music-backend
npm install
\`\`\`

2. **Environment Setup**
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

3. **Start Development Server**
\`\`\`bash
npm run dev
\`\`\`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/music-app` |
| `JWT_SECRET` | JWT signing key | `your-secret-key` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `secret...` |
| `S3_BUCKET_NAME` | S3 bucket name | `my-music-bucket` |

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}


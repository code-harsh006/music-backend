# 🎵 Music Backend API

A production-ready Node.js/Express backend for a modern music streaming application with AWS S3 integration.

## 🚀 Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Song Management**: Upload, store, and manage audio files with AWS S3
- **Playlist System**: Create and manage playlists with song collections
- **File Upload**: Secure audio file upload with validation and S3 storage
- **Search & Filtering**: Advanced search and filtering capabilities
- **Security**: Comprehensive security measures (Helmet, CORS, Rate limiting)
- **Production Ready**: PM2 process management and graceful shutdown

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- AWS S3 Bucket
- AWS IAM credentials with S3 permissions

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd music-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Frontend URL for CORS
   FRONTEND_URL=http://localhost:5173
   
   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/music-app
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   
   # AWS S3 Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-aws-access-key-id
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   S3_BUCKET_NAME=your-music-bucket-name
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🏃‍♂️ Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run pm2:start` - Start with PM2 process manager
- `npm run pm2:stop` - Stop PM2 process
- `npm run pm2:restart` - Restart PM2 process
- `npm run pm2:logs` - View PM2 logs
- `npm run pm2:delete` - Delete PM2 process

## 📚 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Songs (`/api/songs`)
- `POST /upload` - Upload new song (multipart/form-data)
- `GET /` - Get public songs with pagination and search
- `GET /my-songs` - Get user's songs
- `GET /:id` - Get specific song
- `PUT /:id` - Update song metadata
- `DELETE /:id` - Delete song
- `POST /:id/play` - Increment play count

### Playlists (`/api/playlists`)
- `POST /` - Create new playlist
- `GET /my-playlists` - Get user's playlists
- `GET /public` - Get public playlists
- `GET /:id` - Get specific playlist
- `PUT /:id` - Update playlist
- `DELETE /:id` - Delete playlist
- `POST /:id/songs` - Add song to playlist
- `DELETE /:id/songs/:songId` - Remove song from playlist

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with 12 salt rounds
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **File Upload Security**: File type and size validation

## 🗄️ Database Schema

### User Model
- `username`: Unique username (3-30 chars)
- `email`: Unique email address
- `password`: Hashed password (min 6 chars)
- `timestamps`: Created/updated timestamps

### Song Model
- `title`: Song title (max 200 chars)
- `artist`: Artist name (max 100 chars)
- `album`: Album name (optional, max 100 chars)
- `duration`: Duration in seconds
- `genre`: Genre (optional, max 50 chars)
- `s3Url`: S3 file URL
- `s3Key`: S3 file key
- `fileSize`: File size in bytes
- `mimeType`: File MIME type
- `userId`: Reference to User
- `playCount`: Play count (default: 0)
- `isPublic`: Public visibility (default: true)

### Playlist Model
- `name`: Playlist name (max 100 chars)
- `description`: Description (optional, max 500 chars)
- `userId`: Reference to User
- `songs`: Array of Song references
- `isPublic`: Public visibility (default: false)
- `coverImage`: Cover image URL (optional)

## 🚀 Production Deployment

1. **Set up PM2**
   ```bash
   npm install -g pm2
   ```

2. **Configure environment variables for production**

3. **Start with PM2**
   ```bash
   npm run pm2:start
   ```

4. **Monitor the application**
   ```bash
   npm run pm2:logs
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment | No | development |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:5173 |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | 7d |
| `AWS_REGION` | AWS region | Yes | - |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes | - |
| `S3_BUCKET_NAME` | S3 bucket name | Yes | - |

### File Upload Limits

- **File Size**: 50MB maximum
- **File Types**: MP3, WAV
- **Storage**: AWS S3 with organized folder structure

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Ensure network connectivity

2. **S3 Upload Failures**
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Ensure bucket exists in specified region

3. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper Authorization header format

4. **File Upload Issues**
   - Check file size (max 50MB)
   - Verify file type (MP3/WAV only)
   - Ensure proper multipart/form-data format

### Logs

- **Development**: Console output
- **Production**: PM2 logs (`npm run pm2:logs`)
- **Error Logs**: `./logs/err.log`
- **Output Logs**: `./logs/out.log`

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the repository.

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


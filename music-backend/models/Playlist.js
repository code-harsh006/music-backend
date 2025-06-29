import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    maxlength: [100, 'Playlist name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  songs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  coverImage: {
    type: String // URL to cover image
  }
}, {
  timestamps: true
});

// Indexes
playlistSchema.index({ userId: 1 });
playlistSchema.index({ name: 'text', description: 'text' });
playlistSchema.index({ createdAt: -1 });

// Virtual for song count
playlistSchema.virtual('songCount').get(function() {
  return this.songs.length;
});

// Virtual for total duration (requires populated songs)
playlistSchema.virtual('totalDuration').get(function() {
  if (!this.populated('songs')) return 0;
  return this.songs.reduce((total, song) => total + (song.duration || 0), 0);
});

export default mongoose.model('Playlist', playlistSchema);


import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import Song from '../models/Song.js';
import auth from '../middleware/auth.js';
import { s3Client, upload } from '../config/s3.js';

const router = express.Router();

// Upload new song
router.post('/upload', auth, upload.single('audio'), [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('artist')
    .trim()
    .notEmpty()
    .withMessage('Artist is required')
    .isLength({ max: 100 })
    .withMessage('Artist name cannot exceed 100 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Album name cannot exceed 100 characters'),
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre cannot exceed 50 characters'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive number'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If validation fails and file was uploaded, delete it from S3
      if (req.file) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (deleteError) {
          console.error('Error deleting file from S3:', deleteError);
        }
      }
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }

    const { title, artist, album, genre, duration, isPublic } = req.body;

    // Create new song record
    const song = new Song({
      title,
      artist,
      album,
      genre,
      duration: duration ? parseInt(duration) : undefined,
      s3Url: req.file.location,
      s3Key: req.file.key,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      userId: req.user._id,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await song.save();

    // Populate user info for response
    await song.populate('userId', 'username');

    res.status(201).json({
      message: 'Song uploaded successfully',
      song
    });

  } catch (error) {
    // If database save fails and file was uploaded, delete it from S3
    if (req.file) {
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: req.file.key
        }));
      } catch (deleteError) {
        console.error('Error deleting file from S3:', deleteError);
      }
    }
    next(error);
  }
});

// Get all songs with pagination and search
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),
  query('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre filter cannot exceed 50 characters'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'title', 'artist', 'playCount'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const genre = req.query.genre;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    let query = { isPublic: true };

    if (search) {
      query.$text = { $search: search };
    }

    if (genre) {
      query.genre = new RegExp(genre, 'i');
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    // Execute query
    const [songs, total] = await Promise.all([
      Song.find(query)
        .populate('userId', 'username')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Song.countDocuments(query)
    ]);

    res.json({
      songs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSongs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get songs by current user
router.get('/my-songs', auth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [songs, total] = await Promise.all([
      Song.find({ userId: req.user._id })
        .populate('userId', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Song.countDocuments({ userId: req.user._id })
    ]);

    res.json({
      songs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSongs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get single song by ID
router.get('/:id', async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id)
      .populate('userId', 'username');

    if (!song) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    // Check if song is public or user is the owner
    if (!song.isPublic && (!req.user || song.userId._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({ song });

  } catch (error) {
    next(error);
  }
});

// Update song metadata
router.put('/:id', auth, [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('artist')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Artist cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Artist name cannot exceed 100 characters'),
  body('album')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Album name cannot exceed 100 characters'),
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Genre cannot exceed 50 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    // Check if user is the owner
    if (song.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied. You can only update your own songs.'
      });
    }

    // Update fields
    const { title, artist, album, genre, isPublic } = req.body;
    
    if (title !== undefined) song.title = title;
    if (artist !== undefined) song.artist = artist;
    if (album !== undefined) song.album = album;
    if (genre !== undefined) song.genre = genre;
    if (isPublic !== undefined) song.isPublic = isPublic;

    await song.save();
    await song.populate('userId', 'username');

    res.json({
      message: 'Song updated successfully',
      song
    });

  } catch (error) {
    next(error);
  }
});

// Delete song
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    // Check if user is the owner
    if (song.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied. You can only delete your own songs.'
      });
    }

    // Delete file from S3
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: song.s3Key
      }));
    } catch (s3Error) {
      console.error('Error deleting file from S3:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await Song.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Song deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Increment play count
router.post('/:id/play', async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    // Check if song is public or user is the owner
    if (!song.isPublic && (!req.user || song.userId.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    song.playCount += 1;
    await song.save();

    res.json({
      message: 'Play count updated',
      playCount: song.playCount
    });

  } catch (error) {
    next(error);
  }
});

export default router;


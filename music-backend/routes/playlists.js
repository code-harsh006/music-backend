import express from 'express';
import { body, query, validationResult } from 'express-validator';
import Playlist from '../models/Playlist.js';
import Song from '../models/Song.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create new playlist
router.post('/', auth, [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Playlist name is required')
    .isLength({ max: 100 })
    .withMessage('Playlist name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
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

    const { name, description, isPublic } = req.body;

    const playlist = new Playlist({
      name,
      description,
      userId: req.user._id,
      isPublic: isPublic || false
    });

    await playlist.save();
    await playlist.populate('userId', 'username');

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist
    });

  } catch (error) {
    next(error);
  }
});

// Get user's playlists
router.get('/my-playlists', auth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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

    const [playlists, total] = await Promise.all([
      Playlist.find({ userId: req.user._id })
        .populate('userId', 'username')
        .populate({
          path: 'songs',
          select: 'title artist duration',
          populate: {
            path: 'userId',
            select: 'username'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Playlist.countDocuments({ userId: req.user._id })
    ]);

    res.json({
      playlists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPlaylists: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get public playlists
router.get('/public', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters')
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

    let query = { isPublic: true };

    if (search) {
      query.$text = { $search: search };
    }

    const [playlists, total] = await Promise.all([
      Playlist.find(query)
        .populate('userId', 'username')
        .populate({
          path: 'songs',
          select: 'title artist duration',
          populate: {
            path: 'userId',
            select: 'username'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Playlist.countDocuments(query)
    ]);

    res.json({
      playlists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPlaylists: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get single playlist by ID
router.get('/:id', async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('userId', 'username')
      .populate({
        path: 'songs',
        populate: {
          path: 'userId',
          select: 'username'
        }
      });

    if (!playlist) {
      return res.status(404).json({
        error: 'Playlist not found'
      });
    }

    // Check if playlist is public or user is the owner
    if (!playlist.isPublic && (!req.user || playlist.userId._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({ playlist });

  } catch (error) {
    next(error);
  }
});

// Update playlist
router.put('/:id', auth, [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Playlist name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Playlist name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
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

    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: 'Playlist not found'
      });
    }

    // Check if user is the owner
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied. You can only update your own playlists.'
      });
    }

    const { name, description, isPublic } = req.body;

    if (name !== undefined) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();
    await playlist.populate('userId', 'username');
    await playlist.populate({
      path: 'songs',
      populate: {
        path: 'userId',
        select: 'username'
      }
    });

    res.json({
      message: 'Playlist updated successfully',
      playlist
    });

  } catch (error) {
    next(error);
  }
});

// Delete playlist
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: 'Playlist not found'
      });
    }

    // Check if user is the owner
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied. You can only delete your own playlists.'
      });
    }

    await Playlist.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Playlist deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Add song to playlist
router.post('/:id/songs', auth, [
  body('songId')
    .notEmpty()
    .withMessage('Song ID is required')
    .isMongoId()
    .withMessage('Invalid song ID format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { songId } = req.body;

    const [playlist, song] = await Promise.all([
      Playlist.findById(req.params.id),
      Song.findById(songId)
    ]);

    if (!playlist) {
      return res.status(404).json({
        error: 'Playlist not found'
      });
    }

    if (!song) {
      return res.status(404).json({
        error: 'Song not found'
      });
    }

    // Check if user is the owner of the playlist
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied. You can only modify your own playlists.'
      });
    }

    // Check if song is public or user is the owner
    if (!song.isPublic && song.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Cannot add private song to playlist'
      });
    }

    // Check if song is already in playlist
    if (playlist.songs.includes(songId)) {
      return res.status(400).json({
        error: 'Song is already in the playlist'
      });
    }

    playlist.songs.push(songId);
    await playlist.save();

    await playlist.populate({
      path: 'songs',
      populate: {
        path: 'userId',
        select: 'username'
      }
    });

    res.json({
      message: 'Song added to playlist successfully',
      playlist
    });

  } catch (error) {
    next(error);
  }
});

// Remove song from playlist
router.delete('/:id/songs/:songId', auth, async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: 'Playlist not found'
      });
    }

    // Check if user is the owner
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access denied. You can only modify your own playlists.'
      });
    }

    // Check if song is in playlist
    const songIndex = playlist.songs.indexOf(req.params.songId);
    if (songIndex === -1) {
      return res.status(404).json({
        error: 'Song not found in playlist'
      });
    }

    playlist.songs.splice(songIndex, 1);
    await playlist.save();

    await playlist.populate({
      path: 'songs',
      populate: {
        path: 'userId',
        select: 'username'
      }
    });

    res.json({
      message: 'Song removed from playlist successfully',
      playlist
    });

  } catch (error) {
    next(error);
  }
});

export default router;


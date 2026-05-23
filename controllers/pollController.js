const { validationResult } = require('express-validator');
const Poll = require('../models/Poll');
const { generateAccessCode } = require('../utils/shuffle');

/**
 * POST /api/polls
 * Create a new poll (teacher only).
 */
const createPoll = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { title, question, options, isPublic } = req.body;

    const poll = await Poll.create({
      title: title || '',
      question,
      options: options.map((opt) => ({
        text: typeof opt === 'string' ? opt : opt.text,
        votes: 0,
      })),
      createdBy: req.user.id,
      isPublic: isPublic !== undefined ? isPublic : true,
      accessCode: generateAccessCode(),
    });

    res.status(201).json(poll);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/polls
 * List all polls created by the authenticated teacher.
 */
const listPolls = async (req, res, next) => {
  try {
    const polls = await Poll.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/polls/:id
 * Get a single poll with live vote counts (public).
 */
const getPoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });
    res.json(poll);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/polls/:id/vote
 * Cast a vote on a poll option (no auth required).
 */
const votePoll = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });
    if (!poll.isOpen) return res.status(400).json({ message: 'This poll is closed.' });

    const { optionIndex } = req.body;
    if (optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'Invalid option index.' });
    }

    poll.options[optionIndex].votes += 1;
    poll.markModified('options');
    await poll.save();

    res.json({ message: 'Vote recorded.', poll });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/polls/:id/close
 * Close a poll (teacher only).
 */
const closePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });

    poll.isOpen = false;
    poll.closedAt = new Date();
    await poll.save();

    res.json({ message: 'Poll closed successfully.', poll });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/polls/:id/open
 * Reopen a closed poll (teacher only).
 */
const openPoll = async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });

    poll.isOpen = true;
    poll.closedAt = undefined;
    await poll.save();

    res.json({ message: 'Poll reopened successfully.', poll });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/polls/:id
 * Delete a poll (teacher only).
 */
const deletePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!poll) return res.status(404).json({ message: 'Poll not found.' });

    await poll.deleteOne();
    res.json({ message: 'Poll deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPoll, listPolls, getPoll, votePoll, closePoll, openPoll, deletePoll };

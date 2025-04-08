const { upvotePost, downvotePost } = require('./postVote');
const Post = require('../models/post');
const User = require('../models/user');
const pointsCalculator = require('../utils/pointsCalculator');
const { test, expect, describe, beforeEach } = require("@jest/globals");

// Mock the database models and utility functions to avoid actual database calls
jest.mock('../models/post');
jest.mock('../models/user');
jest.mock('../utils/pointsCalculator');

describe('Post Vote Controller', () => {
  // Set up mock objects used across all tests
  let mockReq;
  let mockRes;
  let mockPost;
  let mockUser;
  let mockAuthor;

  // Before each test, set up fresh mock objects to prevent test interference
  beforeEach(() => {
    // Create a mock request with post ID and user ID
    mockReq = {
      params: { id: 'post123' }, // The ID of the post to be voted on
      user: 'user123'            // ID of the user performing the vote action
    };

    // Create a mock response object with common Express methods
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allow method chaining
      send: jest.fn(),                    // Mock send() method to track calls
      end: jest.fn()                      // Mock end() method to track calls
    };

    // Mock the voting user
    mockUser = {
      _id: { toString: () => 'user123' }, // User ID that matches the request
      save: jest.fn().mockResolvedValue(true) // Mock successful save operation
    };

    // Mock the post to be voted on
    mockPost = {
      _id: 'post123',                // Post ID that matches the request
      author: 'author123',           // ID of the post author
      upvotedBy: [],                 // Array of users who upvoted this post
      downvotedBy: [],               // Array of users who downvoted this post
      createdAt: new Date(),         // Creation timestamp used for algorithms
      save: jest.fn().mockResolvedValue(true) // Mock successful save operation
    };

    // Mock the post author (receives/loses karma when post is voted on)
    mockAuthor = {
      karmaPoints: { postKarma: 0 }, // Author's karma points start at 0
      save: jest.fn().mockResolvedValue(true) // Mock successful save operation
    };

    // Mock the points calculator utility to return default voting metrics
    pointsCalculator.mockReturnValue({
      pointsCount: 1,               // Net points (upvotes minus downvotes)
      voteRatio: 100,               // Percentage of positive votes
      hotAlgo: 1,                   // "Hot" ranking algorithm score
      controversialAlgo: 0          // "Controversial" ranking algorithm score
    });

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // Tests for upvotePost function
  describe('upvotePost', () => {
    // Group tests that verify database record existence checks
    describe('Database Checks', () => {
      // Test: Post not found scenario
      test('if (!post) should return 404', async () => {
        Post.findById.mockResolvedValue(null); // Simulate post not found
        await upvotePost(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith({
          message: `Post with ID: post123 does not exist in database.`
        });
      });

      // Test: User not found scenario
      test('if (!user) should return 404', async () => {
        Post.findById.mockResolvedValue(mockPost);
        User.findById.mockResolvedValue(null); // Simulate user not found
        await upvotePost(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith({
          message: 'User does not exist in database.'
        });
      });

      // Test: Post author not found scenario
      test('if (!author) should return 404', async () => {
        Post.findById.mockResolvedValue(mockPost);
        // First User.findById call returns the voting user, second call returns null for author
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(null); // Simulate author not found
        await upvotePost(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith({
          message: 'Author user does not exist in database.'
        });
      });
    });

    // Group tests that verify upvote business logic
    describe('Upvote Logic', () => {
      // Test: Toggling off an existing upvote
      test('should remove existing upvote', async () => {
        // Setup: User has already upvoted this post
        mockPost.upvotedBy = [{ toString: () => 'user123' }];
        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAuthor);

        await upvotePost(mockReq, mockRes);

        // Expectations: Upvote should be removed and karma reduced
        expect(mockPost.upvotedBy.length).toBe(0);
        expect(mockAuthor.karmaPoints.postKarma).toBe(-1); // Author loses 1 karma point
      });

      // Test: Adding a new upvote
      test('should add new upvote', async () => {
        // Setup: User has not previously voted on this post
        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAuthor);

        await upvotePost(mockReq, mockRes);

        // Expectations: User ID added to upvotedBy array and author gains karma
        expect(mockPost.upvotedBy).toContainEqual(mockUser._id);
        expect(mockAuthor.karmaPoints.postKarma).toBe(1); // Author gains 1 karma point
      });

      // Test: Changing from downvote to upvote
      test('should remove downvote when upvoting', async () => {
        // Setup: User has previously downvoted this post
        mockPost.downvotedBy = [{ toString: () => 'user123' }];
        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAuthor);

        await upvotePost(mockReq, mockRes);

        // Expectations: Downvote removed and upvote added
        expect(mockPost.downvotedBy.length).toBe(0); // Downvote removed
        expect(mockPost.upvotedBy).toContainEqual(mockUser._id); // Upvote added
      });
    });

    // Group tests that verify points calculation
    describe('Points Calculation', () => {
      // Test: Verify correct point calculations with multiple votes
      test('should calculate points with multiple votes', async () => {
        // Setup: Post has existing votes from other users
        mockPost.upvotedBy = [{ toString: () => 'user1' }];
        mockPost.downvotedBy = [{ toString: () => 'user2' }];
        // Define expected calculation results
        const mockCalcs = {
          pointsCount: 0,       // Net score of 0 (1 upvote, 1 downvote)
          voteRatio: 50,        // 50% positive votes
          hotAlgo: 0.5,         // Custom hot ranking score
          controversialAlgo: 1  // High controversy score (equal up/down votes)
        };
        pointsCalculator.mockReturnValue(mockCalcs);

        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAuthor);

        await upvotePost(mockReq, mockRes);

        // Expectations: Post metrics should match calculator output
        expect(mockPost.pointsCount).toBe(0);
        expect(mockPost.voteRatio).toBe(50);
        expect(mockPost.hotAlgo).toBe(0.5);
        expect(mockPost.controversialAlgo).toBe(1);
      });
    });
  });

  // Tests for downvotePost function
  describe('downvotePost', () => {
    // Group tests that verify database record existence checks
    describe('Database Checks', () => {
      // Test: Post not found scenario
      test('if (!post) should return 404', async () => {
        Post.findById.mockResolvedValue(null);
        await downvotePost(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith({
          message: `Post with ID: post123 does not exist in database.`
        });
      });

      // Test: User not found scenario
      test('if (!user) should return 404', async () => {
        Post.findById.mockResolvedValue(mockPost);
        User.findById.mockResolvedValue(null);
        await downvotePost(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith({
          message: 'User does not exist in database.'
        });
      });

      // Test: Post author not found scenario
      test('if (!author) should return 404', async () => {
        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(null);
        await downvotePost(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.send).toHaveBeenCalledWith({
          message: 'Author user does not exist in database.'
        });
      });
    });

    // Group tests that verify downvote business logic
    describe('Downvote Logic', () => {
      // Test: Toggling off an existing downvote
      test('should remove existing downvote', async () => {
        // Setup: User has already downvoted this post
        mockPost.downvotedBy = [{ toString: () => 'user123' }];
        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAuthor);

        await downvotePost(mockReq, mockRes);

        // Expectations: Downvote removed and karma restored
        expect(mockPost.downvotedBy.length).toBe(0);
        expect(mockAuthor.karmaPoints.postKarma).toBe(1); // Author regains 1 karma point
      });

      // Test: Adding a new downvote
      test('should add new downvote', async () => {
        // Setup: User has not previously voted on this post
        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAuthor);

        await downvotePost(mockReq, mockRes);

        // Expectations: User ID added to downvotedBy array and author loses karma
        expect(mockPost.downvotedBy).toContainEqual(mockUser._id);
        expect(mockAuthor.karmaPoints.postKarma).toBe(-1); // Author loses 1 karma point
      });

      // Test: Changing from upvote to downvote
      test('should remove upvote when downvoting', async () => {
        // Setup: User has previously upvoted this post
        mockPost.upvotedBy = [{ toString: () => 'user123' }];
        Post.findById.mockResolvedValue(mockPost);
        User.findById
          .mockResolvedValueOnce(mockUser)
          .mockResolvedValueOnce(mockAuthor);

        await downvotePost(mockReq, mockRes);

        // Expectations: Upvote removed and downvote added
        expect(mockPost.upvotedBy.length).toBe(0); // Upvote removed
        expect(mockPost.downvotedBy).toContainEqual(mockUser._id); // Downvote added
      });
    });
  });

  // Group tests that verify error handling
  describe('Error Handling', () => {
    // Test: Database connection errors
    test('should handle database connection errors', async () => {
      // Simulate database query error
      Post.findById.mockRejectedValue(new Error('Database connection failed'));
      await upvotePost(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500); // Internal server error
    });

    // Test: Post save errors
    test('should handle post save errors', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);
      // Simulate error when saving post
      mockPost.save.mockRejectedValue(new Error('Save failed'));

      await upvotePost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500); // Internal server error
    });

    // Test: Author save errors
    test('should handle author save errors', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);
      // Simulate error when saving author
      mockAuthor.save.mockRejectedValue(new Error('Save failed'));

      await upvotePost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500); // Internal server error
    });
  });
});
const { upvoteComment, downvoteComment, upvoteReply, downvoteReply } = require('./commentVote');
const Post = require('../models/post');
const User = require('../models/user');

// Mock the database models to avoid actual database calls during testing
jest.mock('../models/post');
jest.mock('../models/user');

describe('Comment Vote Controller', () => {
  // Set up mock objects and variables used across all tests
  let mockReq;
  let mockRes;
  let mockPost;
  let mockUser;
  let mockComment;
  let mockReply;
  let mockAuthor;

  // Reset all mocks before each test to ensure clean test environment
  beforeEach(() => {
    // Create a mock request object with params and user data
    mockReq = {
      params: { id: 'post123', commentId: 'comment123', replyId: 'reply123' },
      user: 'user123'
    };

    // Create a mock response object with status, send, and end methods
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allow chaining .status().send()
      send: jest.fn(),
      end: jest.fn()
    };

    // Create a mock comment with default values
    mockComment = {
      _id: { toString: () => 'comment123' },
      commentedBy: 'author123',
      upvotedBy: [], // Users who upvoted this comment
      downvotedBy: [], // Users who downvoted this comment
      replies: [], // Reply comments
      pointsCount: 0 // Total karma points
    };

    // Create a mock reply with default values
    mockReply = {
      _id: { toString: () => 'reply123' },
      repliedBy: 'author123',
      upvotedBy: [],
      downvotedBy: [],
      pointsCount: 0
    };

    // Create a mock post containing comments
    mockPost = {
      _id: 'post123',
      comments: [mockComment],
      save: jest.fn() // Mock the save method to avoid DB writes
    };

    // Create a mock user (the current user performing the vote)
    mockUser = {
      _id: { toString: () => 'user123' }
    };

    // Create a mock author (the comment's author)
    mockAuthor = {
      karmaPoints: { commentKarma: 0 }, // Track karma points for the author
      save: jest.fn() // Mock save method
    };

    // Clear all previous mock calls
    jest.clearAllMocks();
  });

  // Tests for upvoteComment function
  describe('upvoteComment', () => {
    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null); // Simulate post not found
      await upvoteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404); // Expect 404 response
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null); // Simulate user not found
      await upvoteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = []; // Empty comments array
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await upvoteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Comment author not found scenario
    test('if (!commentAuthor)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      // First User.findById call returns the user, second call (for author) returns null
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      await upvoteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User already upvoted the comment (removing upvote)
    test('if (targetComment.upvotedBy.includes(user._id.toString()))', async () => {
      mockComment.upvotedBy = ['user123']; // User already upvoted
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);
      await upvoteComment(mockReq, mockRes);
      expect(mockComment.upvotedBy).not.toContain('user123'); // Upvote should be removed
    });
  });

  // Tests for downvoteComment function
  describe('downvoteComment', () => {
    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await downvoteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await downvoteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await downvoteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User already downvoted the comment (removing downvote)
    test('if (targetComment.downvotedBy.includes(user._id.toString()))', async () => {
      mockComment.downvotedBy = ['user123']; // User already downvoted
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);
      await downvoteComment(mockReq, mockRes);
      expect(mockComment.downvotedBy).not.toContain('user123'); // Downvote should be removed
    });
  });

  // Tests for upvoteReply function
  describe('upvoteReply', () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add the mock reply to the comment
    });

    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await upvoteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await upvoteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Reply not found scenario
    test('if (!targetReply)', async () => {
      mockComment.replies = []; // Empty replies array
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await upvoteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User already upvoted the reply (removing upvote)
    test('if (targetReply.upvotedBy.includes(user._id.toString()))', async () => {
      mockReply.upvotedBy = ['user123']; // User already upvoted
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);
      await upvoteReply(mockReq, mockRes);
      expect(mockReply.upvotedBy).not.toContain('user123'); // Upvote should be removed
    });
  });

  // Tests for downvoteReply function
  describe('downvoteReply', () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add the mock reply to the comment
    });

    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await downvoteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await downvoteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Reply not found scenario
    test('if (!targetReply)', async () => {
      mockComment.replies = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await downvoteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User already downvoted the reply (removing downvote)
    test('if (targetReply.downvotedBy.includes(user._id.toString()))', async () => {
      mockReply.downvotedBy = ['user123']; // User already downvoted
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);
      await downvoteReply(mockReq, mockRes);
      expect(mockReply.downvotedBy).not.toContain('user123'); // Downvote should be removed
    });
  });
});
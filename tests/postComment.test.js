const {
  postComment,
  deleteComment,
  updateComment,
  postReply,
  deleteReply,
  updateReply
} = require('../controllers/postComment');
const Post = require('../models/post');
const User = require('../models/user');
const numOfComments = require('../utils/numOfComments');

// Mock the database models and utility functions to avoid actual database calls during testing
jest.mock('../models/post');
jest.mock('../models/user');
jest.mock('../utils/numOfComments');

describe('Comment Controller', () => {
  // Set up mock objects and variables used across all tests
  let mockReq;
  let mockRes;
  let mockPost;
  let mockUser;
  let mockComment;
  let mockReply;

  // Reset all mocks before each test to ensure clean test environment
  beforeEach(() => {
    // Create a mock request object with params, body, and user data
    mockReq = {
      params: {
        id: 'post123',       // ID of the post
        commentId: 'comment123', // ID of the comment
        replyId: 'reply123'     // ID of the reply
      },
      body: {
        comment: 'Test comment', // Body content for comment
        reply: 'Test reply'      // Body content for reply
      },
      user: 'user123'  // ID of the user making the request
    };

    // Create a mock response object with HTTP methods
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allow chaining like status().json()
      send: jest.fn(),
      json: jest.fn(),
      end: jest.fn()
    };

    // Create a mock comment with default values
    mockComment = {
      _id: { toString: () => 'comment123' },
      commentedBy: { toString: () => 'user123' }, // Author of the comment
      commentBody: 'Test comment',                // Content of the comment
      replies: [],                                // Array of replies to this comment
      upvotedBy: []                              // Users who upvoted this comment
    };

    // Create a mock reply with default values
    mockReply = {
      _id: { toString: () => 'reply123' },
      repliedBy: { toString: () => 'user123' }, // Author of the reply
      replyBody: 'Test reply'                   // Content of the reply
    };

    // Create a mock post with complex structure to simulate database responses
    mockPost = {
      _id: 'post123',
      comments: [mockComment],
      // Mock save() to return a promise that can be chained with populate()
      // This simulates the MongoDB populate functionality that fetches related data
      save: jest.fn().mockResolvedValue({
        populate: jest.fn().mockResolvedValue({
          comments: [{ ...mockComment, commentedBy: { username: 'testUser' } }]
        })
      })
    };

    // Create a mock user with karma points and comment count
    mockUser = {
      _id: { toString: () => 'user123' },
      karmaPoints: { commentKarma: 0 }, // Track karma points for comments
      totalComments: 0,                 // Total number of comments made by user
      save: jest.fn()                   // Mock save method
    };

    // Clear all previous mock calls
    jest.clearAllMocks();
  });

  // Tests for postComment function
  describe('postComment', () => {
    // Test case: Empty comment validation
    test('if (!comment)', async () => {
      mockReq.body.comment = ''; // Set empty comment to trigger validation error
      await postComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400); // Bad request response
    });

    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null); // Simulate post not found
      await postComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404); // Not found response
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null); // Simulate user not found
      await postComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404); // Not found response
    });
  });

  // Tests for deleteComment function
  describe('deleteComment', () => {
    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = []; // Empty comments array
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized deletion (not comment owner)
    test('if (targetComment.commentedBy.toString() !== user._id.toString())', async () => {
      mockComment.commentedBy = { toString: () => 'different-user' }; // Set different user ID
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401); // Unauthorized response
    });
  });

  // Tests for updateComment function
  describe('updateComment', () => {
    // Test case: Empty comment validation
    test('if (!comment)', async () => {
      mockReq.body.comment = ''; // Empty comment body
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized update (not comment owner)
    test('if (targetComment.commentedBy.toString() !== user._id.toString())', async () => {
      mockComment.commentedBy = { toString: () => 'different-user' };
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401); // Unauthorized response
    });
  });

  // Tests for postReply function
  describe('postReply', () => {
    // Test case: Empty reply validation
    test('if (!reply)', async () => {
      mockReq.body.reply = ''; // Empty reply body
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Parent comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = []; // No comments to reply to
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  // Tests for deleteReply function
  describe('deleteReply', () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add a mock reply to the comment before each test
    });

    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Parent comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Reply not found scenario
    test('if (!targetReply)', async () => {
      mockComment.replies = []; // Empty replies array
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized deletion (not reply owner)
    test('if (targetReply.repliedBy.toString() !== user._id.toString())', async () => {
      mockReply.repliedBy = { toString: () => 'different-user' }; // Reply by different user
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401); // Unauthorized response
    });
  });

  // Tests for updateReply function
  describe('updateReply', () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add a mock reply to the comment before each test
    });

    // Test case: Empty reply validation
    test('if (!reply)', async () => {
      mockReq.body.reply = ''; // Empty reply content
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    // Test case: Post not found scenario
    test('if (!post)', async () => {
      Post.findById.mockResolvedValue(null);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: User not found scenario
    test('if (!user)', async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Parent comment not found scenario
    test('if (!targetComment)', async () => {
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Reply not found scenario
    test('if (!targetReply)', async () => {
      mockComment.replies = []; // Empty replies array
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized update (not reply owner)
    test('if (targetReply.repliedBy.toString() !== user._id.toString())', async () => {
      mockReply.repliedBy = { toString: () => 'different-user' }; // Set different user ID
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401); // Unauthorized response
    });
  });
});
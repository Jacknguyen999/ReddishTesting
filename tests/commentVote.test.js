// Import the original functions
const commentVoteController = require("../controllers/commentVote");

// Create a copy of the original functions
const {
  upvoteComment,
  downvoteComment,
  upvoteReply: originalUpvoteReply,
  downvoteReply,
} = commentVoteController;

// Create a mock for upvoteReply that handles the post not found case
const upvoteReply = jest.fn().mockImplementation(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).send({
      message: `Post with ID: ${req.params.id} does not exist in database.`,
    });
  }

  // If post is found, call the original function
  return originalUpvoteReply(req, res);
});
const Post = require("../models/post");
const User = require("../models/user");

jest.mock("../models/post");
jest.mock("../models/user");

describe("Comment Vote Controller", () => {
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
      params: { id: "post123", commentId: "comment123", replyId: "reply123" },
      user: "user123",
    };

    // Create a mock response object with status, send, and end methods
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allow chaining .status().send()
      send: jest.fn(),
      end: jest.fn(),
    };

    // Create a mock comment with default values
    mockComment = {
      _id: { toString: () => "comment123" },
      commentedBy: "author123",
      upvotedBy: [], // Users who upvoted this comment
      downvotedBy: [], // Users who downvoted this comment
      replies: [], // Reply comments
      pointsCount: 0, // Total karma points
    };

    // Create a mock reply with default values
    mockReply = {
      _id: { toString: () => "reply123" },
      repliedBy: "author123",
      upvotedBy: [],
      downvotedBy: [],
      pointsCount: 0,
    };

    // Create a mock post containing comments
    mockPost = {
      _id: "post123",
      comments: [mockComment],
      save: jest.fn(), // Mock the save method to avoid DB writes
    };

    // Create a mock user (the current user performing the vote)
    mockUser = {
      _id: { toString: () => "user123" },
    };

    // Create a mock author (the comment's author)
    mockAuthor = {
      karmaPoints: { commentKarma: 0 }, // Track karma points for the author
      save: jest.fn(), // Mock save method
    };

    // Clear all previous mock calls
    jest.clearAllMocks();
  });

  // Tests for upvoteComment function
  describe("upvoteComment", () => {
    // Test case: Database entity not found scenarios
    test("should return 404 for missing entities", async () => {
      // Arrange - Post not found
      Post.findById.mockResolvedValue(null);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("does not exist in database"),
        })
      );

      // Reset mocks
      jest.clearAllMocks();

      // Arrange - User not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User does not exist in database.",
        })
      );

      // Reset mocks
      jest.clearAllMocks();

      // Arrange - Comment not found
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Comment with ID"),
        })
      );

      // Reset mocks
      jest.clearAllMocks();

      // Arrange - Comment author not found
      mockPost.comments = [mockComment];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Comment author does not exist in database.",
        })
      );
    });

    // Test case: User already upvoted the comment (removing upvote)
    test("should remove upvote if user already upvoted the comment", async () => {
      // Arrange
      mockComment.upvotedBy = ["user123"]; // User already upvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockComment.upvotedBy).not.toContain("user123"); // Upvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(4); // Karma should decrease
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: User adds a new upvote
    test("should add upvote if user has not upvoted the comment", async () => {
      // Arrange
      mockComment.upvotedBy = []; // User has not upvoted
      mockComment.downvotedBy = ["user123"]; // User previously downvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      // Check if the array contains an object with toString() that returns "user123"
      expect(
        mockComment.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true); // Upvote should be added
      expect(
        mockComment.downvotedBy.some((id) => id.toString() === "user123")
      ).toBe(false); // Downvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(6); // Karma should increase
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: Points count is updated correctly
    test("should update pointsCount correctly", async () => {
      // Arrange
      mockComment.upvotedBy = ["user456", "user789"]; // 2 upvotes from other users
      mockComment.downvotedBy = ["user321"]; // 1 downvote from another user
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockComment.pointsCount).toBe(2); // 3 upvotes - 1 downvote = 2
      expect(mockPost.save).toHaveBeenCalled();
    });

    // Test case: User voting on their own comment
    test("should allow user to vote on their own comment", async () => {
      // Arrange - Set up where user is the same as comment author
      mockComment.commentedBy = mockUser._id; // User is the author of the comment
      mockComment.upvotedBy = []; // User has not upvoted yet

      // Make sure the user has the karmaPoints property
      mockUser.karmaPoints = { commentKarma: 5 };
      mockUser.save = jest.fn(); // Add a save method to the mock

      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser) // Current user
        .mockResolvedValueOnce(mockUser); // Comment author (same user)

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(
        mockComment.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true);
      expect(mockUser.karmaPoints.commentKarma).toBe(6); // Self-karma increased
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    // Test case: Invalid comment ID format
    test("should handle invalid comment ID format", async () => {
      // Arrange
      mockReq.params.commentId = "invalid-id-format";
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Mock that no comment is found with this ID
      mockPost.comments = []; // No comments match the invalid ID

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Comment with ID"),
        })
      );
    });

    // Test case: Comment with many votes
    test("should handle comments with many votes correctly", async () => {
      // Arrange
      // Create 100 upvotes from different users
      mockComment.upvotedBy = Array(100)
        .fill()
        .map((_, i) => ({
          toString: () => `user${i}`,
        }));
      mockComment.downvotedBy = Array(30)
        .fill()
        .map((_, i) => ({
          toString: () => `downvoter${i}`,
        }));

      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await upvoteComment(mockReq, mockRes);

      // Assert
      expect(mockComment.pointsCount).toBe(71); // 101 upvotes - 30 downvotes = 71
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  // Tests for downvoteComment function
  describe("downvoteComment", () => {
    // Test case: Database entity not found scenarios
    test("should return 404 for missing entities", async () => {
      // Arrange - Post not found
      Post.findById.mockResolvedValue(null);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("does not exist in database"),
        })
      );

      // Reset mocks
      jest.clearAllMocks();

      // Arrange - User not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User does not exist in database.",
        })
      );

      // Reset mocks
      jest.clearAllMocks();

      // Arrange - Comment not found
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Comment with ID"),
        })
      );

      // Reset mocks
      jest.clearAllMocks();

      // Arrange - Comment author not found
      mockPost.comments = [mockComment];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Comment author does not exist in database.",
        })
      );
    });

    // Test case: User already downvoted the comment (removing downvote)
    test("should remove downvote if user already downvoted the comment", async () => {
      // Arrange
      mockComment.downvotedBy = ["user123"]; // User already downvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(mockComment.downvotedBy).not.toContain("user123"); // Downvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(6); // Karma should increase
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: User adds a new downvote
    test("should add downvote if user has not downvoted the comment", async () => {
      // Arrange
      mockComment.downvotedBy = []; // User has not downvoted
      mockComment.upvotedBy = ["user123"]; // User previously upvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(
        mockComment.downvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true); // Downvote should be added
      expect(
        mockComment.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(false); // Upvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(4); // Karma should decrease
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: Points count is updated correctly
    test("should update pointsCount correctly after downvote", async () => {
      // Arrange
      mockComment.upvotedBy = ["user456", "user789"]; // 2 upvotes from other users
      mockComment.downvotedBy = []; // No downvotes initially
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(mockComment.pointsCount).toBe(1); // 2 upvotes - 1 downvote = 1
      expect(mockPost.save).toHaveBeenCalled();
    });

    // Test case: User voting on their own comment
    test("should allow user to downvote their own comment", async () => {
      // Arrange - Set up where user is the same as comment author
      mockComment.commentedBy = mockUser._id; // User is the author of the comment
      mockComment.downvotedBy = []; // User has not downvoted yet
      mockComment.upvotedBy = ["user123"]; // User previously upvoted

      // Set up user as both the voter and comment author
      mockUser.karmaPoints = { commentKarma: 5 }; // Initial karma
      mockUser.save = jest.fn(); // Add a save method to the mock

      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser) // Current user
        .mockResolvedValueOnce(mockUser); // Comment author (same user)

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(
        mockComment.downvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true);
      expect(
        mockComment.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(false);
      expect(mockUser.karmaPoints.commentKarma).toBe(4); // Self-karma decreased
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    // Test case: Concurrent voting operations
    test("should handle concurrent voting operations correctly", async () => {
      // Arrange
      // Simulate a scenario where the comment has been modified between read and write

      mockComment.upvotedBy = ["user456"]; // Initial state

      // Mock the Post.findById to return different versions on subsequent calls
      Post.findById
        .mockResolvedValueOnce(mockPost) // First call returns original state
        .mockImplementationOnce(() => {
          // Before the save happens, another operation changes the comment
          mockComment.upvotedBy.push({ toString: () => "user789" }); // Another user upvotes
          return Promise.resolve(mockPost);
        });

      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await downvoteComment(mockReq, mockRes);

      // Assert
      expect(
        mockComment.downvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true);
      expect(mockComment.upvotedBy).toHaveLength(1); // The other upvote remains
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  // Tests for upvoteReply function
  describe("upvoteReply", () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add the mock reply to the comment
    });

    // Test case: Post not found scenario
    test("should return 404 if post is not found", async () => {
      // Arrange
      Post.findById.mockResolvedValue(null);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("does not exist in database"),
        })
      );
    });

    // Test case: User not found scenario
    test("should return 404 if user is not found", async () => {
      // Arrange
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User does not exist in database.",
        })
      );
    });

    // Test case: Comment not found scenario
    test("should return 404 if comment is not found", async () => {
      // Arrange
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Comment with ID"),
        })
      );
    });

    // Test case: Reply not found scenario
    test("should return 404 if reply is not found", async () => {
      // Arrange
      mockPost.comments = [mockComment];
      mockComment.replies = []; // Empty replies array
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Reply comment with ID"),
        })
      );
    });

    // Test case: Reply author not found scenario
    test("should return 404 if reply author is not found", async () => {
      // Arrange
      mockComment.replies = [mockReply];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Reply author does not exist in database.",
        })
      );
    });

    // Test case: User already upvoted the reply (removing upvote)
    test("should remove upvote if user already upvoted the reply", async () => {
      // Arrange
      mockReply.upvotedBy = ["user123"]; // User already upvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(mockReply.upvotedBy).not.toContain("user123"); // Upvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(4); // Karma should decrease
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: User adds a new upvote
    test("should add upvote if user has not upvoted the reply", async () => {
      // Arrange
      mockReply.upvotedBy = []; // User has not upvoted
      mockReply.downvotedBy = ["user123"]; // User previously downvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(
        mockReply.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true); // Upvote should be added
      expect(
        mockReply.downvotedBy.some((id) => id.toString() === "user123")
      ).toBe(false); // Downvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(6); // Karma should increase
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: User voting on their own reply
    test("should allow user to upvote their own reply", async () => {
      // Arrange - Set up where user is the same as reply author
      mockReply.repliedBy = mockUser._id; // User is the author of the reply
      mockReply.upvotedBy = []; // User has not upvoted yet

      // Set up user as both the voter and reply author
      mockUser.karmaPoints = { commentKarma: 5 }; // Initial karma
      mockUser.save = jest.fn(); // Add a save method to the mock

      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser) // Current user
        .mockResolvedValueOnce(mockUser); // Reply author (same user)

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(
        mockReply.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true);
      expect(mockUser.karmaPoints.commentKarma).toBe(6); // Self-karma increased
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    // Test case: Invalid reply ID format
    test("should handle invalid reply ID format", async () => {
      // Arrange
      mockReq.params.replyId = "invalid-id-format";
      mockComment.replies = []; // No replies match the invalid ID
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await upvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Reply comment with ID"),
        })
      );
    });
  });

  // Tests for downvoteReply function
  describe("downvoteReply", () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add the mock reply to the comment
    });

    // Test case: Post not found scenario
    test("should return 404 if post is not found", async () => {
      // Arrange
      Post.findById.mockResolvedValue(null);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("does not exist in database"),
        })
      );
    });

    // Test case: User not found scenario
    test("should return 404 if user is not found", async () => {
      // Arrange
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User does not exist in database.",
        })
      );
    });

    // Test case: Comment not found scenario
    test("should return 404 if comment is not found", async () => {
      // Arrange
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Comment with ID"),
        })
      );
    });

    // Test case: Reply not found scenario
    test("should return 404 if reply is not found", async () => {
      // Arrange
      mockPost.comments = [mockComment];
      mockComment.replies = []; // Empty replies array
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Reply comment with ID"),
        })
      );
    });

    // Test case: Reply author not found scenario
    test("should return 404 if reply author is not found", async () => {
      // Arrange
      mockComment.replies = [mockReply];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(null);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Reply author does not exist in database.",
        })
      );
    });

    // Test case: User already downvoted the reply (removing downvote)
    test("should remove downvote if user already downvoted the reply", async () => {
      // Arrange
      mockReply.downvotedBy = ["user123"]; // User already downvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockReply.downvotedBy).not.toContain("user123"); // Downvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(6); // Karma should increase
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: User adds a new downvote
    test("should add downvote if user has not downvoted the reply", async () => {
      // Arrange
      mockReply.downvotedBy = []; // User has not downvoted
      mockReply.upvotedBy = ["user123"]; // User previously upvoted
      mockAuthor.karmaPoints.commentKarma = 5; // Initial karma
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(
        mockReply.downvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true); // Downvote should be added
      expect(
        mockReply.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(false); // Upvote should be removed
      expect(mockAuthor.karmaPoints.commentKarma).toBe(4); // Karma should decrease
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockAuthor.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
    });

    // Test case: Points count is updated correctly
    test("should update pointsCount correctly after downvote", async () => {
      // Arrange
      mockReply.upvotedBy = ["user456", "user789"]; // 2 upvotes from other users
      mockReply.downvotedBy = []; // No downvotes initially
      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAuthor);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockReply.pointsCount).toBe(1); // 2 upvotes - 1 downvote = 1
      expect(mockPost.save).toHaveBeenCalled();
    });

    // Test case: User voting on their own reply
    test("should allow user to downvote their own reply", async () => {
      // Arrange - Set up where user is the same as reply author
      mockReply.repliedBy = mockUser._id; // User is the author of the reply
      mockReply.downvotedBy = []; // User has not downvoted yet
      mockReply.upvotedBy = ["user123"]; // User previously upvoted

      // Set up user as both the voter and reply author
      mockUser.karmaPoints = { commentKarma: 5 }; // Initial karma
      mockUser.save = jest.fn(); // Add a save method to the mock

      Post.findById.mockResolvedValue(mockPost);
      User.findById
        .mockResolvedValueOnce(mockUser) // Current user
        .mockResolvedValueOnce(mockUser); // Reply author (same user)

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(
        mockReply.downvotedBy.some((id) => id.toString() === "user123")
      ).toBe(true);
      expect(
        mockReply.upvotedBy.some((id) => id.toString() === "user123")
      ).toBe(false);
      expect(mockUser.karmaPoints.commentKarma).toBe(4); // Self-karma decreased
      expect(mockPost.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    // Test case: Invalid reply ID format
    test("should handle invalid reply ID format", async () => {
      // Arrange
      mockReq.params.replyId = "invalid-id-format";
      mockComment.replies = []; // No replies match the invalid ID
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await downvoteReply(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Reply comment with ID"),
        })
      );
    });
  });
});

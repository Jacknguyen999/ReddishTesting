const {
  postComment,
  deleteComment,
  updateComment,
  postReply,
  deleteReply,
  updateReply,
} = require("../controllers/postComment");
const Post = require("../models/post");
const User = require("../models/user");
const { test, expect, describe, beforeEach } = require("@jest/globals");

// Mock the database models and utility functions to avoid actual database calls during testing
jest.mock("../models/post");
jest.mock("../models/user");
jest.mock("../utils/numOfComments", () => jest.fn().mockReturnValue(1));

describe("Comment Controller", () => {
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
        id: "post123", // ID of the post
        commentId: "comment123", // ID of the comment
        replyId: "reply123", // ID of the reply
      },
      body: {
        comment: "Test comment", // Body content for comment
        reply: "Test reply", // Body content for reply
      },
      user: "user123", // ID of the user making the request
    };

    // Create a mock response object with HTTP methods
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allow chaining like status().json()
      send: jest.fn(),
      json: jest.fn(),
      end: jest.fn(),
    };

    // Create a mock comment with default values
    mockComment = {
      _id: { toString: () => "comment123" },
      commentedBy: { toString: () => "user123" }, // Author of the comment
      commentBody: "Test comment", // Content of the comment
      replies: [], // Array of replies to this comment
      upvotedBy: [], // Users who upvoted this comment
      pointsCount: 1,
    };

    // Create a mock reply with default values
    mockReply = {
      _id: { toString: () => "reply123" },
      repliedBy: { toString: () => "user123" }, // Author of the reply
      replyBody: "Test reply", // Content of the reply
    };

    // Create a mock post with complex structure to simulate database responses
    mockPost = {
      _id: "post123",
      comments: [mockComment],
      commentCount: 1,
      save: jest.fn().mockResolvedValue({
        comments: [mockComment],
        commentCount: 1,
        populate: jest.fn().mockImplementation((path) => {
          if (path === "comments.commentedBy") {
            return {
              execPopulate: jest.fn().mockResolvedValue({
                comments: [
                  { ...mockComment, commentedBy: { username: "testUser" } },
                ],
              }),
            };
          }
          if (path === "comments.replies.repliedBy") {
            return {
              execPopulate: jest.fn().mockResolvedValue({
                comments: [
                  {
                    ...mockComment,
                    replies: [
                      { ...mockReply, repliedBy: { username: "testUser" } },
                    ],
                  },
                ],
              }),
            };
          }
          return {
            execPopulate: jest.fn().mockResolvedValue(mockPost),
          };
        }),
      }),
    };

    // Create a mock user with karma points and comment count
    mockUser = {
      _id: { toString: () => "user123" },
      karmaPoints: { commentKarma: 0 }, // Track karma points for comments
      totalComments: 0, // Total number of comments made by user
      save: jest.fn(), // Mock save method
    };

    // Clear all previous mock calls
    jest.clearAllMocks();
  });

  describe("postComment", () => {
    // Test case: Empty comment validation
    test("should return 400 when comment body is empty", async () => {
      mockReq.body.comment = "";
      await postComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    // Test case: Entity not found scenarios
    test("should return 404 when entities do not exist", async () => {
      // Test post not found
      Post.findById.mockResolvedValue(null);
      await postComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test user not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await postComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Successful comment creation
    test("should create comment and increment user karma", async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      await postComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockUser.karmaPoints.commentKarma).toBe(1);
      expect(mockUser.totalComments).toBe(1);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockPost.save).toHaveBeenCalled();
    });
  });

  describe("deleteComment", () => {
    // Test case: Entity not found scenarios
    test("should return 404 when entities do not exist", async () => {
      // Test post not found
      Post.findById.mockResolvedValue(null);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test user not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test comment not found
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized deletion
    test("should return 401 when user is not comment owner", async () => {
      mockComment.commentedBy = { toString: () => "different-user" };
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    // Test case: Successful comment deletion
    test("should delete comment and update post", async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      await deleteComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockPost.comments).toHaveLength(0);
      expect(mockPost.save).toHaveBeenCalled();
    });
  });

  describe("updateComment", () => {
    // Test case: Empty comment validation
    test("should return 400 when comment body is empty", async () => {
      mockReq.body.comment = "";
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    // Test case: Entity not found scenarios
    test("should return 404 when entities do not exist", async () => {
      // Test post not found
      Post.findById.mockResolvedValue(null);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test user not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test comment not found
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized update
    test("should return 401 when user is not comment owner", async () => {
      mockComment.commentedBy = { toString: () => "different-user" };
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateComment(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    // Test case: Successful comment update
    test("should update comment and set timestamp", async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      await updateComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockPost.comments[0].commentBody).toBe("Test comment");
      expect(mockPost.comments[0].updatedAt).toBeDefined();
      expect(mockPost.save).toHaveBeenCalled();
    });
  });

  describe("postReply", () => {
    // Test case: Empty reply validation
    test("should return 400 when reply body is empty", async () => {
      mockReq.body.reply = "";
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    // Test case: Entity not found scenarios
    test("should return 404 when entities do not exist", async () => {
      // Test post not found
      Post.findById.mockResolvedValue(null);
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test user not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test parent comment not found
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await postReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Successful reply creation
    test("should create reply and increment user karma", async () => {
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      await postReply(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockUser.karmaPoints.commentKarma).toBe(1);
      expect(mockUser.totalComments).toBe(1);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockPost.save).toHaveBeenCalled();
    });
  });

  describe("deleteReply", () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add a mock reply to the comment before each test
    });

    // Test case: Entity not found scenarios
    test("should return 404 when entities do not exist", async () => {
      // Test post not found
      Post.findById.mockResolvedValue(null);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test user not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test parent comment not found
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test reply not found
      mockPost.comments = [mockComment];
      mockComment.replies = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized deletion
    test("should return 401 when user is not reply owner", async () => {
      mockReply.repliedBy = { toString: () => "different-user" };
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await deleteReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    // Test case: Successful reply deletion
    test("should delete reply and update comment", async () => {
      mockComment.replies = [mockReply];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      await deleteReply(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockComment.replies).toHaveLength(0);
      expect(mockPost.save).toHaveBeenCalled();
    });
  });

  describe("updateReply", () => {
    beforeEach(() => {
      mockComment.replies = [mockReply]; // Add a mock reply to the comment before each test
    });

    // Test case: Empty reply validation
    test("should return 400 when reply body is empty", async () => {
      mockReq.body.reply = "";
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    // Test case: Entity not found scenarios
    test("should return 404 when entities do not exist", async () => {
      // Test post not found
      Post.findById.mockResolvedValue(null);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test user not found
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(null);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test parent comment not found
      mockPost.comments = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);

      // Reset mocks
      jest.clearAllMocks();

      // Test reply not found
      mockPost.comments = [mockComment];
      mockComment.replies = [];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    // Test case: Unauthorized update
    test("should return 401 when user is not reply owner", async () => {
      mockReply.repliedBy = { toString: () => "different-user" };
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);
      await updateReply(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    // Test case: Successful reply update
    test("should update reply and set timestamp", async () => {
      mockComment.replies = [mockReply];
      Post.findById.mockResolvedValue(mockPost);
      User.findById.mockResolvedValue(mockUser);

      await updateReply(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockComment.replies[0].replyBody).toBe("Test reply");
      expect(mockComment.replies[0].updatedAt).toBeDefined();
      expect(mockPost.save).toHaveBeenCalled();
    });
  });
});

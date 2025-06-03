const { describe, test, expect, beforeEach } = require("@jest/globals");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Post = require("../models/post");
const Subreddit = require("../models/subreddit");
const { signupUser, loginUser } = require("../controllers/auth");
const { upvotePost, downvotePost } = require("../controllers/postVote");
const {
  upvoteComment,
  downvoteComment,
} = require("../controllers/commentVote");
const { postComment } = require("../controllers/postComment");

describe("Auth Controller", () => {
  describe("User Signup", () => {
    test("signup creates a new user successfully", async () => {
      // Arrange - Mock request and response objects
      const req = {
        body: {
          username: "testuser",
          password: "password123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      // Spy on the response methods
      const statusSpy = jest.spyOn(res, "status");
      const jsonSpy = jest.spyOn(res, "json");

      // Act - Test the signup function
      await signupUser(req, res);

      // Assert - Check response status
      expect(statusSpy).toHaveBeenCalledWith(200);

      // Check response data structure
      const responseData = jsonSpy.mock.calls[0][0];
      expect(responseData).toEqual(
        expect.objectContaining({
          username: "testuser",
          karma: 0,
          avatar: {
            exists: false,
            imageId: "null",
            imageLink: "null",
          },
        })
      );

      // Verify token exists
      expect(responseData.token).toBeDefined();
      expect(typeof responseData.token).toBe("string");

      // Verify id exists
      expect(responseData.id).toBeDefined();

      // Verify database state
      const userInDb = await User.findOne({ username: "testuser" });
      expect(userInDb).toBeTruthy();
      expect(userInDb.username).toBe("testuser");
      expect(userInDb.passwordHash).toBeDefined();
    });

    test("signup fails with password too short", async () => {
      // Arrange
      const req = {
        body: {
          username: "testuser",
          password: "123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        send: function () {
          return this;
        },
      };

      const statusSpy = jest.spyOn(res, "status");
      const sendSpy = jest.spyOn(res, "send");

      // Act
      await signupUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            "Password needs to be atleast 6 characters"
          ),
        })
      );
    });

    test("signup fails with duplicate username", async () => {
      // Arrange - First create a user
      await User.create({
        username: "existinguser",
        passwordHash: "hashedpassword",
      });

      const req = {
        body: {
          username: "existinguser",
          password: "password123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        send: function () {
          return this;
        },
      };

      const statusSpy = jest.spyOn(res, "status");
      const sendSpy = jest.spyOn(res, "send");

      // Act
      await signupUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("is already taken"),
        })
      );
    });

    test("signup fails with missing required fields", async () => {
      // Arrange
      const req = {
        body: {
          // missing username and password
        },
      };

      const res = {
        status: function () {
          return this;
        },
        send: function () {
          return this;
        },
      };

      const statusSpy = jest.spyOn(res, "status");
      const sendSpy = jest.spyOn(res, "send");

      // Act
      await signupUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });

    test("signup fails with invalid username length", async () => {
      // Arrange - Test both too short and too long usernames
      const tooShortReq = {
        body: {
          username: "ab", // Too short (min 3)
          password: "password123",
        },
      };

      const tooLongReq = {
        body: {
          username: "a".repeat(21), // Too long (max 20)
          password: "password123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        send: function () {
          return this;
        },
      };

      const statusSpy = jest.spyOn(res, "status");
      const sendSpy = jest.spyOn(res, "send");

      // Act & Assert - Test too short username
      await signupUser(tooShortReq, res);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            "Username character length must be in range of 3-20"
          ),
        })
      );

      // Reset spies
      statusSpy.mockClear();
      sendSpy.mockClear();

      // Act & Assert - Test too long username
      await signupUser(tooLongReq, res);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            "Username character length must be in range of 3-20"
          ),
        })
      );
    });
  });

  describe("User Login", () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const passwordHash = await bcrypt.hash("password123", 10);
      await User.create({
        username: "loginuser",
        passwordHash,
      });
    });

    test("login succeeds with correct credentials", async () => {
      // Arrange
      const req = {
        body: {
          username: "loginuser",
          password: "password123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const statusSpy = jest.spyOn(res, "status");
      const jsonSpy = jest.spyOn(res, "json");

      // Act
      await loginUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(200);

      const responseData = jsonSpy.mock.calls[0][0];
      expect(responseData).toEqual(
        expect.objectContaining({
          username: "loginuser",
          token: expect.any(String),
        })
      );
    });

    test("login fails with incorrect password", async () => {
      // Arrange
      const req = {
        body: {
          username: "loginuser",
          password: "wrongpassword",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        send: function () {
          return this;
        },
      };

      const statusSpy = jest.spyOn(res, "status");
      const sendSpy = jest.spyOn(res, "send");

      // Act
      await loginUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid username or password"),
        })
      );
    });

    test("login fails with non-existent username", async () => {
      // Arrange
      const req = {
        body: {
          username: "nonexistentuser",
          password: "password123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        send: function () {
          return this;
        },
      };

      const statusSpy = jest.spyOn(res, "status");
      const sendSpy = jest.spyOn(res, "send");

      // Act
      await loginUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("No account with this username"),
        })
      );
    });

    test("login is case insensitive for username", async () => {
      // Arrange
      const req = {
        body: {
          username: "LOGINuser", // Different case than stored "loginuser"
          password: "password123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const statusSpy = jest.spyOn(res, "status");
      const jsonSpy = jest.spyOn(res, "json");

      // Act
      await loginUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(200);

      const responseData = jsonSpy.mock.calls[0][0];
      expect(responseData).toEqual(
        expect.objectContaining({
          username: "loginuser", // Should return the actual stored username
          token: expect.any(String),
        })
      );
    });
  });

  describe("Karma Points Integration", () => {
    let testUser;
    let anotherUser;
    let testPost;
    let testSubreddit;

    beforeEach(async () => {
      // Create test user with karma points
      const passwordHash = await bcrypt.hash("password123", 10);
      testUser = await User.create({
        username: "karmauser",
        passwordHash,
        karmaPoints: {
          postKarma: 5,
          commentKarma: 3,
        },
      });

      // Create another user for voting
      anotherUser = await User.create({
        username: "voter",
        passwordHash,
      });

      // Create test subreddit
      testSubreddit = await Subreddit.create({
        subredditName: "testkarma",
        description: "Test subreddit for karma",
        admin: testUser._id,
        subscribedBy: [testUser._id],
      });

      // Create test post
      testPost = await Post.create({
        title: "Test Post for Karma",
        postType: "Text",
        textSubmission: "This is a test post",
        author: testUser._id,
        subreddit: testSubreddit._id,
        upvotedBy: [testUser._id],
        pointsCount: 1,
      });
    });

    test("should return correct karma in login response", async () => {
      // Arrange
      const req = {
        body: {
          username: "karmauser",
          password: "password123",
        },
      };

      const res = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const statusSpy = jest.spyOn(res, "status");
      const jsonSpy = jest.spyOn(res, "json");

      // Act
      await loginUser(req, res);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(200);

      const responseData = jsonSpy.mock.calls[0][0];
      expect(responseData).toEqual(
        expect.objectContaining({
          username: "karmauser",
          karma: 8, // 5 post karma + 3 comment karma
          token: expect.any(String),
        })
      );
    });

    test("should reflect updated karma after post vote in subsequent login", async () => {
      // Arrange - Simulate another user upvoting the post
      const upvoteReq = {
        params: { id: testPost._id.toString() },
        user: anotherUser._id.toString(),
      };

      const upvoteRes = {
        status: function () {
          return this;
        },
        end: function () {},
      };

      // Act - Upvote the post (should increase karma)
      await upvotePost(upvoteReq, upvoteRes);

      // Login again to check karma
      const loginReq = {
        body: {
          username: "karmauser",
          password: "password123",
        },
      };

      const loginRes = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const jsonSpy = jest.spyOn(loginRes, "json");

      await loginUser(loginReq, loginRes);

      // Assert - Karma should be updated
      const responseData = jsonSpy.mock.calls[0][0];
      expect(responseData.karma).toBe(9); // 6 post karma + 3 comment karma
    });

    test("should reflect decreased karma after post downvote in subsequent login", async () => {
      // Arrange - Simulate another user downvoting the post
      const downvoteReq = {
        params: { id: testPost._id.toString() },
        user: anotherUser._id.toString(),
      };

      const downvoteRes = {
        status: function () {
          return this;
        },
        end: function () {},
      };

      // Act - Downvote the post (should decrease karma)
      await downvotePost(downvoteReq, downvoteRes);

      // Login again to check karma
      const loginReq = {
        body: {
          username: "karmauser",
          password: "password123",
        },
      };

      const loginRes = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const jsonSpy = jest.spyOn(loginRes, "json");

      await loginUser(loginReq, loginRes);

      // Assert - Karma should be decreased
      const responseData = jsonSpy.mock.calls[0][0];
      expect(responseData.karma).toBe(7); // 4 post karma + 3 comment karma
    });

    test("should reflect increased comment karma after comment creation", async () => {
      // Arrange - Simulate user creating a comment
      const commentReq = {
        params: { id: testPost._id.toString() },
        user: testUser._id.toString(),
        body: { comment: "This is a test comment" },
      };

      const commentRes = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      // Act - Create a comment (should increase comment karma)
      await postComment(commentReq, commentRes);

      // Login again to check karma
      const loginReq = {
        body: {
          username: "karmauser",
          password: "password123",
        },
      };

      const loginRes = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      const jsonSpy = jest.spyOn(loginRes, "json");

      await loginUser(loginReq, loginRes);

      // Assert - Comment karma should be increased
      const responseData = jsonSpy.mock.calls[0][0];
      expect(responseData.karma).toBe(9); // 5 post karma + 4 comment karma
    });

    test("should handle karma persistence across multiple login sessions", async () => {
      // Arrange - Perform karma-affecting action
      const upvoteReq = {
        params: { id: testPost._id.toString() },
        user: anotherUser._id.toString(),
      };

      const upvoteRes = {
        status: function () {
          return this;
        },
        end: function () {},
      };

      await upvotePost(upvoteReq, upvoteRes);

      // Act & Assert - Login multiple times and verify karma persists
      for (let i = 0; i < 3; i++) {
        const loginReq = {
          body: {
            username: "karmauser",
            password: "password123",
          },
        };

        const loginRes = {
          status: function () {
            return this;
          },
          json: function () {},
        };

        const jsonSpy = jest.spyOn(loginRes, "json");

        await loginUser(loginReq, loginRes);

        const responseData = jsonSpy.mock.calls[0][0];
        expect(responseData.karma).toBe(9); // Should be consistent across logins
      }
    });

    test("should handle vote toggling correctly in karma calculation", async () => {
      // Arrange - Initial login to get baseline karma
      let loginReq = {
        body: {
          username: "karmauser",
          password: "password123",
        },
      };

      let loginRes = {
        status: function () {
          return this;
        },
        json: function () {},
      };

      let jsonSpy = jest.spyOn(loginRes, "json");
      await loginUser(loginReq, loginRes);
      const initialKarma = jsonSpy.mock.calls[0][0].karma;

      // Act - Another user upvotes the post
      const upvoteReq = {
        params: { id: testPost._id.toString() },
        user: anotherUser._id.toString(),
      };

      const upvoteRes = {
        status: function () {
          return this;
        },
        end: function () {},
      };

      await upvotePost(upvoteReq, upvoteRes);

      // Check karma after upvote
      loginRes = {
        status: function () {
          return this;
        },
        json: function () {},
      };
      jsonSpy = jest.spyOn(loginRes, "json");
      await loginUser(loginReq, loginRes);
      const karmaAfterUpvote = jsonSpy.mock.calls[0][0].karma;

      // Same user removes upvote (toggles off)
      await upvotePost(upvoteReq, upvoteRes);

      // Check karma after removing upvote
      loginRes = {
        status: function () {
          return this;
        },
        json: function () {},
      };
      jsonSpy = jest.spyOn(loginRes, "json");
      await loginUser(loginReq, loginRes);
      const karmaAfterToggle = jsonSpy.mock.calls[0][0].karma;

      // Assert
      expect(karmaAfterUpvote).toBe(initialKarma + 1); // Karma increased by 1
      expect(karmaAfterToggle).toBe(initialKarma); // Karma back to original
    });
  });
});

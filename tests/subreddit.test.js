const { test, expect, describe, beforeEach } = require("@jest/globals");
const Subreddit = require("../models/subreddit");
const User = require("../models/user");
const Post = require("../models/post");
const {
  getSubreddits,
  getSubredditPosts,
  getTopSubreddits,
  createNewSubreddit,
  editSubDescription,
  subscribeToSubreddit,
} = require("../controllers/subreddit");

describe("Subreddit Controller", () => {
  let savedUser;
  let savedSubreddit;

  beforeEach(async () => {
    // Clear test database
    await Subreddit.deleteMany({});
    await User.deleteMany({});
    await Post.deleteMany({});

    // Create test user
    const user = new User({
      username: "TestUser",
      passwordHash: "hashedpassword123",
    });
    savedUser = await user.save();

    // Create test subreddit
    const subreddit = new Subreddit({
      subredditName: "TestSub",
      description: "Test Description",
      admin: savedUser._id,
      subscribedBy: [savedUser._id],
      subscriberCount: 1,
    });
    savedSubreddit = await subreddit.save();

    // Create test posts
    for (let i = 1; i <= 3; i++) {
      await new Post({
        title: `Post ${i}`,
        textSubmission: `Content ${i}`,
        author: savedUser._id,
        subreddit: savedSubreddit._id,
        postType: "Text",
      }).save();
    }
  });

  describe("getSubredditPosts", () => {
    test("returns subreddit posts with pagination", async () => {
      const req = {
        params: { subredditName: "TestSub" },
        query: { page: 1, limit: 2, sortby: "new" },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
        send(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.subDetails.subredditName).toBe("TestSub");
      expect(res.body.posts.results).toHaveLength(2);
      expect(res.body.posts.next).toBeDefined();
      expect(res.body.posts.previous ?? null).toBeNull();
    });

    test("handles different sort options", async () => {
      const sortOptions = ["new", "top", "best", "hot", "controversial", "old"];

      for (const sortby of sortOptions) {
        const req = {
          params: { subredditName: "TestSub" },
          query: { page: 1, limit: 10, sortby },
        };

        const res = {
          statusCode: 0,
          body: null,
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(data) {
            this.body = data;
          },
        };

        await getSubredditPosts(req, res);
        expect(res.statusCode).toBe(200);
      }
    });

    test("handles invalid page number", async () => {
      const req = {
        params: { subredditName: "TestSub" },
        query: { page: -1, limit: 2 },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.posts.results).toHaveLength(2);
    });

    test("handles invalid limit", async () => {
      const req = {
        params: { subredditName: "TestSub" },
        query: { page: 1, limit: 0 },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.posts.results).toHaveLength(3); // Default limit
    });

    test("handles empty subreddit posts", async () => {
      await Post.deleteMany({ subreddit: savedSubreddit._id });

      const req = {
        params: { subredditName: "TestSub" },
        query: { page: 1, limit: 10 },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.posts.results).toHaveLength(0);
    });

    test("handles invalid sort option", async () => {
      const req = {
        params: { subredditName: "TestSub" },
        query: { page: 1, limit: 10, sortby: "invalid_sort" },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/invalid sort option/i);
    });

    test("handles non-numeric page/limit values", async () => {
      const req = {
        params: { subredditName: "TestSub" },
        query: { page: "abc", limit: "xyz" },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/invalid page or limit/i);
    });

    test("handles missing sort parameter", async () => {
      const req = {
        params: { subredditName: "TestSub" },
        query: { page: 1, limit: 10 },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.posts.results).toBeDefined();
    });
  });

  describe("createNewSubreddit", () => {
    test("creates new subreddit successfully", async () => {
      const req = {
        body: {
          subredditName: "NewSub",
          description: "New Description",
        },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.subredditName).toBe("NewSub");
      expect(res.body.subscriberCount).toBe(1);
    });

    test("prevents duplicate subreddit names", async () => {
      const req = {
        body: {
          subredditName: "TestSub",
          description: "Duplicate Sub",
        },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(403);
    });

    test("validates subreddit name format", async () => {
      const req = {
        body: {
          subredditName: "Invalid Name With Spaces",
          description: "Test",
        },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/invalid subreddit name/i);
    });

    test("handles empty description", async () => {
      const req = {
        body: {
          subredditName: "NewSub",
          description: "",
        },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/description is required/i);
    });

    test("handles missing user", async () => {
      const req = {
        body: {
          subredditName: "NewSub",
          description: "Test",
        },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/user does not exist/i);
    });

    test("handles subreddit name with special characters", async () => {
      const req = {
        body: {
          subredditName: "Test@Sub#123",
          description: "Test Description",
        },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/invalid subreddit name/i);
    });

    test("handles subreddit name that's too long", async () => {
      const req = {
        body: {
          subredditName: "a".repeat(21), // Assuming max length is 20
          description: "Test Description",
        },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/subreddit name too long/i);
    });

    test("handles missing subreddit name", async () => {
      const req = {
        body: {
          description: "Test Description",
        },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/subreddit name is required/i);
    });
  });

  describe("subscribeToSubreddit", () => {
    test("toggles subscription status", async () => {
      const req = {
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        end() {},
      };

      await subscribeToSubreddit(req, res);

      const updatedSubreddit = await Subreddit.findById(savedSubreddit._id);
      expect(updatedSubreddit.subscriberCount).toBe(0);
      expect(updatedSubreddit.subscribedBy).not.toContain(savedUser._id);
    });

    test("handles non-existent subreddit", async () => {
      const req = {
        params: { id: "507f1f77bcf86cd799439011" },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await subscribeToSubreddit(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/subreddit does not exist/i);
    });

    test("handles missing user", async () => {
      const req = {
        params: { id: savedSubreddit._id },
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await subscribeToSubreddit(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/user does not exist/i);
    });

    test("handles invalid subreddit ID format", async () => {
      const req = {
        params: { id: "invalid-id" },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await subscribeToSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/invalid subreddit id/i);
    });

    test("handles already subscribed user", async () => {
      const req = {
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await subscribeToSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already subscribed/i);
    });

    test("handles already unsubscribed user", async () => {
      // First unsubscribe
      await subscribeToSubreddit(
        {
          params: { id: savedSubreddit._id },
          user: savedUser._id,
        },
        {
          status(code) {
            this.statusCode = code;
            return this;
          },
          end() {},
        }
      );

      // Try to unsubscribe again
      const req = {
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await subscribeToSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/not subscribed/i);
    });

    test("handles subscription limit", async () => {
      // Create multiple subreddits
      const subreddits = [];
      for (let i = 0; i < 100; i++) {
        const subreddit = new Subreddit({
          subredditName: `TestSub${i}`,
          description: `Test Description ${i}`,
          admin: savedUser._id,
        });
        subreddits.push(await subreddit.save());
      }

      // Try to subscribe to all
      const req = {
        params: { id: subreddits[99]._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await subscribeToSubreddit(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/subscription limit/i);
    });
  });

  describe("getSubreddits", () => {
    test("returns list of subreddits", async () => {
      const req = {};
      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].subredditName).toBe("TestSub");
    });
  });

  describe("getTopSubreddits", () => {
    test("returns top 10 subreddits sorted by subscribers", async () => {
      const req = {};
      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getTopSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);
      expect(res.body[0].subscriberCount).toBeDefined();
    });

    test("handles empty subreddits list", async () => {
      await Subreddit.deleteMany({});

      const req = {};
      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getTopSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    test("handles subreddits with equal subscriber counts", async () => {
      // Create subreddits with same subscriber count
      const subreddits = [];
      for (let i = 0; i < 3; i++) {
        const subreddit = new Subreddit({
          subredditName: `EqualSub${i}`,
          description: `Test Description ${i}`,
          admin: savedUser._id,
          subscriberCount: 5,
        });
        subreddits.push(await subreddit.save());
      }

      const req = {};
      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getTopSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].subscriberCount).toBe(5);
      expect(res.body[1].subscriberCount).toBe(5);
      expect(res.body[2].subscriberCount).toBe(5);
    });

    test("handles subreddits with zero subscribers", async () => {
      const subreddit = new Subreddit({
        subredditName: "ZeroSub",
        description: "Test Description",
        admin: savedUser._id,
        subscriberCount: 0,
      });
      await subreddit.save();

      const req = {};
      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getTopSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toContainEqual(
        expect.objectContaining({
          subredditName: "ZeroSub",
          subscriberCount: 0,
        })
      );
    });
  });

  describe("editSubDescription", () => {
    test("edits the description of a subreddit by its admin", async () => {
      const req = {
        body: { description: "Updated description" },
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        end() {
          this.ended = true;
        },
        send(data) {
          this.body = data;
        },
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(202);

      const updatedSub = await Subreddit.findById(savedSubreddit._id);
      expect(updatedSub.description).toBe("Updated description");
    });

    test("returns 400 if description is missing", async () => {
      const req = {
        body: {},
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/can't be empty/i);
    });

    test("handles description that's too long", async () => {
      const req = {
        body: { description: "a".repeat(501) }, // Assuming max length is 500
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/description too long/i);
    });

    test("handles description with only whitespace", async () => {
      const req = {
        body: { description: "   " },
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/description cannot be empty/i);
    });

    test("handles non-string description", async () => {
      const req = {
        body: { description: 123 },
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/description must be a string/i);
    });
  });

  describe("subscribeToSubreddit (toggle again)", () => {
    test("resubscribes after unsubscribe", async () => {
      const req = {
        params: { id: savedSubreddit._id },
        user: savedUser._id,
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        end() {},
      };

      // Unsubscribe
      await subscribeToSubreddit(req, res);
      let updated = await Subreddit.findById(savedSubreddit._id);
      expect(updated.subscriberCount).toBe(0);

      // Subscribe again
      await subscribeToSubreddit(req, res);
      updated = await Subreddit.findById(savedSubreddit._id);
      expect(updated.subscriberCount).toBe(1);
      expect(updated.subscribedBy).toContainEqual(savedUser._id);
    });
  });

  describe("getSubredditPosts (404 case)", () => {
    test("returns 404 if subreddit not found", async () => {
      const req = {
        params: { subredditName: "nonexistent" },
        query: { page: 1, limit: 2 },
      };

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        send(data) {
          this.body = data;
        },
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/does not exist/i);
    });
  });

  describe("getSubreddits (empty case)", () => {
    test("returns empty array if no subreddits", async () => {
      await Subreddit.deleteMany({}); // clear all subs
      const req = {};

      const res = {
        statusCode: 0,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.body = data;
        },
      };

      await getSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
  test("returns 404 if subreddit does not exist", async () => {
    const req = {
      body: { description: "New Description" },
      params: { id: "507f1f77bcf86cd799439011" }, // ID hợp lệ nhưng không tồn tại
      user: savedUser._id,
    };

    const res = {
      statusCode: 0,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(data) {
        this.body = data;
      },
    };

    await editSubDescription(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(
      "Subreddit with ID: 507f1f77bcf86cd799439011 does not exist in database."
    );
  });
});

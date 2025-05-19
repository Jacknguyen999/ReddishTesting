const { test, expect, describe, beforeEach } = require("@jest/globals");
const User = require("../models/user");
const Post = require("../models/post");
const { getUser } = require("../controllers/user");
const Subreddit = require("../models/subreddit");

describe("getUser controller", () => {
  let savedUser;
  let savedSubreddit;

  beforeEach(async () => {
    const user = new User({
      username: "TestUser",
      passwordHash: "hashedpassword123",
    });

    savedUser = await user.save();

    // Tạo subreddit
    const subreddit = new Subreddit({
      subredditName: "testsub",
      description: "sub desc",
      creator: savedUser._id,
    });
    savedSubreddit = await subreddit.save();

    // Tạo 3 bài post
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

  test("returns user details and paginated posts", async () => {
    const req = {
      params: { username: "testuser" },
      query: { page: 1, limit: 2 },
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

    await getUser(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.userDetails.username).toBe("TestUser");
    expect(res.body.posts.results).toHaveLength(2); // vì limit là 2
    expect(res.body.posts.next).toBeDefined();
    expect(res.body.posts.previous ?? null).toBeNull();
  });

  test("returns 404 if user not found", async () => {
    const req = {
      params: { username: "nonexistent" },
      query: {},
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

    await getUser(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/does not exist/i);
  });

  test("handles case-insensitive username match", async () => {
    const req = {
      params: { username: "TESTuser" },
      query: { page: 1, limit: 5 },
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

    await getUser(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.userDetails.username).toBe("TestUser");
    expect(res.body.posts.results.length).toBeGreaterThan(0);
  });

  test("returns empty post list if user has no posts", async () => {
    const user = new User({ username: "EmptyUser", passwordHash: "hash" });
    await user.save();

    const req = {
      params: { username: "emptyuser" },
      query: {},
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

    await getUser(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.userDetails.username).toBe("EmptyUser");
    expect(res.body.posts.results).toHaveLength(0);
    expect(res.body.posts.next ?? null).toBeNull();
    expect(res.body.posts.previous).toBeNull;
  });
  test("handles missing or invalid pagination query", async () => {
    const req = {
      params: { username: "testuser" },
      query: { page: "abc", limit: "-5" },
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

    await getUser(req, res);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.posts.results)).toBe(true);
  });

  test("posts are returned in descending order by creation date", async () => {
    const req = {
      params: { username: "TestUser" },
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

    await getUser(req, res);

    const posts = res.body.posts.results;
    for (let i = 0; i < posts.length - 1; i++) {
      expect(
        new Date(posts[i].createdAt) >= new Date(posts[i + 1].createdAt)
      ).toBe(true);
    }
  });

  test("handles extremely large page numbers gracefully", async () => {
    const req = {
      params: { username: "TestUser" },
      query: { page: 99999, limit: 10 },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.posts.results).toHaveLength(0);
  });

  test("handles negative page numbers", async () => {
    const req = {
      params: { username: "TestUser" },
      query: { page: -1, limit: 10 },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid page number/i);
  });

  test("handles zero limit", async () => {
    const req = {
      params: { username: "TestUser" },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid limit/i);
  });

  test("handles missing username parameter", async () => {
    const req = {
      params: {},
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/username is required/i);
  });

  test("handles empty username", async () => {
    const req = {
      params: { username: "" },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/username cannot be empty/i);
  });

  test("handles username with only whitespace", async () => {
    const req = {
      params: { username: "   " },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/username cannot be empty/i);
  });

  test("handles username with special characters", async () => {
    const req = {
      params: { username: "Test@User#123" },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid username format/i);
  });

  test("handles username that is too long", async () => {
    const req = {
      params: { username: "a".repeat(21) }, // Assuming max length is 20
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/username too long/i);
  });

  test("handles missing query parameters", async () => {
    const req = {
      params: { username: "TestUser" },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.posts.results).toBeDefined();
  });

  test("handles non-numeric query parameters", async () => {
    const req = {
      params: { username: "TestUser" },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid page or limit/i);
  });

  test("handles user with deleted posts", async () => {
    // Create a post and then delete it
    const post = await new Post({
      title: "Deleted Post",
      textSubmission: "This post will be deleted",
      author: savedUser._id,
      subreddit: savedSubreddit._id,
      postType: "Text",
    }).save();

    await Post.findByIdAndDelete(post._id);

    const req = {
      params: { username: "TestUser" },
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

    await getUser(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.posts.results).not.toContainEqual(
      expect.objectContaining({ title: "Deleted Post" })
    );
  });
});

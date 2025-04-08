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
    expect(res.body.posts.previous).toBeNull
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

  test('posts are returned in descending order by creation date', async () => {
    const req = {
      params: { username: 'TestUser' },
      query: { page: 1, limit: 10 }
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
      }
    };
  
    await getUser(req, res);
    
    const posts = res.body.posts.results;
    for (let i = 0; i < posts.length - 1; i++) {
      expect(new Date(posts[i].createdAt) >= new Date(posts[i + 1].createdAt)).toBe(true);
    }
  });
  
  test('handles extremely large page numbers gracefully', async () => {
    const req = {
      params: { username: 'TestUser' },
      query: { page: 99999, limit: 10 }
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
      }
    };
  
    await getUser(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.posts.results).toHaveLength(0);
  });
  
});

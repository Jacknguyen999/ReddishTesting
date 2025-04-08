const { test, expect, describe, beforeEach } = require('@jest/globals');
const Subreddit = require('../models/subreddit');
const User = require('../models/user');
const Post = require('../models/post');
const { 
  getSubreddits, 
  getSubredditPosts,
  getTopSubreddits,
  createNewSubreddit,
  editSubDescription,
  subscribeToSubreddit 
} = require('../controllers/subreddit');

describe('Subreddit Controller', () => {
  let savedUser;
  let savedSubreddit;

  beforeEach(async () => {
    // Clear test database
    await Subreddit.deleteMany({});
    await User.deleteMany({});
    await Post.deleteMany({});

    // Create test user
    const user = new User({
      username: 'TestUser',
      passwordHash: 'hashedpassword123',
    });
    savedUser = await user.save();

    // Create test subreddit
    const subreddit = new Subreddit({
      subredditName: 'TestSub',
      description: 'Test Description',
      admin: savedUser._id,
      subscribedBy: [savedUser._id],
      subscriberCount: 1
    });
    savedSubreddit = await subreddit.save();

    // Create test posts
    for (let i = 1; i <= 3; i++) {
      await new Post({
        title: `Post ${i}`,
        textSubmission: `Content ${i}`,
        author: savedUser._id,
        subreddit: savedSubreddit._id,
        postType: 'Text',
      }).save();
    }
  });

  describe('getSubredditPosts', () => {
    test('returns subreddit posts with pagination', async () => {
      const req = {
        params: { subredditName: 'TestSub' },
        query: { page: 1, limit: 2, sortby: 'new' }
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
        }
      };

      await getSubredditPosts(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.subDetails.subredditName).toBe('TestSub');
      expect(res.body.posts.results).toHaveLength(2);
      expect(res.body.posts.next).toBeDefined();
      expect(res.body.posts.previous ?? null).toBeNull();
    });

    test('handles different sort options', async () => {
      const sortOptions = ['new', 'top', 'best', 'hot', 'controversial', 'old'];
      
      for (const sortby of sortOptions) {
        const req = {
          params: { subredditName: 'TestSub' },
          query: { page: 1, limit: 10, sortby }
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

        await getSubredditPosts(req, res);
        expect(res.statusCode).toBe(200);
      }
    });
  });

  describe('createNewSubreddit', () => {
    test('creates new subreddit successfully', async () => {
      const req = {
        body: {
          subredditName: 'NewSub',
          description: 'New Description'
        },
        user: savedUser._id
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
        }
      };

      await createNewSubreddit(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.subredditName).toBe('NewSub');
      expect(res.body.subscriberCount).toBe(1);
    });

    test('prevents duplicate subreddit names', async () => {
      const req = {
        body: {
          subredditName: 'TestSub',
          description: 'Duplicate Sub'
        },
        user: savedUser._id
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
        }
      };

      await createNewSubreddit(req, res);
      expect(res.statusCode).toBe(403);
    });
  });

  describe('subscribeToSubreddit', () => {
    test('toggles subscription status', async () => {
      const req = {
        params: { id: savedSubreddit._id },
        user: savedUser._id
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        end() {}
      };

      await subscribeToSubreddit(req, res);

      const updatedSubreddit = await Subreddit.findById(savedSubreddit._id);
      expect(updatedSubreddit.subscriberCount).toBe(0);
      expect(updatedSubreddit.subscribedBy).not.toContain(savedUser._id);
    });
  });
  describe('getSubreddits', () => {
    test('returns list of subreddits', async () => {
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
        }
      };

      await getSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].subredditName).toBe('TestSub');
    });
  });

  describe('getTopSubreddits', () => {
    test('returns top 10 subreddits sorted by subscribers', async () => {
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
        }
      };

      await getTopSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);
      expect(res.body[0].subscriberCount).toBeDefined();
    });
  });

  describe('editSubDescription', () => {
    test('edits the description of a subreddit by its admin', async () => {
      const req = {
        body: { description: 'Updated description' },
        params: { id: savedSubreddit._id },
        user: savedUser._id
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
        }
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(202);

      const updatedSub = await Subreddit.findById(savedSubreddit._id);
      expect(updatedSub.description).toBe('Updated description');
    });

    test('returns 400 if description is missing', async () => {
      const req = {
        body: {},
        params: { id: savedSubreddit._id },
        user: savedUser._id
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
        }
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/can't be empty/i);
    });
  });
  describe('subscribeToSubreddit (toggle again)', () => {
    test('resubscribes after unsubscribe', async () => {
      const req = {
        params: { id: savedSubreddit._id },
        user: savedUser._id
      };

      const res = {
        statusCode: 0,
        status(code) {
          this.statusCode = code;
          return this;
        },
        end() {}
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

  describe('editSubDescription (admin check)', () => {
    //
    test.skip('does not allow non-admin to edit description', async () => {
      const otherUser = await new User({
        username: 'AnotherUser',
        passwordHash: 'hash456'
      }).save();

      const req = {
        body: { description: 'Hacked description' },
        params: { id: savedSubreddit._id },
        user: otherUser._id
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
        }
      };

      await editSubDescription(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch("Access is denied.");
    });
  });

  describe('getSubredditPosts (404 case)', () => {
    test('returns 404 if subreddit not found', async () => {
      const req = {
        params: { subredditName: 'nonexistent' },
        query: { page: 1, limit: 2 }
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
        }
      };

      await getSubredditPosts(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/does not exist/i);
    });
  });

  describe('getSubreddits (empty case)', () => {
    test('returns empty array if no subreddits', async () => {
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
        }
      };

      await getSubreddits(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
  test('returns 404 if subreddit does not exist', async () => {
    const req = {
      body: { description: 'New Description' },
      params: { id: '507f1f77bcf86cd799439011' }, // ID hợp lệ nhưng không tồn tại
      user: savedUser._id
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
      }
    };
  
    await editSubDescription(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch("Subreddit with ID: 507f1f77bcf86cd799439011 does not exist in database.");
  });
  
});
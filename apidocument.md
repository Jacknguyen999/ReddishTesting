# Reddit Clone API Documentation

## Authentication

### Login User

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`

```json
{
  "token": "string",
  "username": "string",
  "id": "string",
  "avatar": {
    "exists": "boolean",
    "imageLink": "string",
    "imageId": "string"
  },
  "karma": "number"
}
```

**Errors:**

- `400` - No account with username exists
- `401` - Invalid credentials

### Signup User

```http
POST /api/auth/signup
```

**Request Body:**

```json
{
  "username": "string", // 3-20 characters
  "password": "string" // min 6 characters
}
```

**Response:** `200 OK`

```json
{
  "token": "string",
  "username": "string",
  "id": "string",
  "avatar": {
    "exists": false,
    "imageLink": "null",
    "imageId": "null"
  },
  "karma": 0
}
```

**Errors:**

- `400` - Username taken/invalid or password too short

## Posts

### Get All Posts

```http
GET /api/posts
```

**Query Parameters:**

- `page`: number
- `limit`: number
- `sortby`: "new" | "top" | "best" | "hot" | "controversial" | "old"

**Response:** `200 OK`

```json
{
  "previous": { "page": "number", "limit": "number" },
  "results": [Post],
  "next": { "page": "number", "limit": "number" }
}
```

### Get Subscribed Posts

```http
GET /api/posts/subscribed
```

**Query Parameters:**

- `page`: number
- `limit`: number

**Response:** `200 OK`

```json
{
  "previous": { "page": "number", "limit": "number" },
  "results": [Post],
  "next": { "page": "number", "limit": "number" }
}
```

### Search Posts

```http
GET /api/posts/search
```

**Query Parameters:**

- `query`: string
- `page`: number
- `limit`: number

**Response:** `200 OK`

```json
{
  "previous": { "page": "number", "limit": "number" },
  "results": [Post],
  "next": { "page": "number", "limit": "number" }
}
```

### Get Post and Comments

```http
GET /api/posts/:id
```

**Response:** `200 OK`

```json
{
  "title": "string",
  "author": { "username": "string" },
  "comments": [
    {
      "commentBody": "string",
      "commentedBy": { "username": "string" },
      "replies": [
        {
          "replyBody": "string",
          "repliedBy": { "username": "string" }
        }
      ]
    }
  ]
}
```

### Create New Post

```http
POST /api/posts
```

**Request Body:**

```json
{
  "title": "string",
  "subreddit": "string", // subreddit ID
  "postType": "Text" | "Link" | "Image",
  "textSubmission": "string", // for Text type, max 40000 chars
  "linkSubmission": "string", // for Link type, valid URL
  "imageSubmission": "string"  // for Image type, image data
}
```

**Response:** `201 Created`

### Update Post

```http
PUT /api/posts/:id
```

**Request Body:**

```json
{
  "textSubmission": "string", // for Text posts
  "linkSubmission": "string", // for Link posts
  "imageSubmission": "string" // for Image posts
}
```

**Response:** `202 Accepted`

### Delete Post

```http
DELETE /api/posts/:id
```

**Response:** `204 No Content`

## Comments

### Add Comment

```http
POST /api/posts/:id/comments
```

**Request Body:**

```json
{
  "comment": "string"
}
```

**Response:** `201 Created`

### Update Comment

```http
PUT /api/posts/:id/comments/:commentId
```

**Request Body:**

```json
{
  "comment": "string"
}
```

**Response:** `202 Accepted`

### Delete Comment

```http
DELETE /api/posts/:id/comments/:commentId
```

**Response:** `204 No Content`

### Add Reply

```http
POST /api/posts/:id/comments/:commentId/replies
```

**Request Body:**

```json
{
  "reply": "string"
}
```

**Response:** `201 Created`

### Update Reply

```http
PUT /api/posts/:id/comments/:commentId/replies/:replyId
```

**Request Body:**

```json
{
  "reply": "string"
}
```

**Response:** `202 Accepted`

### Delete Reply

```http
DELETE /api/posts/:id/comments/:commentId/replies/:replyId
```

**Response:** `204 No Content`

## Votes

### Upvote Post

```http
POST /api/posts/:id/upvote
```

**Response:** `201 Created`

### Downvote Post

```http
POST /api/posts/:id/downvote
```

**Response:** `201 Created`

### Upvote Comment

```http
POST /api/posts/:id/comments/:commentId/upvote
```

**Response:** `201 Created`

### Downvote Comment

```http
POST /api/posts/:id/comments/:commentId/downvote
```

**Response:** `201 Created`

## Subreddits

### Get All Subreddits

```http
GET /api/subreddits
```

**Response:** `200 OK`

```json
[
  {
    "id": "string",
    "subredditName": "string"
  }
]
```

### Get Subreddit Posts

```http
GET /api/subreddits/:subredditName/posts
```

**Query Parameters:**

- `page`: number
- `limit`: number
- `sortby`: "new" | "top" | "best" | "hot" | "controversial" | "old"

**Response:** `200 OK`

```json
{
  "subDetails": {
    "subredditName": "string",
    "description": "string",
    "admin": { "username": "string" }
  },
  "posts": {
    "previous": { "page": "number", "limit": "number" },
    "results": [Post],
    "next": { "page": "number", "limit": "number" }
  }
}
```

### Get Top Subreddits

```http
GET /api/subreddits/top
```

**Response:** `200 OK`

```json
[
  {
    "subredditName": "string",
    "subscriberCount": "number"
  }
]
```

### Create Subreddit

```http
POST /api/subreddits
```

**Request Body:**

```json
{
  "subredditName": "string",
  "description": "string"
}
```

**Response:** `201 Created`

### Edit Subreddit Description

```http
PUT /api/subreddits/:id
```

**Request Body:**

```json
{
  "description": "string"
}
```

**Response:** `202 Accepted`

### Subscribe to Subreddit

```http
POST /api/subreddits/:id/subscribe
```

**Response:** `201 Created`

## Users

### Get User Profile

```http
GET /api/users/:username
```

**Query Parameters:**

- `page`: number
- `limit`: number

**Response:** `200 OK`

```json
{
  "userDetails": {
    "username": "string",
    "avatar": {
      "exists": "boolean",
      "imageLink": "string",
      "imageId": "string"
    }
  },
  "posts": {
    "previous": { "page": "number", "limit": "number" },
    "results": [Post],
    "next": { "page": "number", "limit": "number" }
  }
}
```

### Set User Avatar

```http
POST /api/users/avatar
```

**Request Body:**

```json
{
  "avatarImage": "string" // image data
}
```

**Response:** `201 Created`

### Remove User Avatar

```http
DELETE /api/users/avatar
```

**Response:** `204 No Content`

## Error Responses

All endpoints may return these error responses:

```json
{
  "message": "Error description"
}
```

**Common Status Codes:**

- `400` - Bad Request
- `401` - Unauthorized/Access Denied
- `404` - Resource Not Found

## Authentication

All endpoints except login and signup require JWT authentication via Bearer token in Authorization header:

```
Authorization: Bearer <token>
```

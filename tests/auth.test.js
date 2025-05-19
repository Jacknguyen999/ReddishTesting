const { describe, test, expect, beforeEach } = require("@jest/globals");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const { signupUser, loginUser } = require("../controllers/auth");

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
});

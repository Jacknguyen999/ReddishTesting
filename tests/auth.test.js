const { test, expect } = require('@jest/globals');
const User = require('../models/user');
const { signupUser } = require('../controllers/auth');

test('signup creates a new user successfully', async () => {
  // Mock request and response objects
  const req = {
    body: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }
  };
  
  const res = {
    status: function() { return this; }, 
    json: function() {}  
  };

  // Spy on the response methods
  // eslint-disable-next-line no-undef
  const statusSpy = jest.spyOn(res, 'status');
  // eslint-disable-next-line no-undef
  const jsonSpy = jest.spyOn(res, 'json');

  // Test the signup function
  await signupUser(req, res);

  // Check response status
  expect(statusSpy).toHaveBeenCalledWith(200);

  // Check response data structure
  const responseData = jsonSpy.mock.calls[0][0];
  expect(responseData).toEqual(
    expect.objectContaining({
      username: 'testuser',
      karma: 0,
      avatar: {
        exists: false,
        imageId: 'null',
        imageLink: 'null'
      }
    })
  );

  // Verify token exists
  expect(responseData.token).toBeDefined();
  expect(typeof responseData.token).toBe('string');
  
  // Verify id exists
  expect(responseData.id).toBeDefined();

  // Verify database state
  const userInDb = await User.findOne({ username: 'testuser' });
  expect(userInDb).toBeTruthy();
  expect(userInDb.username).toBe('testuser');
  expect(userInDb.passwordHash).toBeDefined();
});



const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the User model so we don't need a real DynamoDB instance
jest.mock('../src/models/User');

describe('Auth Service APIs', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock findByEmail to return null (user does not exist)
      User.findByEmail.mockResolvedValue(null);
      // Mock create to return the created user
      User.create.mockResolvedValue({
        userId: '123-uuid',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'passenger',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data.role).toBe('passenger');
      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.create).toHaveBeenCalled();
    });

    it('should fail if email is already in use', async () => {
      User.findByEmail.mockResolvedValue({ email: 'test@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('A user with this email already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user and return JWT token', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      User.findByEmail.mockResolvedValue({
        userId: '123-uuid',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data.role).toBe('admin');
    });

    it('should fail with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      User.findByEmail.mockResolvedValue({
        email: 'test@example.com',
        passwordHash: hashedPassword,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('RBAC Middleware (GET /api/v1/auth/admin-only)', () => {
    it('should allow access if user is admin', async () => {
      const token = jwt.sign({ userId: '123', role: 'admin' }, 'test-secret');

      const res = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny access if user is passenger', async () => {
      const token = jwt.sign({ userId: '123', role: 'passenger' }, 'test-secret');

      const res = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('not authorized');
    });

    it('should deny access if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-only');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Authentication', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        idToken: 'mock_firebase_token',
        name: 'Test User',
        phone: '+1234567890',
        signupIntent: 'VIEWER',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeTruthy();
      expect(user?.name).toBe('Test User');
    });

    it('should reject duplicate email registration', async () => {
      // Create first user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          phone: '+1234567890',
          passwordHash: await bcrypt.hash('password123', 10),
          role: 'USER',
        },
      });

      const userData = {
        idToken: 'mock_firebase_token',
        name: 'Test User',
        phone: '+1234567890',
        signupIntent: 'VIEWER',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.error).toBeTruthy();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          phone: '+1234567890',
          passwordHash: await bcrypt.hash('password123', 10),
          role: 'USER',
        },
      });
    });

    it('should login existing user successfully', async () => {
      const loginData = {
        idToken: 'mock_firebase_token',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid token', async () => {
      const loginData = {
        idToken: 'invalid_token',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout authenticated user', async () => {
      // Create and authenticate user
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          phone: '+1234567890',
          passwordHash: await bcrypt.hash('password123', 10),
          role: 'USER',
        },
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer mock_token_${user.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject logout for unauthenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });
  });
});

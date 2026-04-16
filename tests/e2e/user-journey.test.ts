import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('End-to-End User Journey', () => {
  let userToken: string;
  let userId: string;
  let videoId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany();
    await prisma.video.deleteMany();
    await prisma.unlock.deleteMany();

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        phone: '+1234567890',
        passwordHash: hashedPassword,
        role: 'USER',
        signupIntent: 'VIEWER',
      },
    });

    userId = user.id;

    // Create test video
    const video = await prisma.video.create({
      data: {
        creatorId: user.id,
        title: 'Test Feature Film',
        description: 'A premium test film for end-to-end testing',
        videoType: 'FEATURE',
        ageRating: 'ALL',
        category: 'Drama',
        priceTier: 'STANDARD',
        rightsTier: 'SHARED',
        durationSec: 7200, // 2 hours
        teaserSec: 300, // 5 minutes
        releaseYear: 2024,
        genres: ['Drama', 'Romance'],
        tags: ['test', 'premium'],
        status: 'APPROVED',
        r2Key: 'test-video.mp4',
        posterKey: 'test-poster.jpg',
      },
    });

    videoId = video.id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ idToken: 'mock_valid_token' })
      .expect(200);

    userToken = 'Bearer mock_user_token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Content Discovery', () => {
    it('should browse catalog and see videos', async () => {
      const response = await request(app)
        .get('/api/mobile/titles')
        .expect(200);

      expect(response.body.titles).toBeDefined();
      expect(response.body.titles.length).toBeGreaterThan(0);
      expect(response.body.currency).toBeDefined();
      expect(response.body.titles[0].price).toBeDefined();
      expect(response.body.titles[0].price.currency).toMatch(/^(USD|EUR|GBP|CAD|NGN)$/);
    });

    it('should search for specific content', async () => {
      const response = await request(app)
        .get('/api/mobile/titles?q=Drama')
        .expect(200);

      expect(response.body.titles).toBeDefined();
      // Should filter by category or genre
      expect(response.body.titles.every((title: any) => 
        title.category.includes('Drama') || title.genres.includes('Drama')
      )).toBe(true);
    });

    it('should get video details with pricing', async () => {
      const response = await request(app)
        .get(`/api/mobile/titles/${videoId}`)
        .expect(200);

      expect(response.body.title).toBeDefined();
      expect(response.body.title.title).toBe('Test Feature Film');
      expect(response.body.access).toBeDefined();
      expect(response.body.access.priceInfo).toBeDefined();
      expect(response.body.access.priceInfo.currency).toMatch(/^(USD|EUR|GBP|CAD|NGN)$/);
    });
  });

  describe('Video Playback', () => {
    it('should get stream token for teaser', async () => {
      const response = await request(app)
        .get('/api/stream/token?videoId=' + videoId + '&teaser=1')
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should get stream token for full video with access', async () => {
      // First, unlock the video
      await prisma.unlock.create({
        data: {
          userId,
          videoId,
          amountNaira: 200,
          source: 'WALLET',
          watermarkText: 'Test User',
        },
      });

      const response = await request(app)
        .get('/api/stream/token?videoId=' + videoId)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should handle device session tracking', async () => {
      const deviceSessionId = 'test-device-session-123';
      
      const response = await request(app)
        .get(`/api/stream/token?videoId=${videoId}&deviceSessionId=${deviceSessionId}`)
        .expect(200);

      expect(response.body.token).toBeDefined();

      // Check that session was created
      const session = await prisma.streamSession.findUnique({
        where: {
          userId_deviceSessionId: {
            userId,
            deviceSessionId,
          },
        },
      });

      expect(session).toBeTruthy();
      expect(session!.videoId).toBe(videoId);
    });
  });

  describe('International Currency Support', () => {
    it('should return pricing in USD for US users', async () => {
      const response = await request(app)
        .get('/api/mobile/titles?currency=USD')
        .set('Accept-Language', 'en-US')
        .expect(200);

      expect(response.body.currency).toBe('USD');
      expect(response.body.titles[0].price.currency).toBe('USD');
      expect(response.body.titles[0].price.formatted).toMatch(/^\$\d+\.\d{2}$/);
    });

    it('should return pricing in EUR for EU users', async () => {
      const response = await request(app)
        .get('/api/mobile/titles?currency=EUR')
        .set('Accept-Language', 'de-DE')
        .expect(200);

      expect(response.body.currency).toBe('EUR');
      expect(response.body.titles[0].price.currency).toBe('EUR');
      expect(response.body.titles[0].price.formatted).toMatch(/^\d+,\d{2}€$/);
    });

    it('should return pricing in GBP for UK users', async () => {
      const response = await request(app)
        .get('/api/mobile/titles?currency=GBP')
        .set('Accept-Language', 'en-GB')
        .expect(200);

      expect(response.body.currency).toBe('GBP');
      expect(response.body.titles[0].price.currency).toBe('GBP');
      expect(response.body.titles[0].price.formatted).match(/^£\d+\.\d{2}$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid video ID gracefully', async () => {
      const response = await request(app)
        .get('/api/mobile/titles/invalid-id')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/mobile/me')
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/mobile/titles')
      );

      const responses = await Promise.all(promises);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/mobile/titles')
        .expect(200);

      const responseTime = Date.now() - startTime;
      
      // API should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000);
    });

    it('should include proper caching headers', async () => {
      const response = await request(app)
        .get('/api/mobile/titles')
        .expect(200);

      expect(response.headers['cache-control']).toBeDefined();
      expect(response.headers['cache-control']).toContain('max-age');
    });
  });

  describe('Security', () => {
    it('should sanitize input properly', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .get(`/api/mobile/titles?q=${encodeURIComponent(maliciousInput)}`)
        .expect(200);

      // Response should not contain unescaped script tags
      expect(response.body).not.toContain('<script>');
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/mobile/titles?limit=invalid')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});

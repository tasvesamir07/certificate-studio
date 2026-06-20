import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock mailer
vi.mock('../services/mailer', () => {
  return {
    createTransporter: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue(true),
    }),
  };
});

// Import app and the db pool (using CommonJS require to match controllers)
import request from 'supertest';
import app from '../index';
const pool = require('../models/db');
import { generateToken } from '../middleware/auth';

const testToken = generateToken({ id: 42, email: 'test@test.com' });

describe('Server Route Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Auth Tests ---
  test('POST /api/auth/login with missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('required');
  });

  test('POST /api/auth/login with non-existent user returns 401', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'Password123!' });
    
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid email');
  });

  test('POST /api/auth/signup with invalid email format returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'invalid-email', password: 'Password123!', displayName: 'Test' });
    
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid email format');
  });

  // --- Templates Tests ---
  test('GET /api/templates requires userId', async () => {
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('userId is required');
  });

  test('GET /api/templates with userId returns templates', async () => {
    const mockTemplates = [
      { id: 1, name: 'Template A', templateUrl: 'http://test.com/a.jpg', layout: {}, category: 'Test' }
    ];
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: mockTemplates });

    const res = await request(app)
      .get('/api/templates?userId=42')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockTemplates);
  });

  // --- Verification Tests ---
  test('GET /api/verify/:code returns certificate details', async () => {
    const mockCertificate = {
      id: 'uuid-code',
      recipientName: 'Sami',
      recipientEmail: 'sami@test.com',
      certificateUrl: 'http://test.com/cert.jpg',
      issueDate: '2026-06-13T00:00:00Z',
      issuerName: 'Issuer A',
    };
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [mockCertificate] });

    const res = await request(app).get('/api/verify/uuid-code');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockCertificate);
  });

  test('GET /api/verify/:code returning 404 for non-existent cert', async () => {
    vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/verify/missing-code');
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('not found');
  });
});

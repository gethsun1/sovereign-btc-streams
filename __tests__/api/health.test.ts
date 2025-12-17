import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/health';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Method not allowed');
  });

  it('returns healthy status when database is accessible', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('ok');
    expect(typeof data.checks.uptime).toBe('number');
    expect(typeof data.timestamp).toBe('number');
    expect(data.error).toBeUndefined();
  });

  it('returns unhealthy status when database is not accessible', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(503);
    const data = JSON.parse(res._getData());
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database).toBe('error');
    expect(data.error).toBe('Connection refused');
  });

  it('includes uptime in response', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    const data = JSON.parse(res._getData());
    expect(data.checks.uptime).toBeGreaterThan(0);
  });
});

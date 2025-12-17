import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/streams';
import { listStreams, listClaims } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  listStreams: jest.fn(),
  listClaims: jest.fn(),
}));

describe('/api/streams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed',
    });
    expect(res._getHeaders()).toHaveProperty('allow', ['GET']);
  });

  it('returns empty array when no streams exist', async () => {
    (listStreams as jest.Mock).mockResolvedValue([]);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      streams: [],
    });
  });

  it('returns streams with claims', async () => {
    const mockStreams = [
      {
        id: 'stream_1',
        vault_id: 'vault_1',
        charm_id: 'charm_1',
        beneficiary: 'bc1qtest',
        total_amount_sats: 100000000,
        rate_sats_per_sec: 1000,
        start_unix: 1700000000,
        cliff_unix: 1700086400,
        streamed_commitment_sats: 50000000,
        status: 'active',
      },
      {
        id: 'stream_2',
        vault_id: 'vault_2',
        charm_id: 'charm_2',
        beneficiary: 'bc1qtest2',
        total_amount_sats: 50000000,
        rate_sats_per_sec: 500,
        start_unix: 1700000000,
        cliff_unix: 1700086400,
        streamed_commitment_sats: 25000000,
        status: 'completed',
      },
    ];

    const mockClaims = [
      {
        id: 'claim_1',
        stream_id: 'stream_1',
        amount_sats: 10000000,
        proof: '{}',
        verified: 1,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    (listStreams as jest.Mock).mockResolvedValue(mockStreams);
    (listClaims as jest.Mock).mockResolvedValue(mockClaims);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.streams).toHaveLength(2);
    expect(data.streams[0]).toMatchObject({
      id: 'stream_1',
      vaultId: 'vault_1',
      charmId: 'charm_1',
      beneficiary: 'bc1qtest',
      totalAmountSats: 100000000,
      rateSatsPerSec: 1000,
      status: 'active',
    });
    expect(data.streams[0].claims).toEqual(mockClaims);
  });

  it('handles database errors gracefully', async () => {
    (listStreams as jest.Mock).mockRejectedValue(new Error('Database error'));

    const { req, res } = createMocks({
      method: 'GET',
    });

    await expect(handler(req, res)).rejects.toThrow('Database error');
  });
});

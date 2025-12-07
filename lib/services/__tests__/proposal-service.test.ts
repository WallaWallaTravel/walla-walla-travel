/**
 * ProposalService Tests
 * Unit tests for proposal business logic
 */

import { ProposalService } from '../proposal-service';
import { createMockPool, createMockQueryResult } from '../../__tests__/test-utils';
import { createMockProposal, createMockProposalWithItems } from '../../__tests__/factories';

jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: createMockPool(),
}));

describe('ProposalService', () => {
  let service: ProposalService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    service = new ProposalService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
  });

  describe('findManyWithFilters', () => {
    it('should return proposals with default filters', async () => {
      const mockProposals = [
        createMockProposal(),
        createMockProposal(),
      ];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '2' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockProposals));

      const result = await service.findManyWithFilters({});

      expect(result.proposals).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      const mockProposals = [createMockProposal({ status: 'sent' })];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }]))
        .mockResolvedValueOnce(createMockQueryResult(mockProposals));

      const result = await service.findManyWithFilters({ status: 'sent' });

      expect(result.proposals[0].status).toBe('sent');
    });

    it('should paginate results', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '50' }]))
        .mockResolvedValueOnce(createMockQueryResult([createMockProposal()]));

      const result = await service.findManyWithFilters({ limit: 10, offset: 20 });

      expect(result.total).toBe(50);
      
      const sqlCall = mockQuery.mock.calls[1][0];
      expect(sqlCall).toContain('LIMIT 10');
      expect(sqlCall).toContain('OFFSET 20');
    });
  });

  describe('getProposalDetails', () => {
    it('should return proposal with items', async () => {
      const mockProposal = createMockProposalWithItems();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockProposal]));

      const result = await service.getProposalDetails(123);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockProposal.id);
      expect(result.items).toBeDefined();
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should throw error when proposal not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getProposalDetails(999)).rejects.toThrow('not found');
    });
  });

  describe('updateStatus', () => {
    it('should update proposal status', async () => {
      const mockProposal = createMockProposal({ status: 'sent' });

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockProposal]));

      const result = await service.updateStatus(123, 'accepted');

      expect(result).toBeDefined();
    });

    it('should throw error when proposal not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.updateStatus(999, 'accepted')).rejects.toThrow('not found');
    });
  });

  describe('getStatistics', () => {
    it('should return proposal statistics', async () => {
      const mockStats = {
        total_proposals: '20',
        draft_proposals: '5',
        sent_proposals: '10',
        accepted_proposals: '4',
        declined_proposals: '1',
        total_value: '25000.00',
        average_value: '1250.00',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics({});

      expect(result.totalProposals).toBe(20);
      expect(result.acceptedProposals).toBe(4);
      expect(result.totalValue).toBe(25000);
    });
  });
});



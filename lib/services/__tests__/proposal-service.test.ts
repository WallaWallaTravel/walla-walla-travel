/**
 * ProposalService Tests
 * Unit tests for proposal business logic
 */

import { ProposalService } from '../proposal-service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockProposal, createMockProposalWithItems } from '../../__tests__/factories';

// Mock the db module - use inline object to avoid initialization order issues
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
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
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProposalById', () => {
    it('should return proposal when found', async () => {
      const mockProposal = createMockProposal();

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockProposal]));

      const result = await service.getProposalById(mockProposal.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockProposal.id);
    });

    it('should throw error when proposal not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await expect(service.getProposalById(999)).rejects.toThrow();
    });
  });

  describe('updateStatus', () => {
    it('should update proposal status with valid transition', async () => {
      const mockProposal = createMockProposal({ status: 'draft' });

      // Mock: 1) get proposal, 2) update proposal, 3) log activity
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([mockProposal])) // getProposalById
        .mockResolvedValueOnce(createMockQueryResult([{ ...mockProposal, status: 'sent' }])) // update
        .mockResolvedValueOnce(createMockQueryResult([])); // activity log

      const result = await service.updateStatus(mockProposal.id, 'sent');

      expect(result).toBeDefined();
      expect(result.status).toBe('sent');
    });

    it('should reject invalid status transition', async () => {
      const mockProposal = createMockProposal({ status: 'accepted' });

      // Mock: 1) get proposal (then validation will fail)
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockProposal]));

      // Cannot go from accepted back to draft
      await expect(service.updateStatus(mockProposal.id, 'draft')).rejects.toThrow();
    });
  });

  describe('getStatistics', () => {
    it('should return proposal statistics', async () => {
      // Mock data matching actual service query column names
      const mockStats = {
        total_proposals: '20',
        sent_proposals: '10',
        accepted_proposals: '4',
        declined_proposals: '1',
        avg_value: '1250.00',
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats]));

      const result = await service.getStatistics();

      expect(result.totalProposals).toBe(20);
      expect(result.sentProposals).toBe(10);
      expect(result.acceptedProposals).toBe(4);
      expect(result.declinedProposals).toBe(1);
      expect(result.averageValue).toBe(1250);
    });
  });
});

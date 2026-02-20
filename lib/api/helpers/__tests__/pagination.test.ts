import { NextRequest } from 'next/server';
import { parsePagination, buildPaginationMeta } from '../pagination';

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/test${query ? '?' + query : ''}`);
}

describe('parsePagination', () => {
  it('should return defaults when no params', () => {
    const result = parsePagination(makeRequest(''));
    expect(result).toEqual({ page: 1, limit: 50, offset: 0 });
  });

  it('should parse page and limit', () => {
    const result = parsePagination(makeRequest('page=3&limit=25'));
    expect(result).toEqual({ page: 3, limit: 25, offset: 50 });
  });

  it('should clamp limit to maxLimit', () => {
    const result = parsePagination(makeRequest('limit=500'));
    expect(result.limit).toBe(100);
  });

  it('should clamp limit to custom maxLimit', () => {
    const result = parsePagination(makeRequest('limit=30'), { maxLimit: 20 });
    expect(result.limit).toBe(20);
  });

  it('should use custom defaultLimit', () => {
    const result = parsePagination(makeRequest(''), { defaultLimit: 10 });
    expect(result.limit).toBe(10);
  });

  it('should ensure page >= 1', () => {
    const result = parsePagination(makeRequest('page=-5'));
    expect(result.page).toBe(1);
    expect(result.offset).toBe(0);
  });

  it('should treat limit=0 as default (zero items makes no sense)', () => {
    const result = parsePagination(makeRequest('limit=0'));
    expect(result.limit).toBe(50);
  });

  it('should clamp negative limit to 1', () => {
    const result = parsePagination(makeRequest('limit=-5'));
    expect(result.limit).toBe(1);
  });

  it('should support offset-based pagination', () => {
    const result = parsePagination(makeRequest('offset=100&limit=25'));
    expect(result).toEqual({ page: 5, limit: 25, offset: 100 });
  });

  it('should prefer page over offset when both provided', () => {
    const result = parsePagination(makeRequest('page=2&offset=100&limit=10'));
    expect(result).toEqual({ page: 2, limit: 10, offset: 10 });
  });

  it('should handle non-numeric page gracefully', () => {
    const result = parsePagination(makeRequest('page=abc'));
    expect(result.page).toBe(1);
  });

  it('should handle non-numeric limit gracefully', () => {
    const result = parsePagination(makeRequest('limit=abc'));
    expect(result.limit).toBe(50);
  });

  it('should handle non-numeric offset gracefully', () => {
    const result = parsePagination(makeRequest('offset=abc'));
    expect(result.offset).toBe(0);
  });
});

describe('buildPaginationMeta', () => {
  it('should build correct metadata', () => {
    const meta = buildPaginationMeta({ page: 2, limit: 10, offset: 10 }, 55);
    expect(meta).toEqual({
      page: 2,
      limit: 10,
      total: 55,
      totalPages: 6,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('should set hasNext=false on last page', () => {
    const meta = buildPaginationMeta({ page: 3, limit: 10, offset: 20 }, 30);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('should set hasPrev=false on first page', () => {
    const meta = buildPaginationMeta({ page: 1, limit: 10, offset: 0 }, 30);
    expect(meta.hasPrev).toBe(false);
    expect(meta.hasNext).toBe(true);
  });

  it('should handle zero total', () => {
    const meta = buildPaginationMeta({ page: 1, limit: 10, offset: 0 }, 0);
    expect(meta).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('should handle single page', () => {
    const meta = buildPaginationMeta({ page: 1, limit: 50, offset: 0 }, 25);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });
});

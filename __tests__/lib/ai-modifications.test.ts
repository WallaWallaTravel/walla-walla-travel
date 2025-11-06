/**
 * Unit Tests for AI Smart Modifications
 */

import { getSmartModifications, analyzeIngredients } from '@/lib/ai-modifications';
import { type MenuItem } from '@/lib/menus';

describe('AI Smart Modifications', () => {
  describe('getSmartModifications', () => {
    it('should suggest removing mayo for items with mayo', () => {
      const item: MenuItem = {
        id: 'test-1',
        name: 'Turkey Sandwich',
        description: 'Turkey, lettuce, tomato, mayo on wheat',
        price: 10.00,
        category: 'Sandwiches'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('No mayo');
    });

    it('should suggest removing multiple ingredients', () => {
      const item: MenuItem = {
        id: 'test-2',
        name: 'Club Sandwich',
        description: 'Turkey, bacon, lettuce, tomato, mayo, cheese',
        price: 12.00,
        category: 'Sandwiches'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('No mayo');
      expect(suggestions).toContain('No bacon');
      expect(suggestions).toContain('No lettuce');
      expect(suggestions).toContain('No tomato');
      expect(suggestions).toContain('No cheese');
    });

    it('should suggest "Extra cheese" for sandwiches with cheese', () => {
      const item: MenuItem = {
        id: 'test-3',
        name: 'Cheese Sandwich',
        description: 'Cheddar cheese, lettuce, tomato',
        price: 8.00,
        category: 'Sandwiches'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('Extra cheese');
    });

    it('should suggest "Add cheese" for sandwiches without cheese', () => {
      const item: MenuItem = {
        id: 'test-4',
        name: 'Turkey Sandwich',
        description: 'Turkey, lettuce, tomato',
        price: 9.00,
        category: 'Sandwiches'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('Add cheese');
    });

    it('should suggest "Dressing on side" for salads', () => {
      const item: MenuItem = {
        id: 'test-5',
        name: 'Caesar Salad',
        description: 'Romaine, parmesan, croutons, Caesar dressing',
        price: 11.00,
        category: 'Salads'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('Dressing on side');
    });

    it('should suggest "Add chicken" for salads without chicken', () => {
      const item: MenuItem = {
        id: 'test-6',
        name: 'Garden Salad',
        description: 'Mixed greens, vegetables, dressing',
        price: 9.00,
        category: 'Salads'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('Add chicken');
    });

    it('should limit suggestions to 5 items', () => {
      const item: MenuItem = {
        id: 'test-7',
        name: 'Loaded Sandwich',
        description: 'Turkey, bacon, cheese, lettuce, tomato, onion, mayo, mustard, pickles, avocado',
        price: 15.00,
        category: 'Sandwiches'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle Mexican food ingredients', () => {
      const item: MenuItem = {
        id: 'test-8',
        name: 'Burrito',
        description: 'Beef, rice, beans, cheese, sour cream, guacamole, salsa',
        price: 11.50,
        category: 'Burritos'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('No sour cream');
      expect(suggestions).toContain('No guacamole');
    });

    it('should handle Italian ingredients', () => {
      const item: MenuItem = {
        id: 'test-9',
        name: 'Italian Sandwich',
        description: 'Salami, brie, arugula, olive salad, pesto',
        price: 14.00,
        category: 'Focaccia Sandwiches'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('No arugula');
      expect(suggestions).toContain('No brie');
      expect(suggestions).toContain('No pesto');
    });

    it('should be case-insensitive', () => {
      const item: MenuItem = {
        id: 'test-10',
        name: 'Fancy Sandwich',
        description: 'Turkey, MAYO, Lettuce, TOMATO',
        price: 10.00,
        category: 'Sandwiches'
      };

      const suggestions = getSmartModifications(item);
      
      expect(suggestions).toContain('No mayo');
      expect(suggestions).toContain('No lettuce');
      expect(suggestions).toContain('No tomato');
    });
  });

  describe('analyzeIngredients', () => {
    it('should detect common ingredients', () => {
      const description = 'Turkey, lettuce, tomato, mayo, cheese';
      const ingredients = analyzeIngredients(description);
      
      expect(ingredients).toContain('lettuce');
      expect(ingredients).toContain('tomato');
      expect(ingredients).toContain('mayo');
      expect(ingredients).toContain('cheese');
    });

    it('should be case-insensitive', () => {
      const description = 'LETTUCE, TOMATO, MAYO';
      const ingredients = analyzeIngredients(description);
      
      expect(ingredients).toContain('lettuce');
      expect(ingredients).toContain('tomato');
      expect(ingredients).toContain('mayo');
    });

    it('should return empty array for items with no common ingredients', () => {
      const description = 'Exotic fruit salad with dragon fruit and star fruit';
      const ingredients = analyzeIngredients(description);
      
      expect(ingredients).toEqual([]);
    });

    it('should detect Mexican ingredients', () => {
      const description = 'Beef, rice, beans, guacamole, sour cream, salsa, cilantro';
      const ingredients = analyzeIngredients(description);
      
      expect(ingredients).toContain('rice');
      expect(ingredients).toContain('beans');
      expect(ingredients).toContain('guacamole');
      expect(ingredients).toContain('sour cream');
      expect(ingredients).toContain('salsa');
      expect(ingredients).toContain('cilantro');
    });
  });
});


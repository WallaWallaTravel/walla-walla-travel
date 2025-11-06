/**
 * Unit Tests for Menu Utilities
 */

import { getAllMenus, getMenuByRestaurantId } from '@/lib/menus';

describe('Menu Utilities', () => {
  describe('getAllMenus', () => {
    it('should return all menus', () => {
      const menus = getAllMenus();

      expect(menus).toBeDefined();
      expect(typeof menus).toBe('object');
    });

    it('should include Wine Country Store menu', () => {
      const menus = getAllMenus();

      expect(menus[34]).toBeDefined();
      expect(menus[34].items).toBeDefined();
      expect(menus[34].categories).toBeDefined();
      expect(Array.isArray(menus[34].items)).toBe(true);
      expect(Array.isArray(menus[34].categories)).toBe(true);
    });

    it('should include Memo\'s Tacos menu', () => {
      const menus = getAllMenus();

      expect(menus[35]).toBeDefined();
      expect(menus[35].items).toBeDefined();
      expect(menus[35].categories).toBeDefined();
    });

    it('should have valid menu items structure', () => {
      const menus = getAllMenus();
      const wcsMenu = menus[34];

      expect(wcsMenu.items.length).toBeGreaterThan(0);

      const firstItem = wcsMenu.items[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('description');
      expect(firstItem).toHaveProperty('price');
      expect(firstItem).toHaveProperty('category');
      expect(typeof firstItem.price).toBe('number');
    });
  });

  describe('getMenuByRestaurantId', () => {
    it('should return menu for valid restaurant ID', () => {
      const menu = getMenuByRestaurantId(34);

      expect(menu).not.toBeNull();
      expect(menu?.items).toBeDefined();
      expect(menu?.categories).toBeDefined();
    });

    it('should return null for invalid restaurant ID', () => {
      const menu = getMenuByRestaurantId(999);

      expect(menu).toBeNull();
    });

    it('should return Wine Country Store menu for ID 34', () => {
      const menu = getMenuByRestaurantId(34);

      expect(menu).not.toBeNull();
      expect(menu?.categories).toContain('Focaccia Sandwiches');
    });

    it('should return Memo\'s Tacos menu for ID 35', () => {
      const menu = getMenuByRestaurantId(35);

      expect(menu).not.toBeNull();
      expect(menu?.categories).toContain('Tacos');
      expect(menu?.categories).toContain('Burritos');
    });
  });

  describe('Menu Data Integrity', () => {
    it('should have all items assigned to valid categories', () => {
      const menus = getAllMenus();

      Object.values(menus).forEach(menu => {
        menu.items.forEach(item => {
          expect(menu.categories).toContain(item.category);
        });
      });
    });

    it('should have unique item IDs within each menu', () => {
      const menus = getAllMenus();

      Object.values(menus).forEach(menu => {
        const ids = menu.items.map(item => item.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
      });
    });

    it('should have positive prices for all items', () => {
      const menus = getAllMenus();

      Object.values(menus).forEach(menu => {
        menu.items.forEach(item => {
          expect(item.price).toBeGreaterThan(0);
        });
      });
    });

    it('should have non-empty descriptions', () => {
      const menus = getAllMenus();

      Object.values(menus).forEach(menu => {
        menu.items.forEach(item => {
          expect(item.description).toBeTruthy();
          expect(item.description.length).toBeGreaterThan(0);
        });
      });
    });
  });
});


/**
 * Menu Management Utilities
 * Loads restaurant menus from JSON files
 */

import wineCountryStore from '@/data/menus/wine-country-store.json';
import memosTacos from '@/data/menus/memos-tacos.json';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export interface RestaurantMenu {
  restaurantId: number;
  restaurantName: string;
  categories: string[];
  items: MenuItem[];
}

/**
 * Get all available menus
 */
export function getAllMenus(): Record<number, RestaurantMenu> {
  return {
    [wineCountryStore.restaurantId]: wineCountryStore as RestaurantMenu,
    [memosTacos.restaurantId]: memosTacos as RestaurantMenu,
  };
}

/**
 * Get menu for a specific restaurant
 */
export function getMenuByRestaurantId(restaurantId: number): RestaurantMenu | null {
  const menus = getAllMenus();
  return menus[restaurantId] || null;
}

/**
 * Get all items for a restaurant
 */
export function getMenuItems(restaurantId: number): MenuItem[] {
  const menu = getMenuByRestaurantId(restaurantId);
  return menu?.items || [];
}

/**
 * Get categories for a restaurant
 */
export function getMenuCategories(restaurantId: number): string[] {
  const menu = getMenuByRestaurantId(restaurantId);
  return menu?.categories || [];
}

/**
 * Get items by category
 */
export function getItemsByCategory(restaurantId: number, category: string): MenuItem[] {
  const items = getMenuItems(restaurantId);
  return items.filter(item => item.category === category);
}

/**
 * Find a specific menu item
 */
export function findMenuItem(restaurantId: number, itemId: string): MenuItem | null {
  const items = getMenuItems(restaurantId);
  return items.find(item => item.id === itemId) || null;
}


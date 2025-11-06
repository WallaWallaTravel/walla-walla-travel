/**
 * AI-Powered Smart Modifications
 * Analyzes menu item descriptions to suggest relevant modifications
 */

import { type MenuItem } from './menus';

/**
 * Generate smart modification suggestions based on item description
 * @param item Menu item to analyze
 * @returns Array of suggested modifications
 */
export function getSmartModifications(item: MenuItem): string[] {
  const description = item.description.toLowerCase();
  const suggestions: string[] = [];
  
  // Common ingredients to remove
  const removableIngredients = [
    { keyword: 'mayo', suggestion: 'No mayo' },
    { keyword: 'mustard', suggestion: 'No mustard' },
    { keyword: 'onion', suggestion: 'No onions' },
    { keyword: 'tomato', suggestion: 'No tomato' },
    { keyword: 'lettuce', suggestion: 'No lettuce' },
    { keyword: 'pickle', suggestion: 'No pickles' },
    { keyword: 'cheese', suggestion: 'No cheese' },
    { keyword: 'bacon', suggestion: 'No bacon' },
    { keyword: 'egg', suggestion: 'No egg' },
    { keyword: 'avocado', suggestion: 'No avocado' },
    { keyword: 'sprouts', suggestion: 'No sprouts' },
    { keyword: 'cucumber', suggestion: 'No cucumber' },
    { keyword: 'arugula', suggestion: 'No arugula' },
    { keyword: 'horseradish', suggestion: 'No horseradish' },
    { keyword: 'blue cheese', suggestion: 'No blue cheese' },
    { keyword: 'croutons', suggestion: 'No croutons' },
    { keyword: 'dressing', suggestion: 'Dressing on side' },
    { keyword: 'pico de gallo', suggestion: 'No pico de gallo' },
    { keyword: 'guacamole', suggestion: 'No guacamole' },
    { keyword: 'cilantro', suggestion: 'No cilantro' },
    { keyword: 'jalapeño', suggestion: 'No jalapeño' },
    { keyword: 'sour cream', suggestion: 'No sour cream' },
    { keyword: 'beans', suggestion: 'No beans' },
    { keyword: 'rice', suggestion: 'No rice' },
    { keyword: 'salsa', suggestion: 'No salsa' },
    { keyword: 'pineapple', suggestion: 'No pineapple' },
    { keyword: 'fig jam', suggestion: 'No fig jam' },
    { keyword: 'olive salad', suggestion: 'No olive salad' },
    { keyword: 'banana peppers', suggestion: 'No banana peppers' },
    { keyword: 'brie', suggestion: 'No brie' },
    { keyword: 'burrata', suggestion: 'No burrata' },
    { keyword: 'pesto', suggestion: 'No pesto' },
    { keyword: 'salami', suggestion: 'No salami' },
    { keyword: 'cranberry', suggestion: 'No cranberry' },
  ];

  // Check description for each ingredient
  removableIngredients.forEach(({ keyword, suggestion }) => {
    if (description.includes(keyword)) {
      suggestions.push(suggestion);
    }
  });

  // Add common extras based on category
  if (item.category.toLowerCase().includes('sandwich') || 
      item.category.toLowerCase().includes('focaccia') ||
      item.category.toLowerCase().includes('torta')) {
    if (!description.includes('cheese')) {
      suggestions.push('Add cheese');
    } else {
      suggestions.push('Extra cheese');
    }
  }

  if (item.category.toLowerCase().includes('salad')) {
    if (!description.includes('chicken')) {
      suggestions.push('Add chicken');
    }
    if (!suggestions.includes('Dressing on side')) {
      suggestions.push('Dressing on side');
    }
  }

  if (item.category.toLowerCase().includes('burrito') || 
      item.category.toLowerCase().includes('taco')) {
    if (!suggestions.includes('No sour cream')) {
      suggestions.push('Extra salsa');
    }
  }

  // Limit to 5 most relevant suggestions
  return suggestions.slice(0, 5);
}

/**
 * Analyze ingredients in a description
 * @param description Menu item description
 * @returns Array of detected ingredients
 */
export function analyzeIngredients(description: string): string[] {
  const ingredients: string[] = [];
  const commonIngredients = [
    'mayo', 'mustard', 'onion', 'tomato', 'lettuce', 'cheese',
    'bacon', 'egg', 'avocado', 'arugula', 'cilantro', 'beans',
    'rice', 'salsa', 'guacamole', 'sour cream'
  ];

  const lowerDesc = description.toLowerCase();
  commonIngredients.forEach(ingredient => {
    if (lowerDesc.includes(ingredient)) {
      ingredients.push(ingredient);
    }
  });

  return ingredients;
}


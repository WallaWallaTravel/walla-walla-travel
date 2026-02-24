/**
 * Brand color hex values for use in inline styles and non-Tailwind contexts.
 *
 * For Tailwind classes, use the theme tokens directly:
 *   bg-brand, text-brand, border-brand, hover:bg-brand-hover, bg-brand-light, etc.
 *
 * These are defined in tailwind.config.ts under theme.extend.colors.brand.
 */
export const BRAND = {
  primary: '#8B1538',
  primaryHover: '#7A1230',
  primaryLight: '#FDF2F4',
} as const;

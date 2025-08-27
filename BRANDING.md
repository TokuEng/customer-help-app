# Toku Help Center Branding Guide

## Overview
This document outlines the branding implementation for the Toku Help Center, including color tokens, typography, components, and instructions for customization.

## Brand Colors

### Primary Color: Toku Blue (#1F5AE0)
The entire Help Center uses Toku's signature blue as the primary brand color. This color is used for:
- Links and interactive elements
- Focus states and outlines
- Badges and accents
- Header elements and icons

### Color Tokens
All brand colors are defined as CSS variables in `apps/web/app/globals.css`:

```css
:root {
  --toku: #1F5AE0;        /* PRIMARY - Main brand color */
  --toku-700: #1748B8;    /* Darker shade for hover states */
  --toku-500: #3C73FF;    /* Lighter shade for gradients */
  --toku-50:  #EEF4FF;    /* Very light shade for backgrounds */
}
```

### One-Point Brand Color Update
To change the brand color throughout the entire application:
1. Open `apps/web/app/globals.css`
2. Update the `--toku` variable to your new primary color
3. Optionally update the related shades (700, 500, 50) to match your new color

The entire site will automatically inherit the new color scheme.

## Typography

### Font: Nunito
The Help Center uses Nunito as the primary font family, loaded from Google Fonts. This provides a friendly, readable experience across all content.

## Components

### Header (`components/Header.tsx`)
- Left-aligned Toku logo
- Right-aligned navigation (Home, Search)
- White background with subtle bottom border
- Sticky positioning for easy navigation

### Footer (`components/Footer.tsx`)
- Brand wave banner at the top
- Minimal links (Contact, Privacy)
- Small Toku logo
- Copyright notice

### Badge (`components/Badge.tsx`)
Custom badge component with type-specific colors:
- **How-To**: Teal (#14B8A6)
- **Guide**: Green (#10B981)
- **Policy**: Purple (#9333EA)
- **FAQ**: Indigo (#6366F1)
- **Process**: Orange (#F97316)
- **Info**: Slate (#64748B)

Category badges use their respective colors:
- **Library**: Indigo
- **Token Payroll**: Teal
- **Benefits**: Pink
- **Policy**: Purple

### Search Components
- **SearchBar**: Uses primary color for focus states
- **SearchFilters**: Radio buttons styled with brand color
- **ResultCard**: Hover state with primary color outline

## Page Styling

### Home Page
- Thin brand gradient bar at the top
- Hero section with "How can we help you?" heading
- Category cards with brand surface hover effect
- Popular articles section

### Search Page
- Filters sidebar with branded radio buttons
- Result cards with type and category badges
- Hover effects using primary color

### Article Page
- Type and category badges above title
- Reading time and last updated metadata
- Prose content with branded links and blockquotes
- Related articles sidebar with hover effects

## Focus States & Accessibility
All interactive elements use consistent focus states:
- `focus-visible:ring-2`
- `focus-visible:ring-primary`
- `focus-visible:ring-offset-2`

This ensures WCAG AA compliance and consistent keyboard navigation.

## Brand Assets

### Logo
- Location: `/apps/web/public/brand/toku-logo.svg`
- Used in Header and Footer components
- Includes "Help Center" text

### Wave Banner
- Location: `/apps/web/public/brand/brand-wave.svg`
- Used in Footer component
- Creates visual brand consistency

### Favicons
- `app/favicon.ico` - Main favicon file
- Theme color set to #1F5AE0 in metadata
- To update: Replace `app/favicon.ico` with your branded icon

## Utility Classes

### `.brand-gradient`
Creates a gradient from primary to lighter shade:
```css
background: linear-gradient(90deg, var(--toku) 0%, var(--toku-500) 100%);
```

### `.brand-surface`
Light brand-colored background:
```css
background: var(--toku-50);
```

### `.prose-brand`
Typography styling for article content:
- Links in brand color with 2px underline
- Blockquotes with brand-colored left border
- Brand surface background for code blocks

## Implementation Notes

1. **Tailwind CSS v4**: The project uses Tailwind CSS v4 with CSS-based configuration
2. **Color System**: All colors use CSS variables for easy theming
3. **Component Architecture**: Modular components for easy maintenance
4. **Responsive Design**: All components are mobile-friendly
5. **Dark Mode**: Currently not implemented but structure supports future addition

## Quick Reference

### To update brand elements:
- **Primary Color**: Edit `--toku` in `globals.css`
- **Logo**: Replace `/public/brand/toku-logo.svg`
- **Font**: Update Google Fonts import in `globals.css`
- **Focus Color**: Update `--ring` variable
- **Gradients**: Update `.brand-gradient` class

### Key Files:
- `apps/web/app/globals.css` - All brand tokens and utilities
- `apps/web/components/Badge.tsx` - Badge color mappings
- `apps/web/components/Header.tsx` - Main navigation
- `apps/web/components/Footer.tsx` - Footer with wave
- `apps/web/app/article.css` - Article-specific styling

# GST Invoice System - Mobile Style Guide

## Mobile-First Design Approach

This document outlines the mobile-optimized UI patterns and classes that should be used throughout the GST Invoice System to ensure consistent spacing and alignment on all devices, particularly mobile screens.

## Padding Guidelines

### Base Padding
- Standard mobile padding: `0.75rem` (12px)
- Tablet padding: `1rem` (16px)
- Desktop padding: `1.5rem` (24px)

### Utility Classes

**Mobile Content Wrappers**
- `.mobile-content-wrapper` - Provides proper horizontal padding on all screen sizes
- `.content-container` - Responsive padding on all sides

**Responsive Padding**
- `.responsive-padding` - Full padding on all sides that adjusts by breakpoint
- `.responsive-padding-x` - Horizontal padding that adjusts by breakpoint
- `.responsive-padding-y` - Vertical padding that adjusts by breakpoint
- `.mobile-padding-all` - Consistent 0.75rem padding on all sides (mobile-specific)
- `.mobile-padding-x` - Horizontal padding of 0.75rem (mobile-specific)
- `.mobile-padding-y` - Vertical padding of 0.75rem (mobile-specific)

### Safe Areas for Mobile Devices
The `.safe-area` class ensures content respects device notches and home indicators:
- Bottom padding: `env(safe-area-inset-bottom)`
- Left padding: `env(safe-area-inset-left)`
- Right padding: `env(safe-area-inset-right)`

## Mobile Component Guidelines

### Cards and Containers
- Use `.mobile-card` for consistent card styling with proper padding
- Use `.card-enhanced` for elevated card components with responsive shadow depths

### Forms and Inputs
- All form inputs should use `.input-enhanced` with minimum 44px touch targets
- Group form fields using `.form-grid-mobile` for responsive column layouts
- Form sections should use `.form-section-mobile` with appropriate padding

### Tables
- All tables should convert to card views on mobile using `.table-mobile-wrapper`
- Use `.invoice-item-mobile` for mobile-optimized invoice items

### Text Sizing
- Base text: `.text-responsive` (14px on mobile, 16px on larger screens)
- Large text: `.text-responsive-large` (18px → 20px → 24px)
- Small text: `.text-responsive-small` (12px → 14px)

### Touch Targets
- Minimum touch target size: 44px × 44px
- Use `.touch-target` or `.touch-spacing` utility classes

## Responsive Breakpoints

- Mobile: < 640px
- Tablet: 641px - 1024px
- Desktop: > 1025px

## Accessibility Considerations

- Use `.focus-enhanced:focus` for better keyboard focus indicators
- Ensure all interactive elements have appropriate padding for touch targets

## Testing Guidelines

1. Test all pages at 320px, 375px, and 414px widths (common mobile sizes)
2. Verify consistent padding on all UI elements
3. Check that all interactive elements have appropriate touch targets
4. Test safe area insets on devices with notches

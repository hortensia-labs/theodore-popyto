# Accessibility Checklist

**Standard:** WCAG 2.1 Level AA  
**Target:** Full keyboard navigation and screen reader support  
**Date:** November 14, 2025

---

## ✅ Keyboard Navigation

### Global Navigation
- [ ] Tab key navigates through all interactive elements in logical order
- [ ] Shift+Tab navigates backwards
- [ ] Enter activates buttons and links
- [ ] Space activates buttons
- [ ] Escape closes modals and clears focus
- [ ] Arrow keys navigate within components (dropdowns, radio groups)
- [ ] Keyboard shortcuts work throughout (p, i, m, r, a, ?, Escape)

### Table Navigation
- [ ] Can navigate table rows with arrow keys
- [ ] Tab moves between interactive elements within row
- [ ] Enter opens detail panel
- [ ] Space toggles checkbox selection

### Modal Navigation
- [ ] Focus trapped within modal when open
- [ ] First focusable element receives focus on open
- [ ] Tab cycles through modal elements only
- [ ] Escape closes modal
- [ ] Focus returns to trigger element on close

### Form Navigation
- [ ] Tab moves between form fields
- [ ] Labels properly associated with inputs
- [ ] Required fields indicated
- [ ] Error messages announced
- [ ] Submit on Enter in text inputs

---

## ✅ Screen Reader Support

### Semantic HTML
- [ ] All buttons use `<button>` element
- [ ] All links use `<a>` element
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Lists use `<ul>/<ol>` with `<li>`
- [ ] Tables use proper structure (thead, tbody, th, td)

### ARIA Labels
- [ ] All icons have aria-label or aria-labelledby
- [ ] Status badges have aria-label describing state
- [ ] Interactive elements have descriptive labels
- [ ] Complex widgets have appropriate ARIA roles
- [ ] Loading states announced with aria-live
- [ ] Error messages use aria-describedby

### Specific Components

**ProcessingStatusBadge:**
- [ ] aria-label includes full status name
- [ ] Tooltip text available to screen readers
- [ ] Animated states announced

**CapabilityIndicator:**
- [ ] Each capability has descriptive label
- [ ] Available/unavailable state clear
- [ ] Summary count readable

**URLTable:**
- [ ] Table has caption or aria-label
- [ ] Column headers have scope="col"
- [ ] Selection state announced
- [ ] Sort order announced

**Modals:**
- [ ] role="dialog"
- [ ] aria-labelledby points to title
- [ ] aria-describedby for description
- [ ] aria-modal="true"

---

## ✅ Visual Accessibility

### Color Contrast
- [ ] All text meets WCAG AA contrast ratio (4.5:1 normal, 3:1 large)
- [ ] Status badges meet contrast requirements
- [ ] Links distinguishable without color alone
- [ ] Focus indicators visible (not just color)
- [ ] Error states not conveyed by color alone

### Focus Indicators
- [ ] Visible focus outline on all interactive elements
- [ ] Focus outline has 3:1 contrast ratio
- [ ] Focus outline not removed with CSS
- [ ] Focus visible in all states (hover, active, etc.)

### Text & Typography
- [ ] Minimum font size 14px for body text
- [ ] Line height at least 1.5 for body text
- [ ] Text can be resized to 200% without loss of functionality
- [ ] No horizontal scrolling at 320px width

---

## ✅ Forms & Inputs

### Labels & Instructions
- [ ] All form fields have associated labels
- [ ] Labels visible (not placeholder-only)
- [ ] Required fields clearly marked
- [ ] Help text available where needed
- [ ] Error messages specific and actionable

### Error Handling
- [ ] Errors announced to screen readers
- [ ] Error messages associated with fields (aria-describedby)
- [ ] Errors don't rely on color alone
- [ ] Clear instructions on how to fix errors

### Validation
- [ ] Real-time validation doesn't interrupt typing
- [ ] Validation messages polite (aria-live="polite")
- [ ] Success states announced
- [ ] Required field indicators consistent

---

## ✅ Interactive Components

### Buttons
- [ ] Disabled buttons have aria-disabled
- [ ] Button purpose clear from label or aria-label
- [ ] Loading states announced
- [ ] Icon-only buttons have accessible name

### Links
- [ ] Link purpose clear from text or context
- [ ] External links indicated
- [ ] Links distinguishable from text

### Dropdowns & Selects
- [ ] Label associated with select
- [ ] Current value announced
- [ ] Options navigable with arrow keys
- [ ] Enter selects option

### Checkboxes
- [ ] Label associated with checkbox
- [ ] Checked state clear
- [ ] Indeterminate state supported
- [ ] Group checkboxes have group label

---

## ✅ Dynamic Content

### Loading States
- [ ] Loading announced with aria-live="polite"
- [ ] Loading spinner has alt text
- [ ] Skeleton loaders don't confuse screen readers

### Error Messages
- [ ] Errors announced with aria-live="assertive"
- [ ] Error icon has descriptive alt text
- [ ] Error dismissible or auto-clears

### Success Messages
- [ ] Success announced with aria-live="polite"
- [ ] Success icon has descriptive alt text
- [ ] Auto-dismiss doesn't interrupt other content

### Live Regions
- [ ] Batch progress updates use aria-live
- [ ] Status changes announced
- [ ] Updates don't interrupt user

---

## ✅ Modal Dialogs

### Focus Management
- [ ] Focus moves to modal on open
- [ ] Focus trapped within modal
- [ ] Focus returns to trigger on close
- [ ] First focusable element focused

### Keyboard Support
- [ ] Escape closes modal
- [ ] Tab cycles through modal only
- [ ] Enter submits if appropriate
- [ ] Arrow keys navigate if appropriate

### Screen Reader Support
- [ ] role="dialog"
- [ ] aria-labelledby for title
- [ ] aria-modal="true"
- [ ] Backdrop announced or hidden

---

## ✅ Tables

### Structure
- [ ] Proper table markup (table, thead, tbody, tr, th, td)
- [ ] Column headers use <th> with scope="col"
- [ ] Row headers use <th> with scope="row" if applicable
- [ ] Caption or aria-label describes table purpose

### Navigation
- [ ] Can navigate cells with arrow keys
- [ ] Current cell announced
- [ ] Headers announced when navigating
- [ ] Sort controls accessible

### Selection
- [ ] Checkbox in first column
- [ ] Select all checkbox in header
- [ ] Selection count announced
- [ ] Bulk actions available

---

## ✅ Images & Icons

### Decorative Images
- [ ] Decorative images have alt=""
- [ ] Decorative icons hidden from screen readers (aria-hidden="true")

### Informative Images
- [ ] Informative images have descriptive alt text
- [ ] Icons used for actions have aria-label
- [ ] Status icons have meaningful alt text

---

## ✅ Responsive & Zoom

### Responsive Design
- [ ] Works at 320px width
- [ ] No horizontal scrolling
- [ ] Touch targets minimum 44x44px
- [ ] Content reflows appropriately

### Zoom & Text Resize
- [ ] No loss of content at 200% zoom
- [ ] No loss of functionality at 200% zoom
- [ ] Text remains readable
- [ ] Layouts don't break

---

## 🔧 Testing Tools

### Automated Testing
```bash
# Install axe-core for automated testing
pnpm add -D @axe-core/react

# Run in development
import { useEffect } from 'react';
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

### Manual Testing
- [ ] Test with keyboard only (unplug mouse)
- [ ] Test with screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Test with browser zoom (200%)
- [ ] Test with reduced motion preference
- [ ] Test with high contrast mode

### Browser Extensions
- [ ] axe DevTools
- [ ] WAVE Accessibility Checker
- [ ] Lighthouse Accessibility Audit

---

## 📋 Component-Specific Checks

### ProcessingStatusBadge
- [x] Has aria-label with full status description
- [x] Color not sole indicator (includes icon/text)
- [x] Tooltip accessible to screen readers
- [x] Animation respects prefers-reduced-motion

### URLTable
- [ ] Add table caption
- [ ] Add aria-label for checkboxes
- [ ] Ensure row click has keyboard equivalent
- [ ] Status changes announced

### Modals
- [x] All modals have proper dialog role
- [x] Focus management implemented
- [x] Escape closes modal
- [ ] Verify focus trap works in all modals

### Forms
- [ ] All labels associated
- [ ] Required fields marked
- [ ] Validation messages use aria-describedby
- [ ] Error summaries at form top

---

## 🎯 Priority Fixes

### High Priority
1. Ensure all interactive elements keyboard accessible
2. Add aria-labels to icon-only buttons
3. Verify focus management in modals
4. Test with screen reader

### Medium Priority
1. Add aria-live regions for status updates
2. Ensure proper heading hierarchy
3. Test keyboard shortcuts don't conflict
4. Verify color contrast on all text

### Low Priority
1. Add skip links for keyboard users
2. Ensure animations respect reduced motion
3. Test with browser zoom
4. Add ARIA landmarks

---

## ✅ Quick Wins (Easy Fixes)

1. **Add ARIA labels to icon buttons:**
```typescript
<Button aria-label="Process URL">
  <Database className="h-4 w-4" />
</Button>
```

2. **Add table caption:**
```typescript
<table aria-label="URL processing table">
```

3. **Add role to live regions:**
```typescript
<div aria-live="polite" aria-atomic="true">
  {successMessage}
</div>
```

4. **Respect reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
}
```

---

## 📖 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe Accessibility Testing](https://www.deque.com/axe/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

---

**Status:** Ready for Phase 6 testing  
**Priority:** Complete high-priority items first  
**Estimated Time:** 3-4 hours for full compliance


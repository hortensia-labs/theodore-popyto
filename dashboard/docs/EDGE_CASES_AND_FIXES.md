# Edge Cases & Bug Fixes Guide

**Purpose:** Document known edge cases and their handling  
**For:** Phase 6 testing and validation  
**Date:** November 14, 2025

---

## 🐛 Common Edge Cases

### 1. Network Errors During Processing

**Scenario:** Network drops while processing URL  
**Handling:**
```typescript
// Error categorized as 'network'
// Auto-retry with exponential backoff (2s, 4s, 8s, 16s)
// Max 3 retries before marking as failed
// User can manually retry later
```

**Test:**
- Disconnect network during processing
- Should show error message
- Should record in processing history
- Should allow retry

### 2. Concurrent Processing of Same URL

**Scenario:** User clicks process while URL is already processing  
**Handling:**
```typescript
// Guard check prevents duplicate processing
if (url.processingStatus.startsWith('processing_')) {
  return { success: false, error: 'URL is already being processed' };
}
```

**Test:**
- Rapidly click process button
- Should only process once
- Button should be disabled during processing

### 3. Zotero API Unavailable

**Scenario:** Zotero not running or API not responding  
**Handling:**
```typescript
// Categorized as 'zotero_api' error
// Shows clear error message
// Auto-cascades to content extraction
// User can retry when Zotero is available
```

**Test:**
- Stop Zotero
- Try processing URL
- Should cascade to content extraction
- Should show helpful error message

### 4. Invalid Identifiers

**Scenario:** Identifier looks valid but Zotero rejects it  
**Handling:**
```typescript
// Zotero returns error
// Categorized as 'validation' error
// Doesn't retry (permanent)
// Auto-cascades to next stage
// Identifier marked as failed in database
```

**Test:**
- Process URL with malformed DOI
- Should fail gracefully
- Should try next available method

### 5. Malformed PDFs

**Scenario:** PDF file is corrupted or password-protected  
**Handling:**
```typescript
// Parsing fails with descriptive error
// Categorized as 'parsing' error
// Doesn't retry
// User can try manual creation with PDF viewer
```

**Test:**
- Process URL pointing to corrupted PDF
- Should show error
- Manual creation should still display PDF
- User can create item manually

### 6. Very Long URLs

**Scenario:** URL exceeds 2000 characters  
**Handling:**
```typescript
// Display truncated in table: formatUrlForDisplay()
// Full URL in tooltip
// Full URL in detail panel
// No truncation in database
```

**Test:**
- Add URL with 3000+ characters
- Should display correctly
- Should process correctly

### 7. Unicode in Metadata

**Scenario:** Titles/creators with emoji or non-Latin characters  
**Handling:**
```typescript
// SQLite supports UTF-8
// No special handling needed
// Displays correctly in UI
// Zotero handles Unicode properly
```

**Test:**
- Create item with emoji in title: "My Article 🎉"
- Should store and display correctly

### 8. Empty Content

**Scenario:** URL returns 200 but empty body  
**Handling:**
```typescript
// Detected as no content
// Can't extract identifiers
// Marked for LLM or manual creation
// Clear error message to user
```

**Test:**
- URL with empty response
- Should handle gracefully
- Suggest manual creation

---

## 🔧 Race Condition Fixes

### 1. Filter Change During Loading

**Issue:** User changes filters while URLs are loading  
**Fix:**
```typescript
// Use transition state to prevent concurrent loads
const [isPending, startTransition] = useTransition();

// Latest filter values always used
// Previous fetch ignored if new one starts
```

### 2. Selection After Data Refresh

**Issue:** Selected URLs no longer in filtered results  
**Fix:**
```typescript
// Selection persists across filters
// Invalid selections cleaned up on action
// Clear button explicitly clears selection
```

### 3. Batch Pause/Resume Race

**Issue:** Pausing while processing an item  
**Fix:**
```typescript
// Check pause state before each item
await waitIfPaused(sessionId);

// Current item completes before pausing
// Clean pause between items
```

---

## 🚨 Error Handling Patterns

### Pattern 1: Graceful Degradation

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  // Log error
  console.error('Operation failed:', error);
  
  // Show user-friendly message
  setError('Unable to complete operation. Please try again.');
  
  // Provide fallback
  return fallbackValue;
}
```

### Pattern 2: Retry with Backoff

```typescript
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000;
      await sleep(delay);
    }
  }
}
```

### Pattern 3: User Confirmation for Destructive Actions

```typescript
const handleDelete = async () => {
  const confirmed = confirm('Are you sure?');
  if (!confirmed) return;
  
  // Double confirm for extra safety
  const doubleConfirm = confirm('This cannot be undone. Continue?');
  if (!doubleConfirm) return;
  
  await deleteOperation();
};
```

---

## 🎯 Critical Fixes Required for Phase 6

### High Priority

1. **Fix React Import in usePerformanceOptimization.ts**
```typescript
// Current (breaks):
const [isIntersecting, setIsIntersecting] = React.useState(false);

// Fix:
import { useState } from 'react';
const [isIntersecting, setIsIntersecting] = useState(false);
```

2. **Add Missing Dependencies**
```bash
# For virtualization (if using)
pnpm add react-window

# Or use @tanstack/react-virtual
pnpm add @tanstack/react-virtual
```

3. **Wire Modal Triggers in URLTableNew**
```typescript
// Replace TODOs with actual modal state management
const [manualCreateModalOpen, setManualCreateModalOpen] = useState(false);
// etc.
```

### Medium Priority

1. **Add ARIA labels to icon buttons**
2. **Implement suggestion action handlers in SmartSuggestions**
3. **Add table virtualization toggle based on dataset size**
4. **Implement keyboard shortcut handlers in URLTableNew**

### Low Priority

1. **Add loading skeletons to all loading states**
2. **Add empty states to all lists**
3. **Smooth animations with CSS transitions**
4. **Add reduced-motion support**

---

## 🧪 Test Scenarios for Phase 6

### User Journey Tests

1. **Happy Path: Process URL Successfully**
   - Import URLs
   - Filter to processable
   - Select one
   - Click process
   - Verify stored

2. **Auto-Cascade Path**
   - Process URL
   - Zotero fails
   - Auto-cascades to content
   - Finds identifiers
   - User selects
   - Stores successfully

3. **Manual Creation Path**
   - Process fails (exhausted)
   - User clicks manual create
   - Views content in modal
   - Fills metadata
   - Creates custom item
   - Verifies stored_custom status

4. **Citation Editing Path**
   - URL stored but incomplete
   - User clicks edit
   - Adds missing fields
   - Saves
   - Status changes to stored

5. **Batch Processing Path**
   - Select 50 URLs
   - Click bulk process
   - Monitor progress
   - Pause halfway
   - Resume
   - Complete successfully

### Error Path Tests

1. **Network error** → Retry → Success
2. **Invalid identifier** → Auto-cascade → Find another
3. **Zotero offline** → Clear error → Suggest content extraction
4. **Parse error** → Suggest manual creation
5. **Rate limit** → Wait and retry automatically

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] No TypeScript errors
- [ ] No linter errors (except known exceptions)
- [ ] All tests passing
- [ ] 85%+ test coverage
- [ ] No console errors in production

### Functionality
- [ ] All 12 status types work correctly
- [ ] Auto-cascade works for all failure scenarios
- [ ] All modals open and close correctly
- [ ] All forms validate correctly
- [ ] Batch processing works with pause/resume
- [ ] Export functionality works
- [ ] Keyboard shortcuts work
- [ ] Filters work correctly

### Performance
- [ ] Table renders smoothly with 1000+ URLs
- [ ] No memory leaks detected
- [ ] Bundle size acceptable (< 500KB gzipped)
- [ ] Lighthouse score 90+
- [ ] No performance warnings

### Accessibility
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces all actions
- [ ] Focus management works in modals
- [ ] Color contrast meets WCAG AA
- [ ] axe DevTools shows no errors

### Data Safety
- [ ] Migration completed successfully
- [ ] No data loss
- [ ] Rollback tested and works
- [ ] Zotero item deletion safety checks work
- [ ] Processing history preserved

---

## 🔍 Debugging Tips

### Check Processing State
```typescript
// In browser console:
const url = await getUrlWithCapabilitiesById(123);
console.log(url.data.processingStatus);
console.log(url.data.processingHistory);
```

### Verify State Transitions
```typescript
// Check if transition is valid:
import { URLProcessingStateMachine } from '@/lib/state-machine/url-processing-state-machine';

URLProcessingStateMachine.canTransition('not_started', 'stored');
// Should return false (invalid)
```

### Test Guards
```typescript
import { StateGuards } from '@/lib/state-machine/state-guards';

StateGuards.getAvailableActions(url);
// Returns array of valid actions
```

---

**Status:** Ready for Phase 6 testing  
**Priority:** Test all edge cases thoroughly  
**Critical:** Don't skip data safety tests


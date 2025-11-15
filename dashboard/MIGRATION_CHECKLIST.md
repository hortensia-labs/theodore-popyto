# Database Migration Checklist

**Migration:** URL Processing Status System Refactor  
**Version:** 0014  
**Date:** November 14, 2025  

---

## ⚠️ IMPORTANT: Read Before Proceeding

This migration adds the new URL processing status system. It is **safe** and has **rollback scripts**, but you should still follow best practices.

**Estimated Time:** 5-10 minutes  
**Downtime Required:** Yes (stop application during migration)  
**Reversible:** Yes (rollback script provided)

---

## Pre-Migration Checklist

### Step 1: Backup Database ✋ **CRITICAL**

```bash
cd dashboard/data
cp thesis.db thesis_backup_$(date +%Y%m%d_%H%M%S).db
ls -lh thesis*
```

**Verify:** You should see both `thesis.db` and a backup file

### Step 2: Stop Application

```bash
# If dashboard is running, stop it
# Press Ctrl+C in terminal running the dev server
```

**Verify:** No processes accessing `thesis.db`

### Step 3: Test Migration on Copy

```bash
# Create test copy
cp thesis.db thesis_test.db

# Apply migration to test database
sqlite3 thesis_test.db < ../drizzle/migrations/0014_add_processing_status.sql

# Check for errors in output
```

**Verify:** No SQL errors in output

---

## Migration Execution

### Step 4: Validate Test Migration

```bash
cd ..

# IMPORTANT: Temporarily edit scripts/validate-migration.ts
# Change the DB path to point to thesis_test.db for this test
# Then run:

pnpm tsx scripts/validate-migration.ts
```

**Expected Output:**

```
✅ ALL VALIDATION CHECKS PASSED!
Migration completed successfully.
```

**If ANY checks fail:**

- ❌ DO NOT PROCEED
- Review the PHASE_1_COMPLETION.md document
- Check known issues section
- Seek assistance if needed

### Step 5: Apply to Production Database

```bash
# Make sure you're in dashboard/
cd dashboard

# Generate Drizzle migration (if needed)
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit migrate
```

**Verify:** No errors in output

### Step 6: Validate Production Migration

```bash
# Run validation on production database
pnpm tsx scripts/validate-migration.ts
```

**Expected:** All checks PASS

### Step 7: Run Data Migration Helper

```bash
# First, dry-run to preview changes
pnpm tsx scripts/migrate-url-statuses.ts --dry-run

# Review output, then execute
pnpm tsx scripts/migrate-url-statuses.ts --execute
```

**Expected Output:**

```
📋 MIGRATION SUMMARY
====================================================================
Total URLs processed: [your count]
Status Migrations:
  → stored: [count]
  → stored_incomplete: [count]
  → not_started (from failed): [count]
  → unchanged: [count]
Zotero Links Created: [count]
Processing Histories Built: [count]
✅ No errors encountered
====================================================================
✅ Migration completed successfully!
```

### Step 8: Final Validation

```bash
# Run validation one more time
pnpm tsx scripts/validate-migration.ts
```

**All checks should PASS**

---

## Post-Migration Checklist

### Step 9: Start Application

```bash
# In dashboard directory
pnpm dev
```

**Verify:** Application starts without errors

### Step 10: Basic Functionality Test

**Open dashboard:** http://localhost:3000/urls

**Check:**

- [ ] URL table loads
- [ ] URLs display correctly
- [ ] No console errors
- [ ] Can view URL details
- [ ] Filters work
- [ ] No TypeScript errors in terminal

### Step 11: Verify New Fields

**Open database:**

```bash
sqlite3 data/thesis.db
```

**Run queries:**

```sql
-- Check new columns exist
.schema urls

-- Check data
SELECT 
  id,
  url,
  processing_status,
  user_intent,
  processing_attempts
FROM urls
LIMIT 5;

-- Check link table
SELECT COUNT(*) FROM zotero_item_links;

-- Exit
.exit
```

**Verify:** New columns exist and have data

---

## ✅ Success Criteria

Migration is successful if:

- [x] All validation checks PASS
- [x] Application starts without errors
- [x] URL table displays correctly
- [x] New columns contain expected data
- [x] Link table has records for stored URLs
- [x] No data loss (row counts match)

---

## 🔄 Rollback Procedure (If Needed)

If anything goes wrong:

### Option 1: Restore Backup

```bash
cd dashboard/data

# Stop application first!

# Restore backup
cp thesis_backup_[YOUR_TIMESTAMP].db thesis.db

# Restart application
cd ..
pnpm dev
```

### Option 2: Run Rollback Script

```bash
cd dashboard

# Stop application first!

# Run rollback
sqlite3 data/thesis.db < drizzle/migrations/0014_add_processing_status_rollback.sql

# Restart application
pnpm dev
```

**Note:** Rollback will remove all new columns and the links table, but preserve original data.

---

## 📋 Quick Reference

### Migration Files

- **Forward:** `drizzle/migrations/0014_add_processing_status.sql`
- **Rollback:** `drizzle/migrations/0014_add_processing_status_rollback.sql`
- **Validation:** `scripts/validate-migration.ts`
- **Data Helper:** `scripts/migrate-url-statuses.ts`

### New Database Fields

- `processing_status` (TEXT, NOT NULL, DEFAULT 'not_started')
- `user_intent` (TEXT, NOT NULL, DEFAULT 'auto')
- `processing_attempts` (INTEGER, NOT NULL, DEFAULT 0)
- `processing_history` (TEXT, JSON array)
- `last_processing_method` (TEXT, nullable)
- `created_by_theodore` (INTEGER, boolean, DEFAULT 0)
- `user_modified_in_zotero` (INTEGER, boolean, DEFAULT 0)
- `linked_url_count` (INTEGER, DEFAULT 0)

### New Table

- `zotero_item_links` (item_key, url_id, created_by_theodore, user_modified, linked_at)

---

## 🆘 Troubleshooting

### Issue: Validation check fails

**Solution:** Review the specific check that failed. Most common:

- Invalid JSON in processing_history → Run data migration helper
- Missing link records → Run: `pnpm tsx scripts/migrate-url-statuses.ts --execute`

### Issue: Application won't start

**Solution:**

1. Check for TypeScript errors: `pnpm tsc --noEmit`
2. Check database connection
3. Review terminal output for specific error

### Issue: SQLite error during migration

**Solution:**

1. Stop and rollback
2. Check SQLite version: `sqlite3 --version` (should be 3.35+)
3. Verify database isn't corrupted: `sqlite3 data/thesis.db "PRAGMA integrity_check;"`

### Issue: "No such column" errors

**Solution:** Migration didn't apply correctly. Run:

```bash
sqlite3 data/thesis.db ".schema urls" | grep processing_status
```

If empty, re-run migration.

---

## 📞 Support

If you encounter issues:

1. Review `docs/PHASE_1_COMPLETION.md` for known issues
2. Check validation output for specific failures
3. Review migration SQL for what's expected
4. Use rollback if unsure

---

## ✨ After Migration Success

Once migration is complete and validated:

1. ✅ Mark Task 1.3 as complete
2. ✅ Review Phase 1 Summary document
3. ✅ Ready to proceed to Phase 2 (Server Actions)

**Congratulations!** The foundation is solid and you're ready for the next phase!

---

**Last Updated:** November 14, 2025  
**Status:** Ready for execution  
**Risk Level:** 🟢 Low (with proper backup)

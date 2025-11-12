# Theodore Dashboard

A Next.js dashboard for managing and enriching URLs from the Theodore thesis project.

## Features

- **URL Management**: View, filter, and search through URLs from thesis sections
- **Status Classification**: Automatic classification of URLs based on analysis:
  - 🟢 **Extractable**: URLs with valid identifiers
  - 🔵 **Translatable**: URLs with web translators
  - 🌸 **Resolvable**: URLs with AI translation
  - 🔴 **Error**: URLs with errors or inaccessibility issues
- **Enrichment**: Add custom identifiers and notes to URLs
- **Statistics**: Overview dashboard with status distribution and enrichment progress
- **Sync Management**: Import and update URLs from `urls-report.json` files

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Database**: SQLite with Drizzle ORM
- **UI**: Tailwind CSS with Radix UI components
- **TypeScript**: Full type safety

## Setup

### Prerequisites

- Node.js 20+ 
- pnpm 10+

### Installation

1. Navigate to the dashboard directory:
```bash
cd dashboard
```

2. Install dependencies:
```bash
pnpm install
```

3. Build better-sqlite3 (if not already built):
```bash
cd node_modules/.pnpm/better-sqlite3@12.4.1/node_modules/better-sqlite3 && npm run build-release
```

4. Run migrations:
```bash
npx tsx migrate.ts
```

5. Import initial data:
```bash
pnpm db:import
```

### Development

Start the development server:
```bash
pnpm dev
```

The dashboard will be available at `http://localhost:3000`

## Database Management

### Migrations

Generate a new migration after schema changes:
```bash
pnpm db:generate
```

Apply migrations:
```bash
npx tsx migrate.ts
```

### Import Data

Import URLs from a section's `urls-report.json`:
```bash
pnpm db:import
```

Or use the Sync Panel in the UI for manual syncing.

## Project Structure

```
dashboard/
├── app/                  # Next.js App Router pages
│   ├── page.tsx         # Homepage with stats and sync
│   ├── urls/            # URL management page
│   └── stats/           # Detailed statistics page
├── components/          # React components
│   ├── sync/           # Sync-related components
│   ├── urls/           # URL table and enrichment forms
│   └── ui/             # Reusable UI components
├── lib/
│   ├── db/             # Database client and schema
│   │   ├── client.ts   # Drizzle client
│   │   ├── schema.ts   # Database schema
│   │   └── computed.ts # Status computation logic
│   ├── actions/        # Server actions
│   │   ├── urls.ts     # URL CRUD operations
│   │   ├── enrichments.ts # Enrichment management
│   │   ├── import.ts   # Data import/sync
│   │   └── stats.ts    # Statistics aggregation
│   └── importers/      # JSON parsing logic
│       └── urls-report.ts
├── drizzle/            # Database migrations
├── data/               # SQLite database file (gitignored)
└── migrate.ts          # Migration script
```

## Database Schema

### Tables

- **sections**: Thesis sections with URL reports
- **urls**: Base URL data from reports
- **url_analysis_data**: Analysis fields (identifiers, translators, AI translation)
- **url_enrichments**: User-added notes and custom identifiers
- **url_metadata**: Flexible JSON storage for additional metadata
- **import_history**: Track sync operations

### Status Computation

URL statuses are computed based on priority:
1. **error**: `!success OR statusCode >= 400 OR hasErrors`
2. **extractable**: `validIdentifiers.length > 0`
3. **translatable**: `webTranslators.length > 0`
4. **resolvable**: `aiTranslation === true`
5. **unknown**: Fallback

## Usage

### Syncing a Section

1. Go to the homepage
2. Find the section you want to sync
3. Click "Check Status" to see if updates are available
4. Click "Preview Changes" to see what will be imported
5. Click "Sync Now" to import the data

### Managing URLs

1. Navigate to "URL Management"
2. Use filters to find specific URLs:
   - Search by URL text
   - Filter by section
   - Filter by status
   - Filter by domain
3. Select URLs to bulk delete (if needed)
4. Click "View" on any URL to:
   - See detailed information
   - Add custom identifiers
   - Add notes

### Viewing Statistics

- Homepage shows an overview with status distribution
- Navigate to "Detailed Stats" for more in-depth analytics

## Notes

- The database file is stored in `data/thesis.db` and is gitignored
- URL data is imported from `../sections/[section-name]/references/urls-report.json`
- User enrichments (notes, custom identifiers) persist across reimports
- The app runs locally and is not designed for deployment

## Troubleshooting

### better-sqlite3 build issues

If you encounter build issues with better-sqlite3:

```bash
cd node_modules/.pnpm/better-sqlite3@12.4.1/node_modules/better-sqlite3
npm run build-release
cd ../../../../../..
```

### Database locked errors

If you get database locked errors, make sure only one instance of the app is running.

### Missing sections

If sections don't appear, ensure:
1. The section has a `references/urls-report.json` file
2. The path `../sections/` is correct relative to the dashboard directory
3. Run the import script or use the Sync Panel

## License

Part of the Theodore thesis project.

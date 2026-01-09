# Bay Navigator Architecture

This document describes the technical architecture of Bay Navigator, a multi-platform community resource platform.

## Overview

Bay Navigator connects Bay Area residents with free and low-cost programs for food, housing, healthcare, utilities, and more. The platform consists of:

- **Web Application**: Static site built with Astro
- **Mobile/Desktop Apps**: Cross-platform Flutter applications
- **Backend Services**: Serverless Azure Functions
- **Data Layer**: YAML-based program database

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Clients                                     │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│   Web (Astro)       │   Mobile (Flutter)  │   Desktop (Flutter)     │
│   baynavigator.org  │   iOS / Android     │   Windows / macOS / Linux│
└─────────┬───────────┴──────────┬──────────┴────────────┬────────────┘
          │                      │                       │
          ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Azure Static Web Apps                            │
│                   (CDN + Static Hosting)                             │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Azure Functions                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │
│  │   Smart     │ │   Carbon    │ │   Congress  │ │  Partnership │   │
│  │  Assistant  │ │   Stats     │ │   Lookup    │ │    Form      │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     External Services                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │
│  │  Cloudflare │ │   Azure AI  │ │    Cicero   │ │   Plausible  │   │
│  │  Workers AI │ │   Search    │ │     API     │ │  Analytics   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
baynavigator/
├── src/                    # Web application source
│   ├── components/         # Astro components
│   ├── pages/              # Route pages
│   ├── layouts/            # Page layouts
│   ├── data/               # YAML program data
│   └── styles/             # Global CSS
├── apps/                   # Flutter mobile/desktop app
│   ├── lib/                # Dart source code
│   │   ├── models/         # Data models
│   │   ├── providers/      # State management
│   │   ├── screens/        # UI screens
│   │   ├── services/       # Business logic
│   │   └── widgets/        # Reusable widgets
│   ├── android/            # Android configuration
│   ├── ios/                # iOS configuration
│   ├── macos/              # macOS configuration
│   ├── windows/            # Windows configuration
│   ├── linux/              # Linux configuration
│   └── visionos/           # visionOS configuration
├── azure-functions/        # Serverless backend
│   ├── smart-assistant/    # AI-powered search
│   ├── carbon-stats/       # Sustainability metrics
│   ├── congress-lookup/    # Representative finder
│   ├── partnership-form/   # Contact form handler
│   └── shared/             # Shared utilities
├── scripts/                # Build and data scripts
│   ├── src/                # TypeScript sources
│   ├── generate-api.cjs    # JSON API generator
│   ├── validate-data.cjs   # Data validation
│   └── sync-*.cjs          # Data sync scripts
├── tests/                  # Test suites
│   ├── unit/               # Unit tests
│   └── *.spec.js           # E2E tests (Playwright)
├── public/                 # Static assets
│   └── api/                # Generated JSON API
├── infrastructure/         # IaC (Bicep templates)
└── docs/                   # Documentation
```

## Data Flow

### 1. Program Data Pipeline

```
YAML Files (src/data/*.yml)
        │
        ▼
┌───────────────────────┐
│  generate-api.cjs     │  ← Incremental builds with caching
│  (Build-time)         │
└───────────────────────┘
        │
        ▼
JSON API (public/api/)
        │
        ├──► Web App (via static imports)
        │
        └──► Mobile App (via HTTP fetch)
```

### 2. Search Flow

```
User Query
    │
    ▼
┌─────────────────────┐
│  Smart Assistant    │  ← Azure Function
│  (Azure Functions)  │
└─────────────────────┘
    │
    ├──► Cloudflare Workers AI (Llama 3.1 8B)
    │        └──► Keyword extraction
    │
    └──► Azure AI Search
             └──► Program retrieval
    │
    ▼
Ranked Results
```

## Technology Stack

### Frontend

| Component     | Technology     | Purpose                     |
| ------------- | -------------- | --------------------------- |
| Web Framework | Astro 5        | Static site generation      |
| Styling       | Tailwind CSS 3 | Utility-first CSS           |
| Maps          | MapLibre GL    | Open-source mapping         |
| Tiles         | PMTiles        | Efficient map tiles         |
| Search        | Fuse.js        | Client-side fuzzy search    |
| Testing       | Playwright     | E2E and accessibility tests |

### Mobile/Desktop

| Component     | Technology | Purpose                   |
| ------------- | ---------- | ------------------------- |
| Framework     | Flutter    | Cross-platform UI         |
| State         | Provider   | Reactive state management |
| Navigation    | go_router  | Declarative routing       |
| Location      | Geolocator | Privacy-first GPS         |
| Crash Reports | Sentry     | Error tracking (opt-in)   |

### Backend

| Component | Technology            | Purpose                 |
| --------- | --------------------- | ----------------------- |
| Compute   | Azure Functions       | Serverless execution    |
| AI/LLM    | Cloudflare Workers AI | Smart search keywords   |
| Search    | Azure AI Search       | Program indexing        |
| CDN       | Azure Static Web Apps | Global distribution     |
| Analytics | Plausible CE          | Privacy-first analytics |

## Key Design Decisions

### 1. YAML-Based Data Model

Programs are stored in human-readable YAML files rather than a database:

```yaml
- id: calfresh
  name: CalFresh (SNAP/Food Stamps)
  category: food
  groups: [everyone, income-eligible]
  description: Monthly grocery benefits
  link: https://www.getcalfresh.org
  verified_by: USA.gov
  verified_date: '2025-01-01'
```

**Benefits:**

- Version-controlled with Git history
- Human-readable and editable
- No database maintenance
- Easy community contributions
- Offline-capable builds

### 2. Static API Generation

JSON APIs are pre-generated at build time rather than served dynamically:

**Benefits:**

- Zero runtime database queries
- Global CDN caching
- Works offline after first load
- No cold starts

### 3. Privacy-First Architecture

- No cookies or tracking pixels
- Self-hosted Plausible analytics
- GPS coordinates never leave device
- All distance calculations client-side
- Tor hidden service available

### 4. Incremental Builds

The API generator uses file hashing to only regenerate changed programs:

```typescript
// Build cache tracks file hashes
const cache = loadBuildCache();
const fileHash = computeFileHash(filePath);
const isChanged = cache.fileHashes[file] !== fileHash;
```

### 5. Multi-Platform Shared Data

Both web and mobile apps consume the same JSON API:

```
                    ┌─────────────┐
                    │  YAML Data  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  JSON API   │
                    └──────┬──────┘
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
       ┌─────────┐   ┌─────────┐   ┌─────────┐
       │   Web   │   │ Mobile  │   │ Desktop │
       └─────────┘   └─────────┘   └─────────┘
```

## Deployment

### CI/CD Workflows

| Workflow                  | Trigger      | Purpose                     |
| ------------------------- | ------------ | --------------------------- |
| `ci.yml`                  | PR           | Lint, test, validate        |
| `deploy.yml`              | Push to main | Deploy to Azure             |
| `release.yml`             | Tag          | Build mobile releases       |
| `codeql.yml`              | Schedule     | Security scanning           |
| `update-carbon-stats.yml` | Daily        | Refresh sustainability data |

### Infrastructure

Managed via Bicep templates in `/infrastructure/`:

- Azure Static Web Apps (web hosting)
- Azure Functions (serverless backend)
- Azure Storage (map tiles, assets)
- Azure AI Search (program search)

## Security

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://*.azure.com;
```

### Authentication

- No user accounts (privacy by design)
- API keys stored in Azure Key Vault
- Function apps use managed identities

## Monitoring

### Observability

- **Logs**: Structured JSON logging in Azure Functions
- **Metrics**: Core Web Vitals (LCP, FID, CLS)
- **Errors**: Sentry for Flutter apps (opt-in)
- **Analytics**: Plausible CE (self-hosted)

### Health Checks

- API endpoint validation in CI
- Link validation scripts
- Data validation on every build

## Performance Optimizations

1. **Static Generation**: Pre-render all pages at build time
2. **CDN Distribution**: Azure Static Web Apps global edge
3. **Map Clustering**: Aggregate 600+ markers efficiently
4. **Lazy Loading**: Images with native loading="lazy"
5. **Service Worker**: Offline-first caching
6. **Incremental Builds**: Only regenerate changed files

## Accessibility (WCAG 2.2 AAA)

- Semantic HTML with ARIA labels
- Color contrast verified (7:1 ratio)
- Full keyboard navigation
- Screen reader tested
- Font size adjustment (50-200%)
- High contrast mode
- Simple language toggle

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Adding new programs
- Modifying data schema
- Running tests locally
- Deployment process

# Overview

This is a customer debt management application built with a full-stack TypeScript architecture. The application allows users to track customers who owe money, categorize them by urgency (Alpha, Beta, Gamma, Delta), record payments, and manage customer data through imports/exports. The system provides a dashboard view with category-based analytics and supports bulk operations via Excel file uploads.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: shadcn/ui (built on Radix UI primitives) with Tailwind CSS for styling
- Component system follows the "New York" style variant
- Custom theming with CSS variables for colors and design tokens
- Responsive design with mobile-first approach

**State Management**: 
- TanStack Query (React Query) for server state management and data fetching
- Local React state for UI interactions
- Custom query client with automatic refetching disabled (staleTime: Infinity)

**Routing**: Wouter for lightweight client-side routing

**Form Handling**: React Hook Form with Zod validation via @hookform/resolvers

**Key Features**:
- Customer CRUD operations with form dialogs
- Payment recording and history tracking
- Excel import/export functionality using XLSX library
- Category-based dashboard with real-time statistics
- Search and filter capabilities
- WhatsApp and Email integration for customer communication

## Backend Architecture

**Framework**: Express.js with TypeScript

**Development Setup**: 
- Vite middleware for HMR in development
- Custom logging middleware for API request tracking
- Static file serving in production

**Data Storage**:
- In-memory storage implementation (MemStorage class)
- Interface-based storage pattern (IStorage) allows easy swap to database
- Storage operations include customers, payments, and bulk imports

**API Structure**:
- RESTful endpoints under `/api` prefix
- Customer management: GET/POST/PUT/DELETE `/api/customers`
- Payment tracking: GET `/api/customers/:id/payments`, POST `/api/payments`
- Bulk operations: POST `/api/customers/import`, GET `/api/customers/export`
- Validation using Zod schemas with friendly error messages

**File Upload**: Multer middleware with memory storage for Excel file processing

## Data Schema

**Database ORM**: Drizzle ORM configured for PostgreSQL
- Schema definitions in `shared/schema.ts`
- Zod validation schemas generated from Drizzle tables

**Core Entities**:

1. **Customers Table**:
   - UUID primary key (auto-generated)
   - Name, email, mobile (contact info)
   - Amount owed (decimal with precision)
   - Category (Alpha/Beta/Gamma/Delta for priority)
   - Created timestamp

2. **Payments Table**:
   - UUID primary key (auto-generated)
   - Foreign key to customers (cascade delete)
   - Amount (decimal with precision)
   - Payment method, receipt number, notes
   - Payment date timestamp

**Validation Rules**:
- Customer names required, non-empty
- Amount must be valid positive decimal
- Category restricted to four predefined values
- Email must be valid format
- Mobile number required

## External Dependencies

**Database**: 
- PostgreSQL via Neon serverless driver (@neondatabase/serverless)
- Connection via DATABASE_URL environment variable
- Drizzle Kit for migrations (output to `./migrations`)

**Session Management**:
- connect-pg-simple for PostgreSQL-backed sessions (configured but implementation details not visible in routes)

**File Processing**:
- XLSX library for Excel import/export operations
- Multer for multipart/form-data file uploads

**Development Tools**:
- Replit-specific plugins for enhanced development experience
- Runtime error overlay for better debugging
- Cartographer and dev banner in development mode

**Frontend Libraries**:
- date-fns for date formatting and manipulation
- lucide-react for icons
- class-variance-authority and clsx for conditional styling
- wouter for lightweight routing

**Build Configuration**:
- TypeScript with strict mode enabled
- Path aliases: `@/` for client, `@shared/` for shared code
- ESM module system throughout
- Separate build processes for client (Vite) and server (esbuild)

**Note on Database**: The application is configured to use PostgreSQL through Drizzle ORM, but currently implements an in-memory storage system. The IStorage interface pattern makes it straightforward to swap the MemStorage implementation with a database-backed storage class.
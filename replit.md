# Overview

This is a comprehensive business management application built with a full-stack TypeScript architecture. The application includes modules for managing leads, quotations, proforma invoices, invoices, receipts, and customer debts. It provides dashboard views with analytics, supports bulk operations via Excel file uploads, and includes professional print formats for business documents.

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

**Key Modules**:
- **Leads Management**: Track potential customers with follow-ups and status tracking
- **Quotations**: Create and manage quotations with professional print format
- **Proforma Invoices**: Generate PIs from quotations (one PI per quotation enforced)
- **Invoices & Receipts**: Full billing and payment tracking
- **Customer Management**: CRUD operations with form dialogs
- **Masters**: Centralized customer and item databases
- **Dashboard Analytics**: Real-time statistics with date filtering
- **Print & Export**: Professional A4 print formats and Excel exports
- **Communication**: WhatsApp and Email integration

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

## Recent Changes

### Proforma Invoice Module (October 2025)
- **Complete PI Management System**: Added dedicated proforma invoice module with full CRUD operations
- **Grid Features**: TanStack Table with pagination, column chooser, filters, sorting, and row selection
- **Dashboard Cards**: Total PIs, This Week, Today, Yesterday, This Month statistics
- **Date Filtering**: Month/Year, All Time, and Date Range filters
- **Print & Export**: Professional A4 print format matching quotation style, Excel export
- **Actions**: View/Print, Download PDF, Email, WhatsApp, Delete per row
- **Navigation**: Added to sidebar under "Proforma Invoices"

### Duplicate Prevention (October 2025)
- **One PI per Quotation**: Backend validation prevents creating duplicate proforma invoices for the same quotation
- **Database Constraint**: `quotationId` foreign key in `proforma_invoices` table links to quotations
- **Smart Handling**: When attempting to generate a duplicate PI, the system opens the existing PI instead
- **User Feedback**: Toast notifications inform users if a PI already exists or was newly created
- **API Endpoint**: `POST /api/quotations/:id/generate-pi` checks for existing PI via `getProformaInvoiceByQuotationId()`
- **Implementation**: Storage interface method added to query PIs by quotation ID

### Enhanced Import System with Inline Editing (October 2025)
- **Universal Import Feature**: Extended editable import preview to Items, Invoices, and Receipts (in addition to existing Customers)
- **Module-Specific Validation**: 
  - Items: Validates itemType (product/service), name, unit, tax, SKU, sale price
  - Invoices: Validates invoice number, customer name, date, amounts, status
  - Receipts: Validates voucher number, invoice number, customer, date, amount
- **Inline Error Correction**: 
  - Upload → Preview → Fix errors directly in table cells → Import (no re-upload)
  - Red border highlights invalid fields with specific error messages
  - Real-time validation as users type in edit mode
- **Smart Data Parsing**: 
  - Flexible column name recognition (handles various naming conventions)
  - Automatic type conversion (boolean to Active/Inactive, number formatting)
  - Module-specific parsers: `parseItemsFile`, `parseInvoicesFile`, `parseReceiptsFile`
- **Template Downloads**: Sample Excel templates for each module with example data and proper format
- **Import Flow**: File → Parse → Validate → Edit Mode (if errors) → Convert to Excel → Import
- **Implementation**: `client/src/lib/import-utils.ts` contains all validation and parsing functions

### User Management & Role-Based Access Control (October 2025)
- **Complete RBAC System**: Full user and role management with comprehensive permission control
- **Database Tables**:
  - `roles` table: id (UUID), name (unique), description, permissions (text array), createdAt
  - `users` table: id (UUID), name, email (unique), mobile, roleId (FK), status (Active/Inactive), password (future auth), createdAt
- **Roles Management Page** (`/settings/roles`):
  - Dashboard cards: Total Roles, Total Permissions
  - TanStack Table with columns: Role Name, Description, Permissions Count, Actions
  - **Granular Permissions System**: Each module has specific operation-level access control
    - View, Create, Edit, Delete, Export, Import, Print permissions per module
    - 13 modules: Dashboard, Leads, Quotations, Proforma Invoices, Invoices, Receipts, Debtors, Masters (Customers & Items), Company Settings, User Management, Roles Management, Reports
    - Permission format: "Module - Operation" (e.g., "Leads - Create", "Invoices - Export")
  - Form dialog with organized module-wise permission checkboxes (scrollable layout)
  - Full CRUD: Create, Read, Update, Delete, Bulk Delete
  - Excel import/export with template download
  - Professional A4 PDF print format
- **Users Management Page** (`/settings/users`):
  - Dashboard cards: Total Users, Active Users, Inactive Users
  - TanStack Table with columns: Name, Email, Mobile, Role, Status, Actions
  - Form dialog with role dropdown (populated from roles API) and Active/Inactive switch
  - Full CRUD: Create, Read, Update, Delete, Bulk Delete
  - Excel import/export with template download
  - Professional A4 PDF print format
- **Permission Operations**: View, Create, Edit, Delete, Export, Import, Print (module-specific)
- **API Endpoints**: Complete REST API for both users and roles with validation, import, export, template download
- **Navigation**: Added under Company Settings → User Management and Roles Management
- **Data Integration**: Users can be assigned to customers (assignedUser field) for follow-ups and task assignment
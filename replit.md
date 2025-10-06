# Overview

This is a comprehensive business management application built with a full-stack TypeScript architecture. It provides modules for managing leads, quotations, proforma invoices, invoices, receipts, and customer debts. The application features dashboard analytics, supports bulk operations via Excel uploads with inline editing, and generates professional print formats for all business documents. Key capabilities include robust user and role-based access control, a secure authentication system, and duplicate detection for master data imports. The project aims to streamline business operations, provide critical insights, and enhance productivity.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React with TypeScript using Vite.
**UI Component Library**: shadcn/ui (Radix UI) with Tailwind CSS, responsive design, custom theming.
**State Management**: TanStack Query for server state, local React state for UI.
**Routing**: Wouter for client-side routing.
**Form Handling**: React Hook Form with Zod validation.
**Key Modules**: Comprehensive CRUD and management for Leads, Quotations, Proforma Invoices, Invoices, Receipts, Customers, Items, and Debtors. Includes Dashboard Analytics, Print/Export, and Communication features (WhatsApp, Email).
**Data Visualization**: Recharts library for dashboard charts.

## Backend Architecture

**Framework**: Express.js with TypeScript.
**Development Setup**: Vite middleware for HMR, custom logging.
**Data Storage**: Interface-based storage (IStorage) with a current in-memory implementation (MemStorage), designed for easy swap to a database.
**API Structure**: RESTful endpoints (`/api/*`) with Zod schema validation. Supports customer management, payment tracking, bulk imports/exports, and specialized endpoints for dashboard stats, PI generation, user/role management, and authentication.
**File Upload**: Multer for Excel file processing.

## Data Schema

**Database ORM**: Drizzle ORM configured for PostgreSQL.
**Core Entities**:
1.  **Customers Table**: UUID, contact info (name, email, mobile), amount owed, category (Alpha/Beta/Gamma/Delta), timestamps.
2.  **Payments Table**: UUID, FK to customers, amount, method, receipt, notes, date.
3.  **Roles Table**: UUID, name, description, permissions (text array), createdAt.
4.  **Users Table**: UUID, name, email, mobile, roleId (FK), status, hashed password, createdAt.
**Validation**: Zod schemas ensure data integrity (e.g., required fields, valid formats, positive decimals, predefined categories).

## System Design Choices & Features

*   **Analytics Dashboard**: Replaces debtors management as the home page, offering real-time statistics, financial overviews, module statistics, and recent activity feeds.
*   **Debtors Module**: Outstanding balance calculation includes opening balance from Master Customers. Formula: Balance = Opening Balance + Total Invoices - Total Receipts.
*   **Receipt Module**: Customer dropdown populated from Master Customers module (active only). Voucher Type dropdown with Receipt, CN, TDS options plus ability to add custom voucher types via localStorage. Duplicate checking based on Voucher Type + Voucher Number combination.
*   **Proforma Invoice Module**: Full CRUD operations for PIs, including grid features (pagination, filters, sorting), dashboard cards, date filtering, and print/export. Enforces one PI per quotation.
*   **Enhanced Import System**: Universal editable import preview for Customers, Items, Invoices, Receipts. Features inline error correction, smart data parsing, and template downloads. Includes duplicate detection for both customer and item imports with visual indicators and normalization.
*   **Duplicate Detection**: Strict duplicate prevention for both Customers (by name) and Items (by name) during create, update, and import operations. Uses case-insensitive, normalized comparison and provides clear error messages.
*   **Bulk Operations**: Checkbox-based selection system with bulk delete functionality available for Items and other modules. Includes confirmation dialogs and visual feedback.
*   **User Management & RBAC**: Comprehensive system for managing users and roles. Granular, module-specific permissions (View, Create, Edit, Delete, Export, Import, Print) across 13 modules.
*   **Authentication System**: Secure login with email/password, bcrypt hashing, session-based authentication, and protected routes.
*   **Customer Inline Editing**: Quick-edit dropdowns for Category, Interest Rate, and Status directly within the customer grid.
*   **Master Items Enhancements**: 21 standardized UOMs (NOS, KGS, MTR, SQM, LTR, etc.) with custom UOM functionality via localStorage. SKU field removed from UI. Interest rate bulk update capability.
*   **Email & WhatsApp Integration**: Complete communication system integrated across all 7 modules (Leads, Quotations, Proforma Invoices, Invoices, Receipts, Debtors, Credit Management). Features include:
    - Email configuration supporting both Gmail OAuth2 and SMTP providers
    - Template management with module-specific templates and variable substitution
    - Reusable Email Dialog component with template selection and variable replacement
    - WhatsApp integration with pre-formatted messages using WhatsApp Web API
    - Quick-access communication buttons in all module grids
    - 7 default email templates pre-configured for all modules
    - Nodemailer integration for reliable email delivery
*   **Ringg.ai AI Calling Integration**: Comprehensive AI-powered voice calling system fully integrated across all 7 modules. Multi-tenant SaaS architecture features:
    - Configuration Management: API key setup, test connection validation, webhook URL display
    - Script Mapping System: Link Ringg.ai call scripts to specific modules (e.g., Payment Reminder for Invoices)
    - Call Triggering: Reusable Call Dialog component with script selection, phone validation, and call context variables
    - Call History: Complete log viewer with filters, call status tracking, recording playback, transcript display, and outcome tracking
    - Webhook Integration: Real-time call status updates, recording URLs, and conversation transcripts
    - Make Call buttons integrated in all 7 modules: Leads, Quotations, PI, Invoices, Receipts, Debtors, Credit Management
    - Navigation accessible via Company Settings page
    - Database tables: ringg_configs, call_script_mappings, call_logs

# External Dependencies

**Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`).
**Session Management**: `connect-pg-simple` (for PostgreSQL-backed sessions).
**File Processing**: `XLSX` library for Excel import/export; `Multer` for file uploads.
**Frontend Libraries**: `date-fns` for date manipulation, `lucide-react` for icons, `class-variance-authority` and `clsx` for styling, `wouter` for routing, `recharts` for data visualization.
**Authentication**: `bcrypt` for password hashing, `express-session` for session management.
**Email Service**: `nodemailer` for email delivery with support for Gmail OAuth2 and SMTP providers.
# Overview

RECOV. is a comprehensive business management application built with a full-stack TypeScript architecture. It offers modules for managing leads, quotations, proforma invoices, invoices, receipts, and customer debts, aiming to streamline operations and enhance productivity. Key features include dashboard analytics, bulk operations via Excel uploads with inline editing, professional document generation, robust user and role-based access control, secure authentication, and duplicate detection for master data.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The application uses `shadcn/ui` (Radix UI) with Tailwind CSS for a responsive design and custom theming, including consistent dark mode adaptation. Skeleton loaders are implemented for better user experience during data fetching. The UI emphasizes clarity and ease of use for business CRM tasks.

## Technical Implementations
*   **Frontend**: React with TypeScript, Vite for tooling, TanStack Query for server state, Wouter for routing, React Hook Form with Zod for form handling, and Recharts for data visualization.
*   **Backend**: Express.js with TypeScript, designed with an interface-based storage (currently in-memory, easily swappable to a database). RESTful API with Zod schema validation. Multer handles Excel file processing.
*   **Data Storage**: Drizzle ORM configured for PostgreSQL. Core entities include Customers, Payments, Roles, and Users, with Zod schemas ensuring data integrity.
*   **Authentication**: Secure login with email/password, bcrypt hashing, session-based authentication, and protected routes. Includes password reset functionality with email-based tokens.

## Feature Specifications
*   **Analytics Dashboard**: Provides real-time statistics, financial overviews, and recent activity.
*   **Debtors Module**: Calculates outstanding balance (Opening Balance + Total Invoices - Total Receipts).
*   **Invoice Module**: Features auto-calculated Final G.P. and percentage, FIFO receipt allocation, and period-based interest calculation with a detailed breakdown UI and A4 print format.
*   **Proforma Invoice Module**: Full CRUD operations with grid features, enforcing one PI per quotation.
*   **Enhanced Import System**: Universal editable import preview for various modules with inline error correction, smart parsing, and duplicate detection.
*   **User Management & RBAC**: Granular, module-specific permissions (View, Create, Edit, Delete, Export, Import, Print) across 13 modules.
*   **Credit Control & Recovery System**:
    *   **Cumulative Grace Period Logic**: Categories determined by cumulative days (Alpha: 0-X days, Beta: X+1 to X+Y days, Gamma: X+Y+1 to X+Y+Z days, Delta: beyond X+Y+Z days)
    *   **Partial Payment Threshold**: Invoices with payment percentage ≥ configured threshold (default 80%) are excluded from delay calculations and auto-upgrade logic
    *   **Auto/Manual Category Mode**: Toggle between automatic category upgrades based on payment delays and manual category assignment with full audit logging
    *   **Manual Category Override**: Category dropdown in Customer Master (disabled when auto-mode ON) allows manual changes with proper logging via dedicated endpoint
    *   **Category Change Logs**: Complete audit trail of all category changes (auto and manual) with timestamp, reason, and changed-by user tracking
    *   **Follow-up Rules**: Configurable follow-up frequency per category (Alpha, Beta, Gamma, Delta) with days between reminders
    *   **Follow-up Automation Settings** (Schema defined, UI pending): Multi-channel automation (WhatsApp/Email/IVR) with 5 scheduling modes (fixed frequency, before due, after due, weekly specific day, monthly fixed date), category-wise action configuration, and IVR calling hours/retry limits
*   **Communication Integrations**:
    *   **Email**: Nodemailer integration with support for Gmail OAuth2/SMTP, template management, variable substitution, and module-specific quick-access email buttons. Includes platform-level email configuration for tenant credential emails.
    *   **WhatsApp**: Enterprise-grade messaging via multi-provider support (Twilio, WATI, Meta, etc.), comprehensive configuration, and message templates with automatic data enrichment.
    *   **Ringg.ai AI Calling**: AI-powered voice calling system with configuration, script mapping, call triggering, call history (recordings, transcripts), and webhook integration.
*   **Communication Schedules**: Automated scheduling for calls, emails, and WhatsApp messages with flexible frequency, time-based scheduling, and JSON-based filter conditions.
*   **Tenant Credential Emails**: Automated sending of login credentials to newly approved tenants, using platform-level email configuration.

# External Dependencies

*   **Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`).
*   **Session Management**: `connect-pg-simple` (for PostgreSQL-backed sessions).
*   **File Processing**: `XLSX` (for Excel import/export), `Multer` (for file uploads).
*   **Frontend Libraries**: `date-fns`, `lucide-react`, `class-variance-authority`, `clsx`, `wouter`, `recharts`.
*   **Authentication**: `bcrypt`, `express-session`.
*   **Email Service**: `nodemailer`.
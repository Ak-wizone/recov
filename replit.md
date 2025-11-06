# Overview

RECOV. is a full-stack TypeScript business management application designed to streamline operations and enhance productivity for businesses. It offers modules for managing leads, quotations, proforma invoices, invoices, receipts, and customer debts. Key capabilities include dashboard analytics, bulk operations via Excel uploads, professional document generation, robust user and role-based access control, secure authentication, and duplicate detection for master data.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions
The application utilizes `shadcn/ui` (Radix UI) and Tailwind CSS for a responsive design, custom theming, and dark mode adaptation. Skeleton loaders improve the user experience during data fetching, prioritizing clarity and ease of use for CRM tasks.

## Technical Implementations
*   **Frontend**: React with TypeScript, Vite, TanStack Query for server state, Wouter for routing, React Hook Form with Zod for form handling, and Recharts for data visualization.
*   **Backend**: Express.js with TypeScript, featuring an interface-based storage design and a RESTful API with Zod schema validation. Multer handles Excel file processing.
*   **Data Storage**: Drizzle ORM configured for PostgreSQL, with Zod schemas ensuring data integrity for core entities like Customers, Payments, Roles, and Users.
*   **Authentication**: Secure email/password login with bcrypt hashing, session-based authentication, protected routes, and email-based password reset functionality.
*   **Production Optimizations**: Environment-aware seeding process that skips heavy tenant role updates in production to prevent startup timeouts and ensure fast deployment. PostgreSQL session store properly configured for both development and published (REPLIT_DEPLOYMENT=1) environments, ensuring WebSocket authentication persistence and preventing error 4500.

## Feature Specifications
*   **Analytics Dashboard**: Provides real-time statistics, financial overviews, and recent activity.
*   **Debtors Module**: Calculates outstanding balances.
*   **Invoice Module**: Features auto-calculated Final G.P., FIFO receipt allocation, and period-based interest calculation with detailed UI and A4 print format.
*   **Proforma Invoice Module**: Full CRUD operations with grid features, enforcing one PI per quotation.
*   **Enhanced Import System**: Universal editable import preview for various modules with inline error correction, smart parsing, and duplicate detection.
*   **User Management & RBAC**: Includes module-specific permissions (View, Create, Edit, Delete, Export, Import, Print), field-level access control (e.g., hiding Gross Profit), action button permissions, dashboard card access, user-specific column preferences, smart redirect logic, automatic Admin role provisioning, and a protected Admin user system to prevent lockout. **NEW: Subscription-Based Role Management** - Roles page now enforces subscription plan boundaries with frontend filtering (hides unavailable modules), backend validation (rejects out-of-plan permissions with upgrade messaging), user assignment count display, and protected Admin role deletion (prevents deletion of last Admin role or roles with assigned users).
*   **Credit Control & Recovery System**: Features cumulative grace period logic, partial payment thresholds, auto/manual category modes with audit logging, configurable follow-up rules, and advanced follow-up automation settings for multi-channel communication (WhatsApp/Email/IVR).
*   **Communication Integrations**:
    *   **Email**: Nodemailer integration supporting Gmail OAuth2/SMTP, advanced template management with 35+ variables across 11 modules, a visual variable picker, professional HTML templates, server-side variable enrichment with complex financial calculations, absolute URL generation, and a 2-column editor layout. **NEW: Extended Email Templates** - Email template system expanded from 8 to 11 modules (added Ledger, Interest Calculator, Customer Reports) with server-side enrichment for computed fields (ledger balances, transaction counts, interest calculations, aging analysis). EmailDialog component fully integrated with backend enrichment pipeline, passing templateId and module type for proper variable substitution across all business documents.
    *   **WhatsApp**: Enterprise-grade messaging via multi-provider support with message templates and automatic data enrichment.
    *   **Ringg.ai AI Calling**: AI-powered voice calling with script mapping, call triggering, history, and webhook integration.
*   **Communication Schedules**: Automated scheduling for calls, emails, and WhatsApp messages with flexible frequency, time-based scheduling, and JSON-based filter conditions.
*   **Tenant Credential Emails**: Automated sending of login credentials to newly approved tenants.
*   **Customer Ledger Module**: Provides a complete transaction history view with debits and credits, running balance, pastel color-coded voucher types, PDF generation, and sharing capabilities.
*   **Daily Engagement Features (Action Center & Team Performance)**: Includes a daily dashboard, task manager, call queue, universal activity log, leaderboard, daily targets, and a real-time notification center with role-based access control.
*   **Subscription Plans Management (Multi-Tenant SaaS)**: Comprehensive subscription-based multi-tenant system with module-level access control. Features predefined and customizable plans (Starter/Professional/Enterprise), a plan management UI, tenant plan assignment, a module propagation system, strict subscription-based sidebar filtering (tenants see ONLY their plan's modules), subscription-specific permission generation (eliminates unnecessary permissions), automatic migration for existing tenants, and real-time analytics. **NEW: Real-Time Subscription Updates** - When platform admin assigns/updates subscription plans, changes apply immediately using atomic database transactions (tenant + Admin role updates guaranteed together), WebSocket-based real-time notifications to affected users, automatic frontend refresh of permissions and modules without page reload, graceful degradation on failures, and comprehensive error logging for production monitoring.

# External Dependencies

*   **Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`).
*   **Session Management**: `connect-pg-simple`.
*   **File Processing**: `XLSX`, `Multer`.
*   **Frontend Libraries**: `date-fns`, `lucide-react`, `class-variance-authority`, `clsx`, `wouter`, `recharts`.
*   **Authentication**: `bcrypt`, `express-session`.
*   **Email Service**: `nodemailer`.
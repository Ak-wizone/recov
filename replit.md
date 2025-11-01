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
*   **User Management & RBAC**: 
    *   **Module-Specific Permissions**: Granular permissions (View, Create, Edit, Delete, Export, Import, Print) across 13+ modules
    *   **Field-Level Access Control**: canViewGP flag to hide Gross Profit (G.P.) columns in Invoice module for users without permission
    *   **Action Button Permissions**: Granular control over communication actions (Email, WhatsApp, SMS, Call, Reminder, Share) via actionPermissions JSON field
    *   **Dashboard Card Access**: allowedDashboardCards array controls which analytics cards are visible on Business Overview dashboard
    *   **User Column Preferences**: Per-user, per-module column visibility saved via user_column_preferences table, enabling personalized views
    *   **Smart Redirect Logic**: Auto-redirect users without Business Overview permission to their first accessible module with location guard preventing infinite loops
*   **Credit Control & Recovery System**:
    *   **Cumulative Grace Period Logic**: Categories determined by cumulative days (Alpha: 0-X days, Beta: X+1 to X+Y days, Gamma: X+Y+1 to X+Y+Z days, Delta: beyond X+Y+Z days)
    *   **Partial Payment Threshold**: Invoices with payment percentage ≥ configured threshold (default 80%) are excluded from delay calculations and auto-upgrade logic
    *   **Auto/Manual Category Mode**: Toggle between automatic category upgrades based on payment delays and manual category assignment with full audit logging
    *   **Manual Category Override**: Category dropdown in Customer Master (disabled when auto-mode ON) allows manual changes with proper logging via dedicated endpoint
    *   **Category Change Logs**: Complete audit trail of all category changes (auto and manual) with timestamp, reason, and changed-by user tracking
    *   **Follow-up Rules**: Configurable follow-up frequency per category (Alpha, Beta, Gamma, Delta) with days between reminders
    *   **Follow-up Automation Settings** (Schema defined, UI pending): Multi-channel automation (WhatsApp/Email/IVR) with 5 scheduling modes (fixed frequency, before due, after due, weekly specific day, monthly fixed date), category-wise action configuration, and IVR calling hours/retry limits
    *   **Follow-up Schedules**: Multi-schedule system allowing unlimited reminder configurations with template/script mapping:
        *   Unlimited schedules per tenant (e.g., "7 days before", "3 days before", "1 day after")
        *   5 trigger types: days_before_due, days_after_due, fixed_weekly, fixed_monthly, fixed_frequency
        *   Per-schedule communication channel toggles (WhatsApp/Email/IVR)
        *   Template/Script Mapping: Each schedule links to specific WhatsApp template, Email template, and IVR script
        *   Validation: Enabled channels MUST have corresponding template/script selected (enforced at frontend and backend)
        *   Category filtering: Target specific customer categories or all
        *   Active/inactive status for easy schedule management
*   **Communication Integrations**:
    *   **Email**: Nodemailer integration with support for Gmail OAuth2/SMTP, template management, variable substitution, and module-specific quick-access email buttons. Includes platform-level email configuration for tenant credential emails.
    *   **WhatsApp**: Enterprise-grade messaging via multi-provider support (Twilio, WATI, Meta, etc.), comprehensive configuration, and message templates with automatic data enrichment.
    *   **Ringg.ai AI Calling**: AI-powered voice calling system with configuration, script mapping, call triggering, call history (recordings, transcripts), and webhook integration.
*   **Communication Schedules**: Automated scheduling for calls, emails, and WhatsApp messages with flexible frequency, time-based scheduling, and JSON-based filter conditions.
*   **Tenant Credential Emails**: Automated sending of login credentials to newly approved tenants, using platform-level email configuration.
*   **Customer Ledger Module**: Complete transaction history view displaying all debits (invoices) and credits (receipts) with running balance calculation:
    *   Customer-wise ledger with date range filtering
    *   Pastel color-coded voucher types (Sales: soft blue, Receipt: soft green, Journal: soft yellow, Credit Note: soft pink)
    *   Opening balance, running balance (Dr/Cr), and closing balance display
    *   PDF generation with company header and formatted transaction table using html2pdf.js
    *   Email and WhatsApp sharing capabilities for ledger statements
    *   Quick access from Debtors table via BookOpen icon button with URL parameter pre-selection
    *   Accessible via sidebar under Payment Tracking > Ledger
*   **Daily Engagement Features (Action Center & Team Performance)**:
    *   **Daily Dashboard**: Personalized greeting, today's priority tasks, follow-ups due, overdue alerts, collection targets, quick action buttons
    *   **Task Manager**: Create/assign/track tasks with status updates, due dates, priority levels, filtering; managers can assign to team members, team members can self-assign
    *   **Call Queue**: Auto-prioritized call list from follow-ups/overdues/categories, click-to-call, status tracking, quick activity logging, auto-next customer
    *   **Activity Log**: Universal quick-log modal accessible from all pages, activity history view, filter by type/date, mandatory field validation
    *   **Leaderboard**: Team rankings, personal efficiency scores, achievement badges, visual charts, daily/weekly/monthly metrics
    *   **Daily Targets**: Set/track collection targets, progress bars, target vs actual, achievement percentage, hourly breakdown (manager-only creation)
    *   **Notification Center**: Real-time notifications for tasks/payments/achievements, bell icon with unread count, mark as read, WebSocket integration
    *   **Role-Based Access Control**: Manager-only permissions for task assignment (to others) and target management; team members can create self-assigned tasks and view all features
*   **Subscription Plans Management (Multi-Tenant SaaS)**:
    *   **Platform Architecture**: Complete subscription-based multi-tenant system with module-level access control
    *   **Subscription Plans**: Predefined plans (Starter, Professional, Enterprise) with configurable pricing, billing cycles (monthly/annual/lifetime), and module access
    *   **15 Available Modules**: Business Overview, Customer Analytics, Leads, Quotations, Proforma Invoices, Invoices, Receipts, Payment Tracking, Action Center, Team Performance, Risk & Recovery, Credit Control, Masters, Settings, Email/WhatsApp/Call Integrations
    *   **Plan Management UI**: Full CRUD interface for platform admins to create, edit, delete, and manage subscription plans with color branding, module selection via checkboxes, and statistics dashboard
    *   **Tenant Plan Assignment**: Assign plans during tenant approval or change plans for existing tenants via dropdown selection in tenant management interface
    *   **Custom Module Override**: Ability to assign custom module sets to individual tenants, overriding their subscription plan's default modules
    *   **Dynamic Sidebar Filtering**: Navigation menu automatically shows/hides items based on tenant's allowed modules (from subscription plan or custom override)
    *   **Statistics & Analytics**: Real-time tracking of total plans, active plans, tenant count per plan, and plan distribution analytics
    *   **Validation & Safety**: Prevents deletion of plans with active tenants, requires plan selection during tenant approval, enforces module-based access control
    *   **Seed Data**: Automatically provisions three default plans (Starter: ₹999, Professional: ₹2499, Enterprise: ₹4999) with progressive module access on first run
    *   **Color-Coded Badges**: Visual plan identification with customizable color badges throughout the UI (tenant lists, approval dialogs, plan management)
    *   **Platform Admin Controls**: Dedicated "Subscription Plans" section in platform admin navigation with full plan lifecycle management

# External Dependencies

*   **Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`).
*   **Session Management**: `connect-pg-simple` (for PostgreSQL-backed sessions).
*   **File Processing**: `XLSX` (for Excel import/export), `Multer` (for file uploads).
*   **Frontend Libraries**: `date-fns`, `lucide-react`, `class-variance-authority`, `clsx`, `wouter`, `recharts`.
*   **Authentication**: `bcrypt`, `express-session`.
*   **Email Service**: `nodemailer`.
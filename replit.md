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
*   **Data Storage**: Drizzle ORM configured for PostgreSQL, with Zod schemas ensuring data integrity for core entities.
*   **Authentication**: Secure email/password login with bcrypt hashing, session-based authentication, protected routes, and email-based password reset functionality.
*   **Production Optimizations**: Environment-aware seeding process and PostgreSQL session store configuration for development and deployment environments.
*   **API Request Pattern**: Custom `apiRequest` utility with signature `apiRequest(method, url, data)` for all HTTP mutations.

## Feature Specifications
*   **Analytics Dashboard**: Provides real-time statistics, financial overviews, and recent activity.
*   **Debtors Module**: Calculates outstanding balances.
*   **Invoice Module**: Features auto-calculated Final G.P., FIFO receipt allocation, and period-based interest calculation.
*   **Proforma Invoice Module**: Full CRUD operations with grid features, enforcing one PI per quotation.
*   **Enhanced Import System**: Universal editable import preview with inline error correction, smart parsing, and duplicate detection.
*   **User Management & RBAC**: Includes module-specific permissions, field-level access control, action button permissions, dashboard card access, user-specific column preferences, smart redirect logic, automatic Admin role provisioning, and a protected Admin user system. Subscription-based role management enforces plan boundaries with frontend filtering and backend validation. An Admin Role Protection System automatically assigns and protects all permissions for the Admin role within subscribed modules.
*   **Credit Control & Recovery System**: Features cumulative grace period logic, partial payment thresholds, auto/manual category modes with audit logging, configurable follow-up rules, and advanced follow-up automation settings for multi-channel communication.
*   **Communication Integrations**:
    *   **Email**: Nodemailer integration supporting Gmail OAuth2/SMTP, advanced template management with variable picker, professional HTML templates, server-side variable enrichment, and extended module support (Ledger, Interest Calculator, Customer Reports).
    *   **WhatsApp**: Enterprise-grade messaging via multi-provider support with message templates and automatic data enrichment.
    *   **Ringg.ai AI Calling**: AI-powered voice calling with script mapping, call triggering, history, and webhook integration.
    *   **Telecmi PIOPIY Voice Calling**: Multi-provider voice calling with AES-256-GCM encrypted credential storage, intelligent template suggestion engine, unified call history, and automatic phone number normalization. Supports variable substitution in call scripts. Integrated with ElevenLabs voice cloning for personalized IVR calls.
    *   **ElevenLabs Voice Cloning**: Per-user voice cloning for personalized IVR calls. Users upload 1-2 minute voice samples to create cloned voices via ElevenLabs API. When making Telecmi calls, the system checks if the calling user has a cloned voice and generates TTS audio using their cloned voice instead of the default Telecmi TTS. Features platform admin configuration page, user voice profile management, automatic fallback to Telecmi TTS when ElevenLabs is unavailable, and scheduled cleanup of generated audio files.
*   **Communication Schedules**: Comprehensive automated communication scheduling supporting both specific datetime and invoice due-date-based triggers. Features dual scheduling modes for exact date/time and dynamic scheduling relative to invoice due dates.
*   **Tenant Credential Emails**: Automated sending of login credentials to newly approved tenants.
*   **Customer Ledger Module**: Provides a complete transaction history view with running balance, pastel color-coded voucher types, PDF generation, and sharing capabilities.
*   **Daily Engagement Features**: Includes a daily dashboard, task manager, call queue, universal activity log, leaderboard, daily targets, and a real-time notification center with role-based access control.
*   **Subscription Plans Management**: Comprehensive subscription-based multi-tenant system with module-level access control, predefined and customizable plans, real-time subscription updates via WebSockets, and automatic migration for existing tenants.
*   **Whisper Voice AI**: OpenAI Whisper-powered voice transcription with multi-language support, credit-based usage system, addon purchase capability, and intelligent command parsing for voice commands. Features browser-based audio recording, real-time transcription, and deterministic regex-based command extraction.
*   **Telegram Bot Business Intelligence**: Voice-based business intelligence bot for multi-tenant SaaS with strict tenant isolation via one-time linking codes. Features single Telegram bot serving all tenants, platform admin configuration, tenant portal for user linking, and command handlers for /start, /link, and /help. Processes voice messages with OpenAI Whisper API for transcription and uses deterministic regex-based intent detection for business intelligence queries (e.g., invoice stats, revenue, debtors). Responses are formatted bilingually with emojis and Indian number formatting.

# External Dependencies

*   **Database**: PostgreSQL via Neon serverless driver (`@neondatabase/serverless`).
*   **Session Management**: `connect-pg-simple`.
*   **File Processing**: `XLSX`, `Multer`.
*   **Frontend Libraries**: `date-fns`, `lucide-react`, `class-variance-authority`, `clsx`, `wouter`, `recharts`.
*   **Authentication**: `bcrypt`, `express-session`.
*   **Email Service**: `nodemailer`.
*   **Voice AI**: OpenAI Whisper API (`openai` npm package).
*   **Voice Calling**: Telecmi PIOPIY SDK (`piopiy` npm package).
*   **Voice Cloning**: ElevenLabs API for voice cloning and text-to-speech generation.
*   **Telegram Bot**: Telegraf framework (`telegraf` npm package), form-data.
-- Migration: Add Surepass tables (safe, idempotent)
-- This file creates the platform tables required for Surepass integration.
-- Review before applying and back up your DB first.

CREATE TABLE IF NOT EXISTS public.surepass_config (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE cascade,
  api_token text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  is_enabled boolean NOT NULL DEFAULT true,
  gstin_enabled boolean NOT NULL DEFAULT true,
  tds_enabled boolean NOT NULL DEFAULT true,
  credit_report_enabled boolean NOT NULL DEFAULT true,
  last_verified_at timestamp,
  total_api_calls integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT unique_surepass_config_per_tenant UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS public.surepass_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id varchar NOT NULL REFERENCES public.tenants(id) ON DELETE cascade,
  user_id varchar REFERENCES public.users(id) ON DELETE set null,
  api_type text NOT NULL,
  request_data text,
  response_status integer,
  response_data text,
  is_success boolean NOT NULL DEFAULT false,
  error_message text,
  credits_used numeric(10,2),
  created_at timestamp DEFAULT now() NOT NULL
);

-- Optional: add indexes to speed up common queries
CREATE INDEX IF NOT EXISTS idx_surepass_config_tenant_id ON public.surepass_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_surepass_logs_tenant_id ON public.surepass_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_surepass_logs_api_type ON public.surepass_logs(api_type);

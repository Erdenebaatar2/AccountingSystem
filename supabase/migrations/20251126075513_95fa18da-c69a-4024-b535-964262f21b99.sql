-- Create company_settings table for storing company information
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  registration_number text NOT NULL,
  tax_number text,
  address text,
  phone text,
  email text,
  vat_registered boolean DEFAULT false,
  vat_rate numeric DEFAULT 10,
  income_tax_rate numeric DEFAULT 10,
  ebarimt_enabled boolean DEFAULT false,
  ebarimt_test_mode boolean DEFAULT true,
  ebarimt_api_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for company_settings
CREATE POLICY "Users can view own company settings"
  ON public.company_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company settings"
  ON public.company_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company settings"
  ON public.company_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
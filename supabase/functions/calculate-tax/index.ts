import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.82.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxCalculationRequest {
  amount: number;
  type: 'income' | 'expense';
  categoryId?: string;
}

interface TaxCalculationResponse {
  amount: number;
  vatAmount: number;
  vatRate: number;
  amountWithoutVat: number;
  incomeTaxAmount?: number;
  incomeTaxRate?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from auth header
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount, type }: TaxCalculationRequest = await req.json();

    console.log('Calculating tax for:', { amount, type, userId: user.id });

    // Get company settings to determine tax rates
    const { data: companySettings, error: settingsError } = await supabaseClient
      .from('company_settings')
      .select('vat_rate, vat_registered, income_tax_rate')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching company settings:', settingsError);
    }

    // Default tax rates (Mongolian standard rates)
    const vatRate = companySettings?.vat_registered ? (companySettings?.vat_rate || 10) : 0;
    const incomeTaxRate = companySettings?.income_tax_rate || 10;

    // Calculate VAT (НӨАТ)
    // Amount includes VAT, so we need to extract it
    const vatAmount = companySettings?.vat_registered 
      ? (amount * vatRate) / (100 + vatRate)
      : 0;
    const amountWithoutVat = amount - vatAmount;

    let result: TaxCalculationResponse = {
      amount,
      vatAmount: Math.round(vatAmount * 100) / 100,
      vatRate,
      amountWithoutVat: Math.round(amountWithoutVat * 100) / 100,
    };

    // Calculate income tax (ААНОАТ) only for income
    if (type === 'income') {
      const incomeTaxAmount = (amountWithoutVat * incomeTaxRate) / 100;
      result.incomeTaxAmount = Math.round(incomeTaxAmount * 100) / 100;
      result.incomeTaxRate = incomeTaxRate;
    }

    console.log('Tax calculation result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in calculate-tax function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

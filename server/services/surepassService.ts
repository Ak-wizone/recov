/**
 * Surepass KYC API Service
 * Handles GSTIN verification, TDS check, and Credit Reports
 */

interface SurepassApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

interface GstinResponse {
  gstin: string;
  business_name: string;
  legal_name: string;
  center_jurisdiction: string;
  state_jurisdiction: string;
  date_of_registration: string;
  constitution_of_business: string;
  taxpayer_type: string;
  gstin_status: string;
  date_of_cancellation?: string;
  field_visit_conducted: string;
  nature_of_core_business_activity_code: string;
  nature_of_core_business_activity_description: string;
  aadhaar_validation: string;
  aadhaar_validation_date: string;
  address: string;
  hsn_info?: any[];
  filing_status?: any[];
  filing_frequency?: any;
}

interface TdsResponse {
  tan: string;
  name: string;
  status: string;
  category: string;
  pan_of_deductor: string;
  ao_details: string;
}

interface CreditReportResponse {
  name: string;
  credit_score: number;
  credit_report: any;
}

export class SurepassService {
  private baseUrl: string;
  private apiToken: string;

  constructor(apiToken: string, environment: 'sandbox' | 'production' = 'sandbox') {
    this.apiToken = apiToken;
    this.baseUrl = environment === 'production' 
      ? 'https://kyc-api.surepass.io/api/v1'
      : 'https://sandbox.surepass.io/api/v1';
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'POST',
    body?: any
  ): Promise<SurepassApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `API Error: ${response.status}`,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        data: data.data || data,
        statusCode: response.status,
      };
    } catch (error: any) {
      console.error('[SurepassService] API Error:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
        statusCode: 500,
      };
    }
  }

  /**
   * Test API connection by checking token validity
   */
  async testConnection(): Promise<SurepassApiResponse<{ message: string }>> {
    try {
      // Use a simple GSTIN check with a test number to verify connection
      const response = await fetch(`${this.baseUrl}/corporate/gstin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({ id_number: '27AAPFU0939F1ZV' }), // Test GSTIN
      });

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'Invalid or expired API token',
          statusCode: response.status,
        };
      }

      // Any response other than auth error means connection is working
      return {
        success: true,
        data: { message: 'Connection successful' },
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Surepass API',
        statusCode: 500,
      };
    }
  }

  /**
   * Verify GSTIN (Corporate GST Number)
   */
  async verifyGstin(
    gstinNumber: string,
    options?: {
      financialYear?: string;
      filingStatus?: boolean;
      hsnInfo?: boolean;
      filingFrequency?: boolean;
      splitAddress?: boolean;
    }
  ): Promise<SurepassApiResponse<GstinResponse>> {
    const body: any = {
      id_number: gstinNumber.toUpperCase(),
    };

    // Add optional parameters
    if (options?.financialYear) body.financial_year = options.financialYear;
    if (options?.filingStatus) body.filing_status = true;
    if (options?.hsnInfo) body.hsn_info = true;
    if (options?.filingFrequency) body.filing_frequency = true;
    if (options?.splitAddress) body.split_address = true;

    return this.makeRequest<GstinResponse>('/corporate/gstin', 'POST', body);
  }

  /**
   * TDS/TAN Verification
   */
  async verifyTds(tanNumber: string): Promise<SurepassApiResponse<TdsResponse>> {
    return this.makeRequest<TdsResponse>('/tds-check', 'POST', {
      id_number: tanNumber.toUpperCase(),
    });
  }

  /**
   * Get Credit Report (CIBIL)
   */
  async getCreditReport(params: {
    name: string;
    pan?: string;
    mobile?: string;
    dob?: string; // DD-MM-YYYY format
    address?: string;
    pincode?: string;
  }): Promise<SurepassApiResponse<CreditReportResponse>> {
    return this.makeRequest<CreditReportResponse>('/credit-report-cibil', 'POST', {
      name: params.name,
      pan: params.pan,
      mobile: params.mobile,
      dob: params.dob,
      address: params.address,
      pincode: params.pincode,
    });
  }

  /**
   * Get Credit Report PDF
   */
  async getCreditReportPdf(params: {
    name: string;
    pan?: string;
    mobile?: string;
    dob?: string;
    address?: string;
    pincode?: string;
  }): Promise<SurepassApiResponse<{ pdf_url: string }>> {
    return this.makeRequest<{ pdf_url: string }>('/credit-report-cibil-pdf', 'POST', {
      name: params.name,
      pan: params.pan,
      mobile: params.mobile,
      dob: params.dob,
      address: params.address,
      pincode: params.pincode,
    });
  }

  /**
   * Get current environment
   */
  getEnvironment(): 'sandbox' | 'production' {
    return this.baseUrl.includes('sandbox') ? 'sandbox' : 'production';
  }
}

// Factory function to create service instance
export function createSurepassService(apiToken: string, environment: 'sandbox' | 'production' = 'sandbox'): SurepassService {
  return new SurepassService(apiToken, environment);
}

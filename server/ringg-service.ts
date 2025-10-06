export interface RinggService {
  testConnection(apiKey: string): Promise<{ success: boolean; message: string }>;
  triggerCall(
    apiKey: string,
    params: {
      phoneNumber: string;
      scriptId: string;
      variables: Record<string, any>;
    }
  ): Promise<{ success: boolean; callId?: string; message?: string }>;
  getCallStatus(apiKey: string, callId: string): Promise<any>;
  listScripts(apiKey: string): Promise<any[]>;
}

class RinggServiceImpl implements RinggService {
  private baseUrl = "https://prod-api.ringg.ai/ca/api/v0";

  private async makeRequest(
    endpoint: string,
    apiKey: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      console.log(`[Ringg.ai] Making request to: ${this.baseUrl}${endpoint}`);
      console.log(`[Ringg.ai] Request body:`, options.body);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      console.log(`[Ringg.ai] Response status: ${response.status}`);
      console.log(`[Ringg.ai] Response headers:`, Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        console.log(`[Ringg.ai] Response data:`, data);
      } else {
        const text = await response.text();
        console.log(`[Ringg.ai] Non-JSON response:`, text);
        throw new Error(`Ringg.ai API returned non-JSON response (status ${response.status}): ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `Request failed with status ${response.status}: ${JSON.stringify(data)}`
        );
      }

      return data;
    } catch (error: any) {
      console.error(`[Ringg.ai] Error:`, error.message);
      if (error.message.includes("fetch")) {
        throw new Error("Failed to connect to Ringg.ai API. Please check your network connection.");
      }
      if (error.name === "SyntaxError" || error.message.includes("JSON")) {
        throw new Error("Ringg.ai API returned invalid response. Please check your API key and agent ID.");
      }
      throw error;
    }
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.makeRequest("/workspace", apiKey, {
        method: "GET",
      });

      return {
        success: true,
        message: "Successfully connected to Ringg.ai API",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to connect to Ringg.ai API",
      };
    }
  }

  async triggerCall(
    apiKey: string,
    params: {
      phoneNumber: string;
      scriptId: string;
      variables: Record<string, any>;
      fromNumber: string;
    }
  ): Promise<{ success: boolean; callId?: string; message?: string }> {
    try {
      const customerName = params.variables.customerName || "Customer";
      
      const data = await this.makeRequest("/calling/outbound/individual", apiKey, {
        method: "POST",
        body: JSON.stringify({
          name: customerName,
          mobile_number: params.phoneNumber,
          agent_id: params.scriptId,
          from_number: params.fromNumber,
          custom_args_values: params.variables,
        }),
      });

      return {
        success: true,
        callId: data.data?.["Unique Call ID"] || data.data?.id,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to trigger call",
      };
    }
  }

  async getCallStatus(apiKey: string, callId: string): Promise<any> {
    try {
      const data = await this.makeRequest(`/calling/${callId}`, apiKey, {
        method: "GET",
      });

      return data;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get call status");
    }
  }

  async listScripts(apiKey: string): Promise<any[]> {
    try {
      const data = await this.makeRequest("/agents", apiKey, {
        method: "GET",
      });

      return Array.isArray(data) ? data : data.agents || data.data || [];
    } catch (error: any) {
      throw new Error(error.message || "Failed to list agents");
    }
  }
}

export const ringgService = new RinggServiceImpl();

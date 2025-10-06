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
  private baseUrl = "https://api.ringg.ai/v1";

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
          "Authorization": `Bearer ${apiKey}`,
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
        throw new Error("Ringg.ai API returned invalid response. Please check your API key and script ID.");
      }
      throw error;
    }
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.makeRequest("/account", apiKey, {
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
    }
  ): Promise<{ success: boolean; callId?: string; message?: string }> {
    try {
      const data = await this.makeRequest("/calls", apiKey, {
        method: "POST",
        body: JSON.stringify({
          phone_number: params.phoneNumber,
          script_id: params.scriptId,
          variables: params.variables,
        }),
      });

      return {
        success: true,
        callId: data.call_id || data.id,
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
      const data = await this.makeRequest(`/calls/${callId}`, apiKey, {
        method: "GET",
      });

      return data;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get call status");
    }
  }

  async listScripts(apiKey: string): Promise<any[]> {
    try {
      const data = await this.makeRequest("/scripts", apiKey, {
        method: "GET",
      });

      return Array.isArray(data) ? data : data.scripts || [];
    } catch (error: any) {
      throw new Error(error.message || "Failed to list scripts");
    }
  }
}

export const ringgService = new RinggServiceImpl();

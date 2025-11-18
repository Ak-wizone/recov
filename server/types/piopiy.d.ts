declare module "piopiy" {
  export interface CallOptions {
    duration?: number;
    timeout?: number;
    loop?: number;
    record?: boolean;
  }

  export interface StreamOptions {
    listen_mode?: "callee" | "caller" | "both";
    voice_quality?: "8000" | "16000";
    stream_on_answer?: boolean;
  }

  export interface CallResponse {
    code: number;
    data?: {
      request_id?: string;
      message?: string;
      conversation_uuid?: string;
    };
  }

  export class PiopiyAction {
    constructor();
    speak(text: string): void;
    stream(url: string, options?: StreamOptions): void;
    record(): void;
    PCMO(): string;
  }

  export interface VoiceAPI {
    call(
      to: string,
      from: string,
      pcmo: string,
      options?: CallOptions
    ): Promise<CallResponse>;
  }

  export class Piopiy {
    constructor(appId: string, appSecret: string);
    voice: VoiceAPI;
  }
}

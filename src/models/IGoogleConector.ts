export interface IGoogleConnector {
  connect(): Promise<void>;
  authorize(creds: any): Promise<void>;
  update(): Promise<void>;
} 
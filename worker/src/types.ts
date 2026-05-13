export type RequestLogEntry = {
  id: string;
  timestamp: number;
  isReplay: boolean;
  request: {
    method: string;
    url: string;
    headers: [string, string][];
    body?: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: [string, string][];
    body?: string;
  };
  error?: string;
};

export type Stats = {
  isConnected: boolean;
  requests: number;
};

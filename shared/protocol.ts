export type ProxyRequest = {
  method: string;
  url: string;
  headers: [string, string][];
  body?: string;
};

export type RequestMessage = {
  type: "request";
  request: ProxyRequest;
};

export type ProxyResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body?: string;
};

export type ResponseMessage = {
  type: "response";
  response: ProxyResponse;
};

export type RequestMessage = {
  type: "request";
  request: {
    method: string;
    url: string;
    headers: [string, string][];
    body?: string;
  };
};

export type ResponseMessage = {
  type: "response";
  response: {
    status: number;
    statusText: string;
    headers: [string, string][];
    body?: string;
  };
};

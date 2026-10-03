export type ProxyRequest = {
  method: string;
  url: string;
  headers: [string, string][];
  body?: string;
};

// Several requests can be in flight over one tunnel at a time, so every
// response carries the `id` of the request it answers.
export type RequestMessage = {
  type: "request";
  id: string;
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
  id: string;
  response: ProxyResponse;
};

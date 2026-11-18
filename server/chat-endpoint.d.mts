import type { IncomingMessage, ServerResponse } from 'node:http';

export type ChatHandlerOptions = {
  getApiKey?: () => string | undefined;
  fetchImpl?: typeof fetch;
};

export declare function createChatHandler(options?: ChatHandlerOptions): (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>;

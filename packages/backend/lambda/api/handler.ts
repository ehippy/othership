import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { appRouter } from "./router";
import { createContext } from "./trpc";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

// Create Lambda handler for tRPC with CORS support
const trpcHandler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
});

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  // Log incoming request with path
  const path = event.requestContext.http.path;
  const method = event.requestContext.http.method;
  console.log(`[${method}] ${path}`);

  // Handle CORS preflight
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  // Handle tRPC request
  const response = await trpcHandler(event, {} as any);

  // Add CORS headers to response
  return {
    ...response,
    headers: {
      ...response.headers,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };
};

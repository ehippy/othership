import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { appRouter } from "./router";
import { createContext } from "./trpc";

// Create Lambda handler for tRPC (works with API Gateway V2)
export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
});

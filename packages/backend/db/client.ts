import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

// Create DynamoDB client
const dynamoClient = new DynamoDBClient({});

// Export raw client for ElectroDB
export const client = dynamoClient;

// Create DynamoDB Document client (handles marshalling)
export const dynamoDb = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Get table name from SST resource binding
export const getTableName = () => (Resource as any).DerelictTable.name;

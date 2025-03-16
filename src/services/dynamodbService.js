const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} = require("../config/env");

const client = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});
const dynamoDB = DynamoDBDocumentClient.from(client);

async function getQuestions(tableName) {
  if (!tableName) {
    throw new Error("Missing tableName parameter");
  }

  const { Items } = await dynamoDB.send(
    new ScanCommand({
      TableName: tableName,
    })
  );

  return Items
    ? Items.sort(
        (a, b) => Number(a.question_number) - Number(b.question_number)
      )
    : [];
}

module.exports = { getQuestions };

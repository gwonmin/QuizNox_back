const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({}); // ✅ Lambda IAM Role 사용하도록 변경
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

const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(client);

//DynamoDB의 Query나 Scan은 응답 크기 제한(기본 1MB)
//아래처럼 LastEvaluatedKey가 있는 한 계속 QueryCommand를 반복해서 호출
async function getAllQuestionsByTopic(tableName, topicId) {
  let allItems = [];
  let ExclusiveStartKey = undefined;

  do {
    const response = await dynamoDB.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "topic_id = :tid",
        ExpressionAttributeValues: {
          ":tid": topicId,
        },
        ExclusiveStartKey,
        ScanIndexForward: true,
      })
    );

    allItems = allItems.concat(response.Items ?? []);
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return allItems;
}

module.exports = { getAllQuestionsByTopic };

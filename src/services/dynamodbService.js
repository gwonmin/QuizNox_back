const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({}); // ✅ Lambda IAM Role 사용하도록 변경
const dynamoDB = DynamoDBDocumentClient.from(client);

/**
 * 주어진 topic_id로 문제 리스트를 조회하고 question_number 기준으로 정렬해서 반환
 */
async function getQuestionsByTopic(tableName, topicId) {
  if (!tableName || !topicId) {
    throw new Error("Missing tableName or topicId parameter");
  }

  const { Items } = await dynamoDB.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "topic_id = :tid",
      ExpressionAttributeValues: {
        ":tid": topicId,
      },
    })
  );

  return Items
    ? Items.sort(
        (a, b) => Number(a.question_number) - Number(b.question_number)
      )
    : [];
}

module.exports = { getQuestionsByTopic };

const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// 환경 변수 설정
const { DYNAMODB_TABLE_NAME = "questions", AWS_REGION = "ap-northeast-2" } =
  process.env;

// 로깅 설정
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
};

/**
 * DynamoDB 클라이언트 생성
 * @param {Object} options - DynamoDB 클라이언트 옵션
 * @returns {DynamoDBDocumentClient}
 */
function createDynamoDBClient(options = {}) {
  try {
    const client = new DynamoDBClient({
      region: AWS_REGION,
      ...options,
    });
    return DynamoDBDocumentClient.from(client);
  } catch (error) {
    logger.error(`Failed to create DynamoDB client: ${error.message}`);
    throw new Error("Failed to initialize DynamoDB client");
  }
}

// 기본 DynamoDB 클라이언트 인스턴스
const dynamoDB = createDynamoDBClient();

/**
 * 주어진 topic_id로 문제 리스트를 조회하고 question_number 기준으로 정렬해서 반환
 * @param {string} topicId - 조회할 topic ID
 * @param {Object} options - 옵션 객체
 * @param {string} [options.tableName=DYNAMODB_TABLE_NAME] - DynamoDB 테이블 이름
 * @returns {Promise<Array>} - 조회된 문제 리스트
 * @throws {Error} - 파라미터 누락 또는 DynamoDB 쿼리 실패 시
 */
async function getQuestionsByTopic(topicId, options = {}) {
  const { tableName = DYNAMODB_TABLE_NAME, dynamoDBClient = dynamoDB } =
    options;

  // 파라미터 검증
  if (!topicId || typeof topicId !== "string") {
    throw new Error("topicId must be a non-empty string");
  }

  try {
    logger.info(`Querying questions for topic: ${topicId}`);

    const { Items } = await dynamoDBClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "topic_id = :tid",
        ExpressionAttributeValues: {
          ":tid": topicId,
        },
        ScanIndexForward: true,
      })
    );

    const result = Items ?? [];
    logger.info(`Found ${result.length} questions for topic: ${topicId}`);
    return result;
  } catch (error) {
    logger.error(`Failed to query questions: ${error.message}`);
    throw new Error(`Failed to query questions: ${error.message}`);
  }
}

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

module.exports = {
  getQuestionsByTopic,
  createDynamoDBClient,
  logger,
  getAllQuestionsByTopic,
};

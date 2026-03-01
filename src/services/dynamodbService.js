const {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DYNAMODB_TABLE_NAME = "QuizNox_Questions",
  DYNAMODB_REVIEWS_TABLE_NAME = "QuizNox_Reviews",
  AWS_REGION = "ap-northeast-2",
} = process.env;

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

// 기본 DynamoDB 클라이언트 인스턴스 (테스트 환경에서는 지연 초기화)
let dynamoDB = null;

function getDynamoDBClient() {
  if (!dynamoDB) {
    dynamoDB = createDynamoDBClient();
  }
  return dynamoDB;
}

/**
 * 주어진 topic_id로 문제 리스트를 조회하고 question_number 기준으로 정렬해서 반환
 * @param {string} topicId - 조회할 topic ID
 * @param {Object} options - 옵션 객체
 * @param {string} [options.tableName=DYNAMODB_TABLE_NAME] - DynamoDB 테이블 이름
 * @returns {Promise<Array>} - 조회된 문제 리스트
 * @throws {Error} - 파라미터 누락 또는 DynamoDB 쿼리 실패 시
 */
async function getQuestionsByTopic(topicId, options = {}) {
  const {
    tableName = DYNAMODB_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

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

/**
 * DynamoDB의 Query나 Scan은 응답 크기 제한(기본 1MB)
 * LastEvaluatedKey가 있는 한 계속 QueryCommand를 반복해서 호출하여 모든 데이터 조회
 * @param {string} tableName - DynamoDB 테이블 이름
 * @param {string} topicId - 조회할 topic ID
 * @param {DynamoDBDocumentClient} dynamoDBClient - DynamoDB 클라이언트 (선택사항)
 * @returns {Promise<Array>} - 조회된 모든 문제 리스트
 */
async function getAllQuestionsByTopic(
  tableName,
  topicId,
  dynamoDBClient = null
) {
  const client = dynamoDBClient || getDynamoDBClient();
  const allItems = [];
  let ExclusiveStartKey = undefined;

  try {
    do {
      const response = await client.send(
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

      allItems.push(...(response.Items ?? []));
      ExclusiveStartKey = response.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    logger.info(`Retrieved ${allItems.length} questions for topic: ${topicId}`);
    return allItems;
  } catch (error) {
    logger.error(
      `Failed to get all questions for topic ${topicId}: ${error.message}`
    );
    throw new Error(`Failed to get all questions: ${error.message}`);
  }
}

/**
 * 이용 후기 저장
 * @param {Object} review - { review_id, user_id, content, created_at }
 * @param {Object} options - { tableName, dynamoDBClient }
 * @returns {Promise<Object>}
 */
async function putReview(review, options = {}) {
  const {
    tableName = DYNAMODB_REVIEWS_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

  if (!review?.review_id || !review?.user_id || !review?.content || !review?.created_at) {
    throw new Error("review_id, user_id, content, created_at are required");
  }

  await dynamoDBClient.send(
    new PutCommand({
      TableName: tableName,
      Item: review,
    })
  );
  return review;
}

/**
 * 이용 후기 목록 조회 (Scan 후 created_at 내림차순 정렬, limit)
 * @param {Object} options - { limit = 50, tableName, dynamoDBClient }
 * @returns {Promise<Array>}
 */
async function listReviews(options = {}) {
  const {
    limit = 50,
    tableName = DYNAMODB_REVIEWS_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

  const allItems = [];
  let ExclusiveStartKey = undefined;

  do {
    const response = await dynamoDBClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey,
      })
    );
    allItems.push(...(response.Items ?? []));
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey && allItems.length < limit * 2);

  const sorted = allItems
    .filter((i) => i.created_at)
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    .slice(0, limit);

  return sorted;
}

/**
 * 이용 후기 단건 조회
 * @param {string} reviewId
 * @param {Object} options - { tableName, dynamoDBClient }
 * @returns {Promise<Object|null>}
 */
async function getReview(reviewId, options = {}) {
  const {
    tableName = DYNAMODB_REVIEWS_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

  if (!reviewId || typeof reviewId !== "string") {
    throw new Error("review_id is required");
  }

  const { Item } = await dynamoDBClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { review_id: reviewId },
    })
  );
  return Item ?? null;
}

/**
 * 이용 후기 수정 (content, updated_at만 변경)
 * @param {string} reviewId
 * @param {string} content
 * @param {Object} options - { tableName, dynamoDBClient }
 * @returns {Promise<Object>} 수정된 후기
 */
async function updateReview(reviewId, content, options = {}) {
  const {
    tableName = DYNAMODB_REVIEWS_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

  const existing = await getReview(reviewId, { tableName, dynamoDBClient });
  if (!existing) {
    throw new Error("Review not found");
  }

  const updated = {
    ...existing,
    content: content.trim(),
    updated_at: new Date().toISOString(),
  };
  await dynamoDBClient.send(
    new PutCommand({
      TableName: tableName,
      Item: updated,
    })
  );
  return updated;
}

/**
 * 이용 후기 삭제
 * @param {string} reviewId
 * @param {Object} options - { tableName, dynamoDBClient }
 */
async function deleteReview(reviewId, options = {}) {
  const {
    tableName = DYNAMODB_REVIEWS_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

  await dynamoDBClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { review_id: reviewId },
    })
  );
}

module.exports = {
  getQuestionsByTopic,
  createDynamoDBClient,
  getDynamoDBClient,
  logger,
  getAllQuestionsByTopic,
  putReview,
  listReviews,
  getReview,
  updateReview,
  deleteReview,
};

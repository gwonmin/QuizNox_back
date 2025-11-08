const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

// 환경 변수 설정
const {
  DYNAMODB_TABLE_NAME = "QuizNox_Questions",
  DYNAMODB_BOOKMARKS_TABLE_NAME = "QuizNox_Bookmarks",
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
 * 북마크를 저장하거나 업데이트합니다.
 * @param {string} userId - 사용자 ID
 * @param {string} topicId - 토픽 ID
 * @param {string} questionNumber - 문제 번호
 * @param {Object} options - 옵션 객체
 * @param {string} [options.tableName=DYNAMODB_BOOKMARKS_TABLE_NAME] - DynamoDB 테이블 이름
 * @returns {Promise<Object>} - 저장된 북마크 데이터
 * @throws {Error} - 파라미터 누락 또는 DynamoDB 저장 실패 시
 */
async function saveBookmark(userId, topicId, questionNumber, options = {}) {
  const {
    tableName = DYNAMODB_BOOKMARKS_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

  // 파라미터 검증
  if (!userId || typeof userId !== "string") {
    throw new Error("userId must be a non-empty string");
  }
  if (!topicId || typeof topicId !== "string") {
    throw new Error("topicId must be a non-empty string");
  }
  if (!questionNumber || typeof questionNumber !== "string") {
    throw new Error("questionNumber must be a non-empty string");
  }

  try {
    const now = new Date().toISOString();
    // TTL 설정: 1년 후 (초 단위 Unix timestamp)
    const ttl = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    // 기존 북마크 조회 (createdAt 유지를 위해)
    const existingBookmark = await getBookmark(userId, topicId, {
      tableName,
      dynamoDBClient,
    });

    const bookmark = {
      user_id: userId,
      topic_id: topicId,
      question_number: questionNumber,
      created_at: existingBookmark?.created_at || now, // 기존 북마크가 있으면 created_at 유지
      updated_at: now, // updated_at은 항상 현재 시간으로 업데이트
      ttl,
    };

    logger.info(
      `Saving bookmark for user: ${userId}, topic: ${topicId}, question: ${questionNumber}`
    );

    await dynamoDBClient.send(
      new PutCommand({
        TableName: tableName,
        Item: bookmark,
      })
    );

    logger.info(
      `Bookmark saved successfully for user: ${userId}, topic: ${topicId}`
    );
    return bookmark;
  } catch (error) {
    logger.error(`Failed to save bookmark: ${error.message}`);
    throw new Error(`Failed to save bookmark: ${error.message}`);
  }
}

/**
 * 북마크를 조회합니다.
 * @param {string} userId - 사용자 ID
 * @param {string} topicId - 토픽 ID
 * @param {Object} options - 옵션 객체
 * @param {string} [options.tableName=DYNAMODB_BOOKMARKS_TABLE_NAME] - DynamoDB 테이블 이름
 * @returns {Promise<Object|null>} - 조회된 북마크 데이터 또는 null
 * @throws {Error} - 파라미터 누락 또는 DynamoDB 조회 실패 시
 */
async function getBookmark(userId, topicId, options = {}) {
  const {
    tableName = DYNAMODB_BOOKMARKS_TABLE_NAME,
    dynamoDBClient = getDynamoDBClient(),
  } = options;

  // 파라미터 검증
  if (!userId || typeof userId !== "string") {
    throw new Error("userId must be a non-empty string");
  }
  if (!topicId || typeof topicId !== "string") {
    throw new Error("topicId must be a non-empty string");
  }

  try {
    logger.info(`Getting bookmark for user: ${userId}, topic: ${topicId}`);

    const { Item } = await dynamoDBClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          user_id: userId,
          topic_id: topicId,
        },
      })
    );

    if (!Item) {
      logger.info(`No bookmark found for user: ${userId}, topic: ${topicId}`);
      return null;
    }

    // TTL 필드는 응답에서 제외
    const { ttl, ...bookmark } = Item;
    logger.info(`Bookmark found for user: ${userId}, topic: ${topicId}`);
    return bookmark;
  } catch (error) {
    logger.error(`Failed to get bookmark: ${error.message}`);
    throw new Error(`Failed to get bookmark: ${error.message}`);
  }
}

module.exports = {
  getQuestionsByTopic,
  createDynamoDBClient,
  getDynamoDBClient,
  logger,
  getAllQuestionsByTopic,
  saveBookmark,
  getBookmark,
};

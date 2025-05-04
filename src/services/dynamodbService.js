const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const NodeCache = require("node-cache");

// 환경 변수 설정
const {
  DYNAMODB_TABLE_NAME = "questions",
  AWS_REGION = "ap-northeast-2",
  CACHE_TTL = 3600, // 1시간
} = process.env;

// 캐시 설정
const cache = new NodeCache({ stdTTL: CACHE_TTL });

// 메트릭 수집을 위한 간단한 유틸리티
const metrics = {
  queryCount: 0,
  cacheHitCount: 0,
  errorCount: 0,
  startTime: Date.now(),

  increment(metric) {
    this[metric]++;
  },

  getMetrics() {
    const uptime = (Date.now() - this.startTime) / 1000;
    return {
      queryCount: this.queryCount,
      cacheHitCount: this.cacheHitCount,
      errorCount: this.errorCount,
      cacheHitRate: this.queryCount
        ? (this.cacheHitCount / this.queryCount) * 100
        : 0,
      uptime,
      queriesPerSecond: this.queryCount / uptime,
    };
  },
};

// 로깅 설정
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  metrics: () => {
    const metricsData = metrics.getMetrics();
    console.log("[METRICS]", JSON.stringify(metricsData, null, 2));
  },
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
 * @param {boolean} [options.useCache=true] - 캐시 사용 여부
 * @returns {Promise<Array>} - 조회된 문제 리스트
 * @throws {Error} - 파라미터 누락 또는 DynamoDB 쿼리 실패 시
 */
async function getQuestionsByTopic(topicId, options = {}) {
  const {
    tableName = DYNAMODB_TABLE_NAME,
    useCache = true,
    dynamoDBClient = dynamoDB,
  } = options;

  // 파라미터 검증
  if (!topicId || typeof topicId !== "string") {
    throw new Error("topicId must be a non-empty string");
  }

  metrics.increment("queryCount");

  // 캐시 키 생성
  const cacheKey = `questions:${topicId}`;

  // 캐시에서 데이터 조회
  if (useCache) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      metrics.increment("cacheHitCount");
      logger.info(`Cache hit for topic: ${topicId}`);
      return cachedData;
    }
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

    // 결과를 캐시에 저장
    if (useCache) {
      cache.set(cacheKey, result);
    }

    logger.info(`Found ${result.length} questions for topic: ${topicId}`);
    return result;
  } catch (error) {
    metrics.increment("errorCount");
    logger.error(`Failed to query questions: ${error.message}`);
    throw new Error(`Failed to query questions: ${error.message}`);
  }
}

/**
 * 캐시를 초기화하는 함수
 * @param {string} [topicId] - 특정 topic의 캐시만 초기화할 경우 topicId
 */
function clearCache(topicId) {
  if (topicId) {
    cache.del(`questions:${topicId}`);
  } else {
    cache.flushAll();
  }
}

module.exports = {
  getQuestionsByTopic,
  clearCache,
  createDynamoDBClient,
  getMetrics: () => metrics.getMetrics(),
  logger,
};

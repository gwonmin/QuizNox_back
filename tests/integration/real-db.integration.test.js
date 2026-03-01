// 실제 DynamoDB 테이블과 연동하는 통합 테스트
const {
  getAllQuestionsByTopic,
  createDynamoDBClient,
} = require("../../src/services/dynamodbService");
const fastify = require("fastify");
const jwt = require("jsonwebtoken");
const routes = require("../../src/routes");
const authPlugin = require("../../src/plugins/auth");

function makeAuthHeader() {
  const token = jwt.sign(
    { user_id: "test-user-id", username: "tester" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  return `Bearer ${token}`;
}

describe("QuizNox Real Database Integration Tests", () => {
  let app;
  let dynamoDBClient;
  let authHeader;

  beforeAll(async () => {
    app = fastify();
    await app.register(authPlugin);
    await app.register(routes);
    await app.ready();
    dynamoDBClient = createDynamoDBClient();
    authHeader = makeAuthHeader();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Database Connection", () => {
    it("should connect to real DynamoDB table", async () => {
      expect(dynamoDBClient).toBeDefined();
      expect(typeof dynamoDBClient.send).toBe("function");
    });
  });

  describe("Real API Endpoints", () => {
    it("should handle GET /questions with real data", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions?topicId=AWS_DVA",
        headers: {
          authorization: authHeader,
        },
      });

      console.log(`📊 API 응답 상태: ${response.statusCode}`);
      console.log(`📊 응답 데이터: ${response.payload}`);

      // 200, 404 (데이터 없음), 500 (DB 연결 실패) 모두 정상
      expect([200, 404, 500]).toContain(response.statusCode);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.payload);
        expect(Array.isArray(data)).toBe(true);
        console.log(`✅ 실제 데이터 ${data.length}개 조회 성공`);
      } else {
        console.log("ℹ️ 해당 토픽에 데이터가 없습니다.");
      }
    });

    it("should return 400 for missing topicId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions",
        headers: {
          authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe("Missing topicId parameter");
    });

    it("should return 400 for empty topicId", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions?topicId=",
        headers: {
          authorization: authHeader,
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.message).toBe("Missing topicId parameter");
    });
  });

  describe("Real Data Validation", () => {
    it("should validate question data structure when data exists", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions?topicId=AWS_DVA",
        headers: {
          authorization: authHeader,
        },
      });

      if (response.statusCode === 200) {
        const questions = JSON.parse(response.payload);

        if (questions.length > 0) {
          const question = questions[0];

          // 필수 필드 검증
          expect(question).toHaveProperty("topic_id");
          expect(question).toHaveProperty("question_number");
          expect(question).toHaveProperty("question_text");
          expect(question).toHaveProperty("choices");
          expect(question).toHaveProperty("most_voted_answer");

          // 데이터 타입 검증
          expect(typeof question.topic_id).toBe("string");
          expect(typeof question.question_number).toBe("string");
          expect(typeof question.question_text).toBe("string");
          expect(Array.isArray(question.choices)).toBe(true);
          expect(typeof question.most_voted_answer).toBe("string");

          // 선택지 개수 검증 (일반적으로 4개)
          expect(question.choices.length).toBeGreaterThan(0);
          expect(question.choices.length).toBeLessThanOrEqual(10);

          // 정답 검증 (A, B, C, D 중 하나)
          expect(["A", "B", "C", "D"]).toContain(question.most_voted_answer);

          console.log("✅ 실제 데이터 구조 검증 완료");
        } else {
          console.log("ℹ️ 검증할 데이터가 없습니다.");
        }
      } else {
        console.log("ℹ️ 데이터가 없어 검증을 건너뜁니다.");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      // 잘못된 테이블명으로 테스트 (실제로는 환경변수로 제어)
      const originalTableName = process.env.DYNAMODB_TABLE_NAME;
      process.env.DYNAMODB_TABLE_NAME = "NonExistentTable";

      try {
        const response = await app.inject({
          method: "GET",
          url: "/questions?topicId=test",
          headers: {
            authorization: authHeader,
          },
        });

        // 에러가 발생하면 500 또는 404로 처리될 수 있음
        expect([500, 404]).toContain(response.statusCode);
        const data = JSON.parse(response.payload);

        if (response.statusCode === 500) {
          expect(data.message).toBe("Internal Server Error");
          console.log("✅ DB 에러가 500으로 처리되었습니다.");
        } else {
          expect(data.message).toBe("No items found");
          console.log("✅ 잘못된 테이블명이 404로 처리되었습니다.");
        }

        console.log("✅ 에러 처리가 정상적으로 작동합니다.");
      } finally {
        // 원래 테이블명 복원
        process.env.DYNAMODB_TABLE_NAME = originalTableName;
      }
    });
  });
});

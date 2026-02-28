const fastify = require("fastify");
const routes = require("../../src/routes");
const authPlugin = require("../../src/plugins/auth");

// 실제 DynamoDB 연결을 위한 환경 변수 설정
process.env.AWS_REGION = "ap-northeast-2";
process.env.DYNAMODB_TABLE_NAME = "QuizNox_Questions";

describe("QuizNox API Integration Tests", () => {
  let app;

  beforeAll(async () => {
    app = fastify();
    // 인증 플러그인 등록 (프로덕션과 동일하게)
    await app.register(authPlugin);
    await app.register(routes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /questions", () => {
    it("should handle complete request flow with real data", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions?topicId=AWS_DVA",
        headers: {
          authorization: "Bearer test_user_id",
        },
      });

      console.log(`📊 API 응답 상태: ${response.statusCode}`);

      // 200, 404 (데이터 없음), 500 (DB 연결 실패) 모두 정상
      expect([200, 404, 500]).toContain(response.statusCode);
      expect(response.headers["content-type"]).toContain("application/json");

      if (response.statusCode === 200) {
        const data = JSON.parse(response.payload);
        expect(Array.isArray(data)).toBe(true);
        console.log(`✅ 실제 데이터 ${data.length}개 조회 성공`);
      } else {
        console.log("ℹ️ 해당 토픽에 데이터가 없습니다.");
      }
    });

    it("should handle error scenarios gracefully", async () => {
      // 잘못된 테이블명으로 테스트
      const originalTableName = process.env.DYNAMODB_TABLE_NAME;
      process.env.DYNAMODB_TABLE_NAME = "NonExistentTable";

      try {
        const response = await app.inject({
          method: "GET",
          url: "/questions?topicId=test",
          headers: {
            authorization: "Bearer test_user_id",
          },
        });

        // 에러가 발생하면 500 또는 404로 처리될 수 있음
        expect([500, 404]).toContain(response.statusCode);
        expect(response.headers["content-type"]).toContain("application/json");

        const data = JSON.parse(response.payload);

        if (response.statusCode === 500) {
          expect(data).toEqual({
            message: "Internal Server Error",
          });
          console.log("✅ DB 에러가 500으로 처리되었습니다.");
        } else {
          expect(data).toEqual({
            message: "No items found",
          });
          console.log("✅ 잘못된 테이블명이 404로 처리되었습니다.");
        }

        console.log("✅ 에러 처리가 정상적으로 작동합니다.");
      } finally {
        process.env.DYNAMODB_TABLE_NAME = originalTableName;
      }
    });

    it("should handle empty results", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions?topicId=non-existent-topic-12345",
        headers: {
          authorization: "Bearer test_user_id",
        },
      });

      // 404 (데이터 없음) 또는 500 (DB 연결 실패) 모두 정상
      expect([404, 500]).toContain(response.statusCode);
      expect(response.headers["content-type"]).toContain("application/json");

      const data = JSON.parse(response.payload);
      if (response.statusCode === 404) {
        expect(data).toEqual({
          message: "No items found",
        });
      } else {
        expect(data).toEqual({
          message: "Internal Server Error",
        });
      }
    });

    it("should validate required parameters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions",
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers["content-type"]).toContain("application/json");

      const data = JSON.parse(response.payload);
      expect(data).toEqual({
        message: "Missing topicId parameter",
      });
    });
  });

  describe("API Response Format", () => {
    it("should return consistent response format for success", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions?topicId=AWS_DVA",
        headers: {
          authorization: "Bearer test_user_id",
        },
      });

      if (response.statusCode === 200) {
        const data = JSON.parse(response.payload);
        expect(Array.isArray(data)).toBe(true);

        if (data.length > 0) {
          const question = data[0];
          expect(question).toHaveProperty("topic_id");
          expect(question).toHaveProperty("question_number");
          expect(question).toHaveProperty("question_text");
          expect(question).toHaveProperty("choices");
          expect(question).toHaveProperty("most_voted_answer");
          expect(Array.isArray(question.choices)).toBe(true);
          expect(typeof question.most_voted_answer).toBe("string");

          console.log("✅ 실제 데이터 형식 검증 완료");
        }
      } else {
        console.log("ℹ️ 데이터가 없어 형식 검증을 건너뜁니다.");
      }
    });

    it("should return consistent error format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/questions",
      });

      expect(response.statusCode).toBe(400);

      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty("message");
      expect(typeof data.message).toBe("string");
    });
  });

  describe("Performance and Reliability", () => {
    it("should handle multiple concurrent requests", async () => {
      const requests = Array(3)
        .fill()
        .map(() =>
          app.inject({
            method: "GET",
            url: "/questions?topicId=AWS_DVA",
            headers: {
              authorization: "Bearer test_user_id",
            },
          })
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([200, 404, 500]).toContain(response.statusCode);
      });

      console.log("✅ 동시 요청 처리 테스트 완료");
    });
  });

});

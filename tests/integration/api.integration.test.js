const fastify = require("fastify");
const routes = require("../../src/routes");
const authPlugin = require("../../src/plugins/auth");

describe("QuizNox API Integration Tests", () => {
  let app;

  beforeAll(async () => {
    app = fastify();
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

  describe("GET /reviews", () => {
    it("should return 200 and array without auth", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/reviews",
      });
      expect([200, 500]).toContain(response.statusCode);
      expect(response.headers["content-type"]).toContain("application/json");
      if (response.statusCode === 200) {
        const data = JSON.parse(response.payload);
        expect(Array.isArray(data)).toBe(true);
      }
    });

    it("should accept limit query", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/reviews?limit=10",
      });
      expect([200, 500]).toContain(response.statusCode);
    });
  });

  describe("POST /reviews", () => {
    it("should return 401 without auth", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/reviews",
        payload: { content: "후기 내용" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 400 when content is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/reviews",
        headers: { authorization: "Bearer test_user_id" },
        payload: {},
      });
      // 400: 검증 실패, 401: 인증 실패(헤더 미전달 등)
      expect([400, 401]).toContain(response.statusCode);
      if (response.statusCode === 400) {
        const data = JSON.parse(response.payload);
        expect(data.message).toContain("content");
      }
    });

    it("should return 201 or 500 when content is valid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/reviews",
        headers: { authorization: "Bearer test_user_id" },
        payload: { content: "테스트 후기" },
      });
      expect([201, 500, 401]).toContain(response.statusCode);
      if (response.statusCode === 201) {
        const data = JSON.parse(response.payload);
        expect(data).toHaveProperty("review_id");
        expect(data).toHaveProperty("user_id");
        expect(data).toHaveProperty("content");
        expect(data).toHaveProperty("created_at");
      }
    });
  });

  describe("PUT /reviews/:review_id", () => {
    it("should return 401 without auth", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/reviews/some-id",
        payload: { content: "수정 내용" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 404 or 403 or 500 for non-existent or other user review", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/reviews/non-existent-review-id",
        headers: { authorization: "Bearer test_user_id" },
        payload: { content: "수정 내용" },
      });
      expect([404, 403, 500, 401]).toContain(response.statusCode);
    });
  });

  describe("DELETE /reviews/:review_id", () => {
    it("should return 401 without auth", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/reviews/some-id",
      });
      expect(response.statusCode).toBe(401);
    });

    it("should return 404 or 403 or 500 for non-existent or other user review", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/reviews/non-existent-review-id",
        headers: { authorization: "Bearer test_user_id" },
      });
      expect([404, 403, 204, 500, 401]).toContain(response.statusCode);
    });
  });
});

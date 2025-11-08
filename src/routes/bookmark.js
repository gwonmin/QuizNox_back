const { saveBookmark, getBookmark } = require("../services/dynamodbService");

async function bookmarkRoutes(fastify, options) {
  // 북마크 저장 API
  fastify.post("/bookmark", async (request, reply) => {
    try {
      const { topicId, questionNumber } = request.body || {};
      const userId = request.user?.userId;

      // 파라미터 검증
      if (!topicId) {
        return reply.status(400).send({
          success: false,
          data: null,
          message: "topicId와 questionNumber는 필수입니다.",
          statusCode: 400,
        });
      }

      if (!questionNumber) {
        return reply.status(400).send({
          success: false,
          data: null,
          message: "topicId와 questionNumber는 필수입니다.",
          statusCode: 400,
        });
      }

      // 북마크 저장
      const bookmark = await saveBookmark(userId, topicId, questionNumber);

      return reply.status(200).send({
        success: true,
        data: bookmark,
        message: "북마크가 저장되었습니다.",
        statusCode: 200,
      });
    } catch (error) {
      console.error("Bookmark save error:", error);

      // 에러 타입에 따른 구체적인 응답
      if (
        error.message.includes("userId must be a non-empty string") ||
        error.message.includes("topicId must be a non-empty string") ||
        error.message.includes("questionNumber must be a non-empty string")
      ) {
        return reply.status(400).send({
          success: false,
          data: null,
          message: "topicId와 questionNumber는 필수입니다.",
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        data: null,
        message: "서버 에러가 발생했습니다.",
        statusCode: 500,
      });
    }
  });

  // 북마크 조회 API
  fastify.get("/bookmark", async (request, reply) => {
    try {
      const topicId = request.query.topicId;
      const userId = request.user?.userId;

      // 파라미터 검증
      if (!topicId) {
        return reply.status(400).send({
          success: false,
          data: null,
          message: "topicId는 필수입니다.",
          statusCode: 400,
        });
      }

      // 북마크 조회
      const bookmark = await getBookmark(userId, topicId);

      if (!bookmark) {
        return reply.status(200).send({
          success: true,
          data: null,
          message: "북마크가 없습니다.",
          statusCode: 200,
        });
      }

      return reply.status(200).send({
        success: true,
        data: bookmark,
        message: "북마크를 조회했습니다.",
        statusCode: 200,
      });
    } catch (error) {
      console.error("Bookmark get error:", error);

      // 에러 타입에 따른 구체적인 응답
      if (
        error.message.includes("userId must be a non-empty string") ||
        error.message.includes("topicId must be a non-empty string")
      ) {
        return reply.status(400).send({
          success: false,
          data: null,
          message: "topicId는 필수입니다.",
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        data: null,
        message: "서버 에러가 발생했습니다.",
        statusCode: 500,
      });
    }
  });
}

module.exports = bookmarkRoutes;

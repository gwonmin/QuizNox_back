const { saveBookmark, getBookmark } = require("../services/dynamodbService");

/**
 * questionNumber를 4자리 패딩 형식으로 정규화합니다.
 * 예: "1" -> "0001", "123" -> "0123", "0001" -> "0001"
 */
function normalizeQuestionNumber(questionNumber) {
  if (!questionNumber) {
    return null;
  }

  // 문자열로 변환
  const str = String(questionNumber).trim();

  // 숫자가 아닌 경우 원본 반환 (이미 "0001" 형식일 수 있음)
  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return str; // 숫자가 아니면 원본 반환
  }

  // 4자리 패딩 형식으로 변환
  return String(num).padStart(4, "0");
}

async function bookmarkRoutes(fastify, options) {
  // 북마크 저장 API
  fastify.post("/bookmark", async (request, reply) => {
    try {
      const { topicId, questionNumber } = request.body || {};
      const userId = request.user?.userId;

      // 디버깅: userId 확인
      fastify.log.info({
        msg: "Bookmark save request",
        hasUser: !!request.user,
        userId: userId || "undefined",
        userIdType: typeof userId,
        topicId,
        questionNumber,
      });

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

      // questionNumber를 4자리 패딩 형식으로 정규화
      const normalizedQuestionNumber = normalizeQuestionNumber(questionNumber);

      // 북마크 저장
      const bookmark = await saveBookmark(
        userId,
        topicId,
        normalizedQuestionNumber
      );

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

      // 디버깅: userId 확인
      fastify.log.info({
        msg: "Bookmark get request",
        hasUser: !!request.user,
        userId: userId || "undefined",
        userIdType: typeof userId,
        topicId,
      });

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

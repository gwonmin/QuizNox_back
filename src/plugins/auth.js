/**
 * Fastify 인증 플러그인
 * Bearer Token을 검증하고 user_id를 추출합니다.
 */

const jwt = require("jsonwebtoken");

async function authPlugin(fastify, options) {
  fastify.decorateRequest("user", null);

  fastify.addHook("onRequest", async (request, reply) => {
    // Authorization 헤더 확인
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        data: null,
        message: "인증이 필요합니다.",
        statusCode: 401,
      });
    }

    // Bearer Token 형식 확인
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return reply.status(401).send({
        success: false,
        data: null,
        message: "인증이 필요합니다.",
        statusCode: 401,
      });
    }

    const token = parts[1];

    try {
      // TODO: JWT_SECRET을 알게 되면 아래 주석을 해제하고 실제 JWT 검증을 사용하세요
      /*
      // JWT_SECRET 환경 변수 확인
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        fastify.log.error("JWT_SECRET 환경 변수가 설정되지 않았습니다.");
        return reply.status(500).send({
          success: false,
          data: null,
          message: "서버 설정 오류가 발생했습니다.",
          statusCode: 500,
        });
      }

      // JWT 토큰 검증 및 디코딩
      const decoded = jwt.verify(token, jwtSecret);

      // user_id 추출 (다양한 필드명 지원)
      const userId = decoded.user_id || decoded.userId || decoded.sub || decoded.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          data: null,
          message: "인증이 필요합니다.",
          statusCode: 401,
        });
      }

      // request 객체에 user 정보 추가
      request.user = { userId };
      */

      // 임시 구현: 테스트용 (JWT 검증 없이 토큰을 user_id로 사용)
      // 실제 프로덕션에서는 위의 JWT 검증 로직을 사용해야 합니다
      if (!token || token.length === 0) {
        return reply.status(401).send({
          success: false,
          data: null,
          message: "인증이 필요합니다.",
          statusCode: 401,
        });
      }

      // 토큰을 user_id로 사용 (테스트용)
      // 실제로는 JWT에서 user_id를 추출해야 합니다
      const userId = token;
      request.user = { userId };
    } catch (error) {
      // JWT 검증 실패 처리 (현재는 사용하지 않지만 주석 처리)
      /*
      if (error.name === "JsonWebTokenError") {
        return reply.status(401).send({
          success: false,
          data: null,
          message: "인증이 필요합니다.",
          statusCode: 401,
        });
      }

      if (error.name === "TokenExpiredError") {
        return reply.status(401).send({
          success: false,
          data: null,
          message: "토큰이 만료되었습니다.",
          statusCode: 401,
        });
      }
      */

      // 기타 에러
      fastify.log.error(`인증 에러: ${error.message}`);
      return reply.status(401).send({
        success: false,
        data: null,
        message: "인증이 필요합니다.",
        statusCode: 401,
      });
    }
  });
}

module.exports = authPlugin;

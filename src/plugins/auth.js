/**
 * Fastify 인증 플러그인
 * Bearer Token을 검증하고 user_id를 추출합니다.
 */

const jwt = require("jsonwebtoken");

async function authPlugin(fastify, options) {
  fastify.decorateRequest("user", null);

  fastify.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions?.config?.skipAuth) return;

    let authHeader = null;
    const headerKeys = Object.keys(request.headers);

    // 대소문자 구분 없이 authorization 헤더 찾기
    for (const key of headerKeys) {
      if (key.toLowerCase() === "authorization") {
        authHeader = request.headers[key];
        break;
      }
    }

    // 디버깅: 헤더 확인
    fastify.log.info({
      msg: "Auth header check",
      hasAuthHeader: !!authHeader,
      headerKeys: headerKeys,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + "..." : null,
    });

    if (!authHeader) {
      fastify.log.warn("Authorization header is missing");
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
      fastify.log.warn({
        msg: "Invalid Bearer token format",
        partsLength: parts.length,
        firstPart: parts[0],
      });
      return reply.status(401).send({
        success: false,
        data: null,
        message: "인증이 필요합니다.",
        statusCode: 401,
      });
    }

    const token = parts[1];

    try {
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
      const userId =
        decoded.user_id || decoded.userId || decoded.sub || decoded.id;

      if (!userId) {
        fastify.log.warn("JWT 토큰에 user_id가 없습니다.");
        return reply.status(401).send({
          success: false,
          data: null,
          message: "인증이 필요합니다.",
          statusCode: 401,
        });
      }

      // request 객체에 user 정보 추가
      request.user = { userId };

      // 디버깅: userId 추출 확인
      fastify.log.info({
        msg: "User authenticated",
        userId: String(userId).substring(0, 20) + "...",
        userIdLength: String(userId).length,
      });
    } catch (error) {
      // JWT 검증 실패 처리
      if (error.name === "JsonWebTokenError") {
        fastify.log.warn(`JWT 검증 실패: ${error.message}`);
        return reply.status(401).send({
          success: false,
          data: null,
          message: "인증이 필요합니다.",
          statusCode: 401,
        });
      }

      if (error.name === "TokenExpiredError") {
        fastify.log.warn("JWT 토큰이 만료되었습니다.");
        return reply.status(401).send({
          success: false,
          data: null,
          message: "토큰이 만료되었습니다.",
          statusCode: 401,
        });
      }

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

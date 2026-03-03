/**
 * Fastify 인증 플러그인
 * Bearer Token을 검증하고 user_id를 추출합니다.
 * fastify-plugin으로 래핑하여 캡슐화를 해제해야
 * 형제 플러그인(routes)에도 onRequest 훅이 적용됩니다.
 */

const fp = require("fastify-plugin");
const jwt = require("jsonwebtoken");

async function authPlugin(fastify, options) {
  // 로컬 개발 등에서 JWT 인증을 완전히 비활성화할 수 있는 플래그
  const isAuthDisabled = process.env.DISABLE_JWT_AUTH === "true";
  const devUserId = process.env.DEV_USER_ID || "dev-user";
  const devUsername = process.env.DEV_USERNAME || "dev-user";

  // 애플리케이션 부팅 시점에 JWT_SECRET을 한 번만 검증하여
  // 요청 처리 중간에 500 에러가 발생하지 않도록 한다.
  const jwtSecret = process.env.JWT_SECRET;

  if (!isAuthDisabled && !jwtSecret) {
    fastify.log.error("JWT_SECRET 환경 변수가 설정되지 않았습니다.");
    throw new Error("JWT_SECRET 환경 변수가 설정되지 않았습니다.");
  }

  if (isAuthDisabled) {
    fastify.log.warn("DISABLE_JWT_AUTH=true 이므로 JWT 인증이 비활성화되었습니다.");
  }

  // 라우트 레벨에서 인증 비활성화 여부를 참조할 수 있도록 fastify 인스턴스에 노출
  fastify.decorate("isAuthDisabled", isAuthDisabled);

  fastify.decorateRequest("user", null);

  fastify.addHook("onRequest", async (request, reply) => {
    // OPTIONS(프리플라이트)는 CORS에서 처리하므로 인증 제외
    if (request.method === "OPTIONS") return;

    // Fastify 4: route config는 request.routeConfig에 위치 (routeOptions.config 아님)
    if (request.routeConfig?.skipAuth) return;

    // 전역 JWT 인증 비활성화 플래그가 켜져 있으면 인증을 건너뜀
    // 후기 작성 등에서 user 정보가 필요한 경우가 있으므로, 최소한의 더미 유저를 주입한다.
    if (isAuthDisabled) {
      request.user = request.user || {
        userId: devUserId,
        username: devUsername,
      };
      return;
    }

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

      const username = decoded.username || null;
      request.user = { userId, username };

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

module.exports = fp(authPlugin);

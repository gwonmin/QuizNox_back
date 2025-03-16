const fastify = require("fastify")({ logger: true });
const serverless = require("serverless-http");
const cors = require("@fastify/cors");
const routes = require("./routes");
require("dotenv").config();

// CORS 설정 (프론트엔드에서 API 호출 가능하게)
fastify.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

// 라우트 등록
fastify.register(routes);

// Lambda 핸들러 설정 (서버리스 환경에서 실행)
module.exports.handler = serverless(fastify);

const start = async () => {
  try {
    console.log("🚀 Starting Fastify server..."); // ✅ 로그 추가
    await fastify.listen({ port: 4000, host: "localhost" }); // ✅ "localhost"로 변경
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
};

start();

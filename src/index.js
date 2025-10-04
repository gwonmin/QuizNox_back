const fastify = require("fastify")({ logger: true });
const serverless = require("serverless-http");
const cors = require("@fastify/cors");
const routes = require("./routes");
require("dotenv").config();

// CORS 설정
fastify.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

// 라우트 등록
fastify.register(routes);

// Lambda 핸들러 등록
module.exports.handler = serverless(fastify);

// 로컬 개발 환경일 때만 listen 실행
if (process.env.IS_LOCAL === "true") {
  const start = async () => {
    try {
      console.log("🚀 Starting Fastify server...");
      await fastify.listen({ 
        port: process.env.PORT || 4000, 
        host: process.env.HOST || "localhost" 
      });
      console.log(`✅ Server running on http://${process.env.HOST || "localhost"}:${process.env.PORT || 4000}`);
    } catch (err) {
      console.error("❌ Server failed to start:", err);
      process.exit(1);
    }
  };
  start();
}

const questionsRoutes = require("./questions");
const bookmarkRoutes = require("./bookmark");

async function routes(fastify, options) {
  // 퀴즈 라우트 등록
  fastify.register(questionsRoutes);
  // 북마크 라우트 등록
  fastify.register(bookmarkRoutes);
}

module.exports = routes;

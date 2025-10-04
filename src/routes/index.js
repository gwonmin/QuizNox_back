const questionsRoutes = require("./questions");

async function routes(fastify, options) {
  // 퀴즈 라우트 등록
  fastify.register(questionsRoutes);
}

module.exports = routes;

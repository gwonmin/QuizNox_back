const questionsRoutes = require("./questions");

async function routes(fastify, options) {
  fastify.register(questionsRoutes);
}

module.exports = routes;

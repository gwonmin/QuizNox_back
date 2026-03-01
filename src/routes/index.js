const questionsRoutes = require("./questions");
const reviewsRoutes = require("./reviews");

async function routes(fastify, options) {
  fastify.register(questionsRoutes);
  fastify.register(reviewsRoutes);
}

module.exports = routes;

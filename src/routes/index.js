const questionsRoutes = require("./questions");
const reviewsRoutes = require("./reviews");
const progressRoutes = require("./progress");

async function routes(fastify, options) {
  fastify.register(questionsRoutes);
  fastify.register(reviewsRoutes);
  fastify.register(progressRoutes);
}

module.exports = routes;

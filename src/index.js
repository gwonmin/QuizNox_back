const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");
const authPlugin = require("./plugins/auth");
const routes = require("./routes");
require("dotenv").config();

fastify.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

fastify.get("/health", { config: { skipAuth: true } }, async () => {
  return { status: "ok", service: "quiznox-api" };
});

fastify.register(authPlugin);
fastify.register(routes);

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT || 4000,
      host: process.env.HOST || "0.0.0.0",
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

require("dotenv").config();

const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");
const authPlugin = require("./plugins/auth");
const routes = require("./routes");

fastify.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

fastify.addContentTypeParser(
  "application/x-www-form-urlencoded",
  { parseAs: "string" },
  (_req, body, done) => {
    try {
      done(null, body ? JSON.parse(body) : {});
    } catch {
      done(null, {});
    }
  },
);

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

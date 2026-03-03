require("dotenv").config();

const fastify = require("fastify");
const cors = require("@fastify/cors");
const authPlugin = require("./plugins/auth");
const routes = require("./routes");

function createServer() {
  const app = fastify({ logger: true });

  app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  });

  app.get("/health", { config: { skipAuth: true } }, async () => {
    return { status: "ok", service: "quiznox-api" };
  });

  app.register(authPlugin);
  app.register(routes);

  return app;
}

async function start() {
  const app = createServer();

  try {
    await app.listen({
      port: process.env.PORT || 4000,
      host: process.env.HOST || "0.0.0.0",
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { createServer, start };

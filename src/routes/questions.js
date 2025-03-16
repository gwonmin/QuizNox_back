const { getQuestions } = require("../services/dynamodbService");

async function questionsRoutes(fastify, options) {
  fastify.get("/questions", async (request, reply) => {
    try {
      const { tableName } = request.query;
      if (!tableName) {
        return reply
          .status(400)
          .send({ message: "Missing tableName parameter" });
      }

      const questions = await getQuestions(tableName);

      if (questions.length === 0) {
        return reply.status(404).send({ message: "No items found" });
      }

      return reply.status(200).send(questions);
    } catch (error) {
      console.error("DynamoDB Error:", error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });
}

module.exports = questionsRoutes;

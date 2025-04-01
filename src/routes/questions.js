const { getQuestionsByTopic } = require("../services/dynamodbService");

async function questionsRoutes(fastify, options) {
  fastify.get("/questions", async (request, reply) => {
    try {
      const tableName = "QuizNox_Questions";
      const topicId = request.query.topicId;
      if (!topicId) {
        return reply.status(400).send({ message: "Missing topicId parameter" });
      }

      const questions = await getQuestionsByTopic(tableName, topicId);

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

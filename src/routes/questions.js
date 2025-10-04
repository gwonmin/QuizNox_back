const { getAllQuestionsByTopic } = require("../services/dynamodbService");

// 환경 변수에서 테이블명 가져오기
const { DYNAMODB_TABLE_NAME = "QuizNox_Questions" } = process.env;

async function questionsRoutes(fastify, options) {
  fastify.get("/questions", async (request, reply) => {
    try {
      const topicId = request.query.topicId;
      if (!topicId) {
        return reply.status(400).send({ message: "Missing topicId parameter" });
      }

      const questions = await getAllQuestionsByTopic(DYNAMODB_TABLE_NAME, topicId);

      if (questions.length === 0) {
        return reply.status(404).send({ message: "No items found" });
      }

      return reply.status(200).send(questions);
    } catch (error) {
      console.error("DynamoDB Error:", error);
      
      // 에러 타입에 따른 구체적인 응답
      if (error.message.includes("topicId must be a non-empty string")) {
        return reply.status(400).send({ message: "Invalid topicId parameter" });
      }
      
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });
}

module.exports = questionsRoutes;

const {
  getProgressByUser,
  putProgress,
  deleteProgress,
} = require("../services/dynamodbService");

const DYNAMODB_PROGRESS_TABLE_NAME =
  process.env.DYNAMODB_PROGRESS_TABLE_NAME || "QuizNox_Progress";

async function progressRoutes(fastify, options) {
  fastify.get("/progress", async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      const items = await getProgressByUser(userId, {
        tableName: DYNAMODB_PROGRESS_TABLE_NAME,
      });
      return reply.status(200).send(items);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  fastify.put("/progress", async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      const body = request.body || {};
      const { topicId, questionNumber, topicName } = body;

      if (!topicId || typeof topicId !== "string") {
        return reply.status(400).send({ message: "topicId is required" });
      }
      if (questionNumber == null || typeof questionNumber !== "number") {
        return reply.status(400).send({ message: "questionNumber is required and must be a number" });
      }

      const progressItem = {
        user_id: userId,
        topic_id: topicId,
        question_number: questionNumber,
        topic_name: topicName || null,
        updated_at: new Date().toISOString(),
      };

      await putProgress(progressItem, {
        tableName: DYNAMODB_PROGRESS_TABLE_NAME,
      });
      return reply.status(200).send(progressItem);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  fastify.delete("/progress/:topic_id", async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      const { topic_id } = request.params;
      if (!topic_id) {
        return reply.status(400).send({ message: "topic_id is required" });
      }

      await deleteProgress(userId, topic_id, {
        tableName: DYNAMODB_PROGRESS_TABLE_NAME,
      });
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });
}

module.exports = progressRoutes;

const { putReview, listReviews, getReview, updateReview, deleteReview } = require("../services/dynamodbService");
const { randomUUID } = require("crypto");

const DYNAMODB_REVIEWS_TABLE_NAME =
  process.env.DYNAMODB_REVIEWS_TABLE_NAME || "QuizNox_Reviews";

async function reviewsRoutes(fastify, options) {
  fastify.get("/reviews", { config: { skipAuth: true } }, async (request, reply) => {
    try {
      const limit = Math.min(
        parseInt(request.query.limit, 10) || 50,
        100
      );
      const items = await listReviews({
        limit,
        tableName: DYNAMODB_REVIEWS_TABLE_NAME,
      });
      return reply.status(200).send(items);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  fastify.post("/reviews", async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      const body = request.body || {};
      const content =
        typeof body.content === "string" ? body.content.trim() : "";
      if (!content) {
        return reply.status(400).send({ message: "content is required" });
      }
      if (content.length > 500) {
        return reply.status(400).send({
          message: "content must be at most 500 characters",
        });
      }

      const created_at = new Date().toISOString();
      const review = {
        review_id: randomUUID(),
        user_id: userId,
        content,
        created_at,
      };

      await putReview(review, { tableName: DYNAMODB_REVIEWS_TABLE_NAME });
      return reply.status(201).send(review);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  fastify.put("/reviews/:review_id", async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      const { review_id } = request.params;
      if (!review_id) {
        return reply.status(400).send({ message: "review_id is required" });
      }

      const existing = await getReview(review_id, {
        tableName: DYNAMODB_REVIEWS_TABLE_NAME,
      });
      if (!existing) {
        return reply.status(404).send({ message: "Review not found" });
      }
      if (existing.user_id !== userId) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      const body = request.body || {};
      const content =
        typeof body.content === "string" ? body.content.trim() : "";
      if (!content) {
        return reply.status(400).send({ message: "content is required" });
      }
      if (content.length > 500) {
        return reply.status(400).send({
          message: "content must be at most 500 characters",
        });
      }

      const updated = await updateReview(review_id, content, {
        tableName: DYNAMODB_REVIEWS_TABLE_NAME,
      });
      return reply.status(200).send(updated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });

  fastify.delete("/reviews/:review_id", async (request, reply) => {
    try {
      const userId = request.user?.userId;
      if (!userId) {
        return reply.status(401).send({ message: "Unauthorized" });
      }

      const { review_id } = request.params;
      if (!review_id) {
        return reply.status(400).send({ message: "review_id is required" });
      }

      const existing = await getReview(review_id, {
        tableName: DYNAMODB_REVIEWS_TABLE_NAME,
      });
      if (!existing) {
        return reply.status(404).send({ message: "Review not found" });
      }
      if (existing.user_id !== userId) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      await deleteReview(review_id, {
        tableName: DYNAMODB_REVIEWS_TABLE_NAME,
      });
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ message: "Internal Server Error" });
    }
  });
}

module.exports = reviewsRoutes;

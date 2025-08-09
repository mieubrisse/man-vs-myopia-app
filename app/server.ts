import Fastify from "fastify";
import FastifyVite from "@fastify/vite";

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
    },
  },
});

// Register Postgres plugin
await fastify.register(import("@fastify/postgres"), {
  connectionString: process.env.DATABASE_URL,
});

// Register Vite plugin for SPA
await fastify.register(FastifyVite, {
  root: import.meta.dirname,
  // dev: process.argv.includes("--dev"),
  dev: true,
  spa: true,
});

// API Routes for vision test data
fastify.get("/api/vision-tests", async function (request, reply) {
  try {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        "SELECT data FROM vision_data WHERE user_id = $1",
        ["1"]
      );
      const visionTests = rows.length > 0 ? rows[0].data : [];
      return visionTests;
    } finally {
      client.release();
    }
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: "Internal Server Error" });
  }
});

fastify.post("/api/vision-tests", async function (request, reply) {
  try {
    const newTest = request.body;
    const client = await fastify.pg.connect();
    try {
      // Get current data
      const { rows } = await client.query(
        "SELECT data FROM vision_data WHERE user_id = $1",
        ["1"]
      );
      const currentTests = rows.length > 0 ? rows[0].data : [];

      // Add new test
      const updatedTests = [...currentTests, newTest];

      // Update database
      await client.query(
        "INSERT INTO vision_data (user_id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()",
        ["1", JSON.stringify(updatedTests)]
      );

      return { success: true };
    } finally {
      client.release();
    }
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: "Internal Server Error" });
  }
});

fastify.delete("/api/vision-tests", async function (request, reply) {
  try {
    const client = await fastify.pg.connect();
    try {
      await client.query(
        "UPDATE vision_data SET data = $1, updated_at = NOW() WHERE user_id = $2",
        ["[]", "1"]
      );
      return { success: true };
    } finally {
      client.release();
    }
  } catch (err) {
    fastify.log.error(err);
    reply.code(500).send({ error: "Internal Server Error" });
  }
});

// Serve SPA for all non-API routes
fastify.get("/*", (req, reply) => {
  return reply.html();
});

await fastify.vite.ready();

try {
  await fastify.listen({ port: 3000, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

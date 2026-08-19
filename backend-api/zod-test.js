const { z } = require('zod');

const schema = z.string().datetime();
try {
  schema.parse("2026-08-16T12:00:00.000Z");
  console.log("Success with ms");
} catch (e) {
  console.log("Failed with ms", e.issues);
}

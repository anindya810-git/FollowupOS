import "dotenv/config";
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7's config datasource only accepts `url` (and shadowDatabaseUrl).
    // DIRECT_URL, when needed for CLI migrations, belongs in the schema's
    // datasource block. Runtime connects via the pg adapter in src/lib/prisma.ts.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});

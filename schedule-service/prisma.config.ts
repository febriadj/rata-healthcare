import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // Not required by `prisma generate` (e.g. during the Docker build); migrate commands fail on an empty URL.
        url: process.env.DATABASE_URL ?? "",
    },
});

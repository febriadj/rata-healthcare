import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
        globals: true,
        root: "./",
        include: ["**/*.e2e-spec.ts"],
        env: {
            DATABASE_URL: "postgresql://unused",
            AUTH_SERVICE_URL: "http://auth.invalid/graphql",
            SMTP_HOST: "smtp.invalid",
            MAIL_FROM: "test@example.com",
        },
    },
});

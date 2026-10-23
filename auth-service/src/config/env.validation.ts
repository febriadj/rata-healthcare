const REQUIRED_VARIABLES = ["DATABASE_URL", "JWT_SECRET"] as const;

export function validateEnv(
    config: Record<string, unknown>,
): Record<string, unknown> {
    const missing = REQUIRED_VARIABLES.filter((name) => !config[name]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}`,
        );
    }

    return config;
}

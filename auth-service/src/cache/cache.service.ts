import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

/**
 * Redis-backed cache that fails open: when Redis is not configured or unreachable,
 * reads miss and writes are skipped, so the service keeps working (just slower).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private readonly redis?: Redis;

    constructor(config: ConfigService) {
        const url = config.get<string>("REDIS_URL");

        if (!url) {
            this.logger.warn("REDIS_URL is not set, caching is disabled");
            return;
        }

        this.redis = new Redis(url, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
        });
        this.redis.on("error", (error) =>
            this.logger.warn(`Redis error: ${error.message}`),
        );
    }

    async get<T>(key: string): Promise<T | undefined> {
        try {
            const value = await this.redis?.get(key);
            return value ? (JSON.parse(value) as T) : undefined;
        } catch (error) {
            this.logFailure("get", key, error);
            return undefined;
        }
    }

    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
        try {
            await this.redis?.set(key, JSON.stringify(value), "EX", ttlSeconds);
        } catch (error) {
            this.logFailure("set", key, error);
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.redis?.quit().catch(() => undefined);
    }

    private logFailure(operation: string, key: string, error: unknown): void {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Cache ${operation} failed for "${key}": ${reason}`);
    }
}

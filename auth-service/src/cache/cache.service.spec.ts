import type { ConfigService } from "@nestjs/config";
import { CacheService } from "./cache.service.js";

const configWith = (url?: string) =>
    ({ get: () => url }) as unknown as ConfigService;

describe("CacheService", () => {
    describe("without REDIS_URL", () => {
        const cache = new CacheService(configWith(undefined));

        it("misses on read and silently skips writes", async () => {
            await expect(cache.get("key")).resolves.toBeUndefined();
            await expect(
                cache.set("key", { a: 1 }, 10),
            ).resolves.toBeUndefined();
        });
    });

    describe("with an unreachable Redis", () => {
        // Port 1 is never a Redis; the connection is refused immediately.
        const cache = new CacheService(configWith("redis://127.0.0.1:1"));

        afterAll(() => cache.onModuleDestroy());

        it("fails open instead of throwing", async () => {
            await expect(cache.get("key")).resolves.toBeUndefined();
            await expect(
                cache.set("key", { a: 1 }, 10),
            ).resolves.toBeUndefined();
        });
    });
});

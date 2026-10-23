import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { CacheService } from "../src/cache/cache.service.js";
import { Prisma } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

interface StoredUser {
    id: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

/** Minimal in-memory stand-in for the Prisma `user` delegate, so the suite needs no database. */
function createFakePrisma() {
    const users: StoredUser[] = [];
    const stats = { lookupsById: 0 };

    return {
        user: {
            findUnique: async ({ where }: { where: Partial<StoredUser> }) => {
                if (where.id) stats.lookupsById++;
                return (
                    users.find((u) =>
                        where.id ? u.id === where.id : u.email === where.email,
                    ) ?? null
                );
            },
            create: async ({
                data,
            }: {
                data: { email: string; password: string };
            }) => {
                if (users.some((u) => u.email === data.email)) {
                    throw new Prisma.PrismaClientKnownRequestError(
                        "duplicate",
                        {
                            code: "P2002",
                            clientVersion: "test",
                        },
                    );
                }
                const now = new Date();
                const user = {
                    id: randomUUID(),
                    ...data,
                    createdAt: now,
                    updatedAt: now,
                };
                users.push(user);
                return user;
            },
        },
        stats,
        onModuleInit: async () => {},
        onModuleDestroy: async () => {},
    };
}

/** In-memory stand-in for the Redis cache, so the suite needs no Redis. */
function createFakeCache() {
    const entries = new Map<string, string>();

    return {
        get: async (key: string) => {
            const value = entries.get(key);
            return value ? JSON.parse(value) : undefined;
        },
        set: async (key: string, value: unknown) => {
            entries.set(key, JSON.stringify(value));
        },
        onModuleDestroy: async () => {},
    };
}

describe("Auth (e2e)", () => {
    let app: INestApplication;
    let prismaStats: { lookupsById: number };

    const gql = (query: string) =>
        request(app.getHttpServer()).post("/graphql").send({ query });

    const register = (email: string, password = "password123") =>
        gql(
            `mutation { register(input: { email: "${email}", password: "${password}" }) { id email } }`,
        );

    const login = (email: string, password = "password123") =>
        gql(
            `mutation { login(input: { email: "${email}", password: "${password}" }) { accessToken user { id } } }`,
        );

    beforeAll(async () => {
        process.env.JWT_SECRET = "e2e-secret";
        process.env.DATABASE_URL = "postgresql://unused";

        const fakePrisma = createFakePrisma();
        prismaStats = fakePrisma.stats;

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(PrismaService)
            .useValue(fakePrisma)
            .overrideProvider(CacheService)
            .useValue(createFakeCache())
            .compile();

        app = moduleRef.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
        );
        await app.init();
    });

    afterAll(() => app.close());

    it("registers, logs in and validates the token", async () => {
        const registered = await register("jane@example.com");
        expect(registered.body.data.register.email).toBe("jane@example.com");

        const loggedIn = await login("jane@example.com");
        const { accessToken, user } = loggedIn.body.data.login;
        expect(user.id).toBe(registered.body.data.register.id);

        const validated = await gql(
            `{ validateToken(token: "${accessToken}") { id email } }`,
        );
        expect(validated.body.data.validateToken).toEqual({
            id: user.id,
            email: "jane@example.com",
        });
    });

    it("rejects a duplicate email", async () => {
        await register("dup@example.com");
        const again = await register("DUP@example.com");

        expect(again.body.errors[0].message).toBe(
            "Email is already registered",
        );
    });

    it("rejects an invalid email and a short password", async () => {
        const result = await register("not-an-email", "short");

        expect(result.body.errors).toBeDefined();
    });

    it("rejects a wrong password", async () => {
        await register("wrong@example.com");
        const result = await login("wrong@example.com", "bad-password");

        expect(result.body.errors[0].message).toBe("Invalid email or password");
    });

    it("rejects a forged token", async () => {
        const result = await gql(
            `{ validateToken(token: "not.a.jwt") { id } }`,
        );

        expect(result.body.errors[0].message).toBe("Invalid or expired token");
    });

    it("never exposes the password field", async () => {
        const result = await gql(
            `{ __type(name: "User") { fields { name } } }`,
        );
        const fields = result.body.data.__type.fields.map(
            (f: { name: string }) => f.name,
        );

        expect(fields).not.toContain("password");
    });

    it("answers a repeated validation from the cache without touching the database", async () => {
        await register("cached@example.com");
        const { accessToken } = (await login("cached@example.com")).body.data
            .login;
        const validate = () =>
            gql(
                `{ validateToken(token: "${accessToken}") { id email createdAt } }`,
            );

        const first = await validate();
        const lookupsAfterFirst = prismaStats.lookupsById;
        const second = await validate();

        expect(second.body.data).toEqual(first.body.data);
        expect(prismaStats.lookupsById).toBe(lookupsAfterFirst);
    });
});

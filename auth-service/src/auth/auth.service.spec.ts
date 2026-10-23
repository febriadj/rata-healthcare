import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { CacheService } from "../cache/cache.service.js";
import type { User } from "../generated/prisma/client.js";
import type { UsersService } from "../users/users.service.js";
import { AuthService } from "./auth.service.js";

const PASSWORD = "secret-password";

describe("AuthService", () => {
    let usersService: { create: any; findByEmail: any; findById: any };
    let jwtService: { signAsync: any; verifyAsync: any };
    let cache: { get: any; set: any };
    let authService: AuthService;
    let user: User;

    beforeEach(async () => {
        user = {
            id: "6f1d3a52-4c4f-4a7e-9d0c-0b1b6a9a8c11",
            email: "jane@example.com",
            password: await bcrypt.hash(PASSWORD, 4),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        usersService = {
            create: vi.fn(),
            findByEmail: vi.fn(),
            findById: vi.fn(),
        };
        jwtService = {
            signAsync: vi.fn().mockResolvedValue("signed-token"),
            verifyAsync: vi.fn(),
        };
        cache = { get: vi.fn().mockResolvedValue(undefined), set: vi.fn() };
        authService = new AuthService(
            usersService as unknown as UsersService,
            jwtService as unknown as JwtService,
            cache as unknown as CacheService,
        );
    });

    describe("register", () => {
        it("stores a bcrypt hash and a normalized email", async () => {
            usersService.create.mockResolvedValue(user);

            await authService.register({
                email: "  Jane@Example.com ",
                password: PASSWORD,
            });

            const [data] = usersService.create.mock.calls[0];
            expect(data.email).toBe("jane@example.com");
            expect(data.password).not.toBe(PASSWORD);
            expect(await bcrypt.compare(PASSWORD, data.password)).toBe(true);
        });
    });

    describe("login", () => {
        it("returns a token and the user for valid credentials", async () => {
            usersService.findByEmail.mockResolvedValue(user);

            const result = await authService.login({
                email: user.email,
                password: PASSWORD,
            });

            expect(result).toEqual({ accessToken: "signed-token", user });
            expect(jwtService.signAsync).toHaveBeenCalledWith({
                sub: user.id,
                email: user.email,
            });
        });

        it("rejects a wrong password", async () => {
            usersService.findByEmail.mockResolvedValue(user);

            await expect(
                authService.login({ email: user.email, password: "wrong" }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("rejects an unknown email with the same error", async () => {
            usersService.findByEmail.mockResolvedValue(null);

            await expect(
                authService.login({
                    email: "nobody@example.com",
                    password: PASSWORD,
                }),
            ).rejects.toThrow("Invalid email or password");
        });
    });

    describe("validateToken", () => {
        it("returns the user owning a valid token", async () => {
            jwtService.verifyAsync.mockResolvedValue({
                sub: user.id,
                email: user.email,
            });
            usersService.findById.mockResolvedValue(user);

            const { password: _password, ...expected } = user;

            await expect(authService.validateToken("token")).resolves.toEqual(
                expected,
            );
        });

        it("caches the user without its password hash", async () => {
            jwtService.verifyAsync.mockResolvedValue({
                sub: user.id,
                email: user.email,
            });
            usersService.findById.mockResolvedValue(user);

            await authService.validateToken("raw.jwt.value");

            const [key, cachedUser] = cache.set.mock.calls[0];
            expect(key).toMatch(/^auth:token:[0-9a-f]{64}$/);
            expect(key).not.toContain("raw.jwt.value");
            expect(cachedUser).not.toHaveProperty("password");
        });

        it("never caches longer than the token itself lives", async () => {
            const inTenSeconds = Math.floor(Date.now() / 1000) + 10;
            jwtService.verifyAsync.mockResolvedValue({
                sub: user.id,
                email: user.email,
                exp: inTenSeconds,
            });
            usersService.findById.mockResolvedValue(user);

            await authService.validateToken("token");

            const ttl = cache.set.mock.calls[0][2];
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(10);
        });

        it("caps the cache lifetime for long-lived tokens", async () => {
            const inOneDay = Math.floor(Date.now() / 1000) + 86_400;
            jwtService.verifyAsync.mockResolvedValue({
                sub: user.id,
                email: user.email,
                exp: inOneDay,
            });
            usersService.findById.mockResolvedValue(user);

            await authService.validateToken("token");

            expect(cache.set.mock.calls[0][2]).toBe(60);
        });

        it("serves a cache hit without verifying the token or querying the database", async () => {
            const { password: _password, ...cached } = user;
            cache.get.mockResolvedValue(JSON.parse(JSON.stringify(cached)));

            const result = await authService.validateToken("token");

            expect(result).toEqual(cached);
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(jwtService.verifyAsync).not.toHaveBeenCalled();
            expect(usersService.findById).not.toHaveBeenCalled();
        });

        it("does not cache a rejected token", async () => {
            jwtService.verifyAsync.mockRejectedValue(new Error("jwt expired"));

            await expect(authService.validateToken("token")).rejects.toThrow(
                UnauthorizedException,
            );
            expect(cache.set).not.toHaveBeenCalled();
        });

        it("rejects a token that fails verification", async () => {
            jwtService.verifyAsync.mockRejectedValue(new Error("jwt expired"));

            await expect(authService.validateToken("token")).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it("rejects a valid token whose user no longer exists", async () => {
            jwtService.verifyAsync.mockResolvedValue({
                sub: user.id,
                email: user.email,
            });
            usersService.findById.mockResolvedValue(null);

            await expect(authService.validateToken("token")).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});

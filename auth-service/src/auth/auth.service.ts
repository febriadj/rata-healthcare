import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash } from "node:crypto";
import { CacheService } from "../cache/cache.service.js";
import type { User } from "../generated/prisma/client.js";
import { UsersService } from "../users/users.service.js";
import type { LoginInput } from "./dto/login.input.js";
import type { RegisterInput } from "./dto/register.input.js";
import type { JwtPayload } from "./interfaces/jwt-payload.interface.js";

const BCRYPT_SALT_ROUNDS = 10;

/** Upper bound for a cached validation, which is also how long a deleted user could still pass. */
const MAX_CACHE_TTL_SECONDS = 60;

/** The user fields that are safe to cache: never the password hash. */
type CachedUser = Omit<User, "password">;

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly cache: CacheService,
    ) {}

    async register({ email, password }: RegisterInput): Promise<User> {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        return this.usersService.create({
            email: this.normalizeEmail(email),
            password: hashedPassword,
        });
    }

    async login({
        email,
        password,
    }: LoginInput): Promise<{ accessToken: string; user: User }> {
        const user = await this.usersService.findByEmail(
            this.normalizeEmail(email),
        );

        // The same error for an unknown email and a wrong password avoids leaking which emails exist.
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return { accessToken: await this.signToken(user), user };
    }

    async validateToken(token: string): Promise<CachedUser> {
        const cacheKey = this.cacheKeyFor(token);
        const cached = await this.cache.get<CachedUser>(cacheKey);

        if (cached) {
            return this.reviveDates(cached);
        }

        const payload = await this.verifyToken(token);
        const user = await this.usersService.findById(payload.sub);

        if (!user) {
            throw new UnauthorizedException("Invalid or expired token");
        }

        const { password: _password, ...safeUser } = user;
        await this.cache.set(cacheKey, safeUser, this.cacheTtlFor(payload));

        return safeUser;
    }

    private signToken(user: User): Promise<string> {
        const payload: JwtPayload = { sub: user.id, email: user.email };
        return this.jwtService.signAsync(payload);
    }

    private async verifyToken(token: string): Promise<JwtPayload> {
        try {
            return await this.jwtService.verifyAsync<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }

    /** Hashed so raw tokens never end up as Redis keys. */
    private cacheKeyFor(token: string): string {
        return `auth:token:${createHash("sha256").update(token).digest("hex")}`;
    }

    /** A cached entry must never outlive the token it validated. */
    private cacheTtlFor({ exp }: JwtPayload): number {
        const secondsLeft = exp
            ? exp - Math.floor(Date.now() / 1000)
            : MAX_CACHE_TTL_SECONDS;
        return Math.max(1, Math.min(secondsLeft, MAX_CACHE_TTL_SECONDS));
    }

    private reviveDates(user: CachedUser): CachedUser {
        return {
            ...user,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
        };
    }

    private normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }
}

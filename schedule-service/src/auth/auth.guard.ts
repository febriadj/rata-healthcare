import {
    type CanActivate,
    type ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";
import { AuthClient } from "./auth.client.js";

const BEARER_PREFIX = "Bearer ";

/** Rejects every GraphQL operation that does not carry a token the Auth Service accepts. */
@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly authClient: AuthClient) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { req } = GqlExecutionContext.create(context).getContext<{
            req: Request;
        }>();
        const token = this.extractBearerToken(req.headers.authorization);

        if (!token) {
            throw new UnauthorizedException("Missing bearer token");
        }

        await this.authClient.validateToken(token);
        return true;
    }

    private extractBearerToken(header: string | undefined): string | undefined {
        return header?.startsWith(BEARER_PREFIX)
            ? header.slice(BEARER_PREFIX.length).trim()
            : undefined;
    }
}

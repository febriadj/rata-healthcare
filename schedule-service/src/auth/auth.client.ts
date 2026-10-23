import {
    Injectable,
    ServiceUnavailableException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthenticatedUser } from "./authenticated-user.interface.js";

const REQUEST_TIMEOUT_MS = 5000;

const VALIDATE_TOKEN_QUERY = `
    query ValidateToken($token: String!) {
        validateToken(token: $token) { id email }
    }
`;

interface ValidateTokenResponse {
    data?: { validateToken: AuthenticatedUser } | null;
    errors?: { message: string }[];
}

/** Talks to the Auth Service; the only place that knows how tokens are validated. */
@Injectable()
export class AuthClient {
    private readonly authServiceUrl: string;

    constructor(config: ConfigService) {
        this.authServiceUrl = config.getOrThrow<string>("AUTH_SERVICE_URL");
    }

    async validateToken(token: string): Promise<AuthenticatedUser> {
        const body = await this.request(token);

        if (!body.data?.validateToken) {
            throw new UnauthorizedException("Invalid or expired token");
        }

        return body.data.validateToken;
    }

    private async request(token: string): Promise<ValidateTokenResponse> {
        try {
            const response = await fetch(this.authServiceUrl, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    query: VALIDATE_TOKEN_QUERY,
                    variables: { token },
                }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            return (await response.json()) as ValidateTokenResponse;
        } catch {
            throw new ServiceUnavailableException(
                "Auth service is unavailable",
            );
        }
    }
}

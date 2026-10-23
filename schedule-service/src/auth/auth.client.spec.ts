import {
    ServiceUnavailableException,
    UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { AuthClient } from "./auth.client.js";

describe("AuthClient", () => {
    const url = "http://auth/graphql";
    const client = new AuthClient({
        getOrThrow: () => url,
    } as unknown as ConfigService);

    const respondWith = (body: unknown) =>
        vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue({ json: async () => body } as Response);

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns the user and sends the token as a variable", async () => {
        const fetchSpy = respondWith({
            data: { validateToken: { id: "1", email: "a@b.co" } },
        });

        await expect(client.validateToken("tok")).resolves.toEqual({
            id: "1",
            email: "a@b.co",
        });

        const [calledUrl, init] = fetchSpy.mock.calls[0];
        expect(calledUrl).toBe(url);
        expect(JSON.parse(init!.body as string).variables).toEqual({
            token: "tok",
        });
    });

    it("treats a GraphQL error response as unauthorized", async () => {
        respondWith({
            data: null,
            errors: [{ message: "Invalid or expired token" }],
        });

        await expect(client.validateToken("tok")).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it("reports an unreachable auth service as unavailable, not unauthorized", async () => {
        vi.spyOn(globalThis, "fetch").mockRejectedValue(
            new Error("ECONNREFUSED"),
        );

        await expect(client.validateToken("tok")).rejects.toThrow(
            ServiceUnavailableException,
        );
    });
});

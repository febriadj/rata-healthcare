import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { AuthClient } from "./auth.client.js";
import { AuthGuard } from "./auth.guard.js";

describe("AuthGuard", () => {
    const validateToken = vi.fn();
    const guard = new AuthGuard({ validateToken } as unknown as AuthClient);

    const contextWith = (authorization?: string) => {
        vi.spyOn(GqlExecutionContext, "create").mockReturnValue({
            getContext: () => ({ req: { headers: { authorization } } }),
        } as unknown as GqlExecutionContext);
        return {} as ExecutionContext;
    };

    beforeEach(() => {
        validateToken.mockReset();
    });

    it("lets a request through when the auth service accepts the token", async () => {
        validateToken.mockResolvedValue({ id: "1", email: "a@b.co" });

        await expect(
            guard.canActivate(contextWith("Bearer abc")),
        ).resolves.toBe(true);
        expect(validateToken).toHaveBeenCalledWith("abc");
    });

    it.each([undefined, "abc", "Basic abc"])(
        "rejects a missing or non-bearer header (%s)",
        async (header) => {
            await expect(
                guard.canActivate(contextWith(header)),
            ).rejects.toThrow(UnauthorizedException);
            expect(validateToken).not.toHaveBeenCalled();
        },
    );

    it("propagates a rejection from the auth service", async () => {
        validateToken.mockRejectedValue(new UnauthorizedException());

        await expect(
            guard.canActivate(contextWith("Bearer abc")),
        ).rejects.toThrow(UnauthorizedException);
    });
});

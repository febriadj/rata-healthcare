import { ConflictException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { UsersService } from "./users.service.js";

describe("UsersService", () => {
    const create = vi.fn();
    const usersService = new UsersService({
        user: { create },
    } as unknown as PrismaService);

    it("maps a unique constraint violation to a conflict", async () => {
        create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("duplicate", {
                code: "P2002",
                clientVersion: "test",
            }),
        );

        await expect(
            usersService.create({ email: "a@b.co", password: "hash" }),
        ).rejects.toThrow(ConflictException);
    });

    it("rethrows unexpected errors untouched", async () => {
        const failure = new Error("connection lost");
        create.mockRejectedValue(failure);

        await expect(
            usersService.create({ email: "a@b.co", password: "hash" }),
        ).rejects.toBe(failure);
    });
});

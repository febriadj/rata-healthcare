import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, type User } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }

    findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async create(data: { email: string; password: string }): Promise<User> {
        try {
            return await this.prisma.user.create({ data });
        } catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new ConflictException("Email is already registered");
            }
            throw error;
        }
    }

    private isUniqueViolation(error: unknown): boolean {
        return (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === UNIQUE_CONSTRAINT_VIOLATION
        );
    }
}

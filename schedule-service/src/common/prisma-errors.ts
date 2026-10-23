import { Prisma } from "../generated/prisma/client.js";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";
const FOREIGN_KEY_VIOLATION = "P2003";
const RECORD_NOT_FOUND = "P2025";

function hasCode(error: unknown, code: string): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === code
    );
}

export const isUniqueViolation = (error: unknown): boolean =>
    hasCode(error, UNIQUE_CONSTRAINT_VIOLATION);
export const isForeignKeyViolation = (error: unknown): boolean =>
    hasCode(error, FOREIGN_KEY_VIOLATION);
export const isRecordNotFound = (error: unknown): boolean =>
    hasCode(error, RECORD_NOT_FOUND);

import { randomUUID } from "node:crypto";
import { Prisma } from "../src/generated/prisma/client.js";

type Row = Record<string, any> & { id: string };

function prismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError(code, {
        code,
        clientVersion: "test",
    });
}

/** In-memory stand-in for PrismaService that mimics the constraints the services rely on. */
export function createFakePrisma() {
    const tables = {
        customer: [] as Row[],
        doctor: [] as Row[],
        schedule: [] as Row[],
    };

    const matches = (row: Row, where: Record<string, any> = {}) =>
        Object.entries(where).every(([key, condition]) => {
            if (condition === undefined) return true;
            if (condition instanceof Date || typeof condition !== "object") {
                return String(row[key]) === String(condition);
            }
            const value = row[key] as Date;
            return (
                (condition.gte === undefined || value >= condition.gte) &&
                (condition.lte === undefined || value <= condition.lte)
            );
        });

    const withParticipants = (row: Row, include?: Record<string, boolean>) =>
        include
            ? {
                  ...row,
                  customer: tables.customer.find(
                      (c) => c.id === row.customerId,
                  ),
                  doctor: tables.doctor.find((d) => d.id === row.doctorId),
              }
            : row;

    const violatesUnique = (
        name: keyof typeof tables,
        data: Row,
        ignoreId?: string,
    ) =>
        tables[name].some((row) => {
            if (row.id === ignoreId) return false;
            if (name === "customer") return row.email === data.email;
            if (name === "schedule") {
                return (
                    row.doctorId === data.doctorId &&
                    row.scheduledAt.getTime() === data.scheduledAt.getTime()
                );
            }
            return false;
        });

    const delegate = (name: keyof typeof tables) => ({
        findUnique: async ({ where, include }: any) => {
            const row = tables[name].find((r) => matches(r, where));
            return row ? withParticipants(row, include) : null;
        },
        findMany: async ({
            where,
            skip = 0,
            take,
            orderBy,
            include,
        }: any = {}) => {
            const [field, direction] = Object.entries(
                orderBy ?? { createdAt: "asc" },
            )[0] as [string, string];
            return tables[name]
                .filter((r) => matches(r, where))
                .sort(
                    (a, b) =>
                        (a[field] > b[field] ? 1 : -1) *
                        (direction === "desc" ? -1 : 1),
                )
                .slice(skip, take === undefined ? undefined : skip + take)
                .map((r) => withParticipants(r, include));
        },
        count: async ({ where }: any = {}) =>
            tables[name].filter((r) => matches(r, where)).length,
        create: async ({ data, include }: any) => {
            if (violatesUnique(name, data)) throw prismaError("P2002");
            if (name === "schedule") {
                const parentsExist =
                    tables.customer.some((c) => c.id === data.customerId) &&
                    tables.doctor.some((d) => d.id === data.doctorId);
                if (!parentsExist) throw prismaError("P2003");
            }
            const now = new Date(Date.now() + tables[name].length); // keeps createdAt strictly ordered
            const row = {
                id: randomUUID(),
                ...data,
                createdAt: now,
                updatedAt: now,
            };
            tables[name].push(row);
            return withParticipants(row, include);
        },
        update: async ({ where, data }: any) => {
            const row = tables[name].find((r) => r.id === where.id);
            if (!row) throw prismaError("P2025");
            if (violatesUnique(name, { ...row, ...data }, row.id))
                throw prismaError("P2002");
            Object.assign(row, data, { updatedAt: new Date() });
            return row;
        },
        delete: async ({ where, include }: any) => {
            const row = tables[name].find((r) => r.id === where.id);
            if (!row) throw prismaError("P2025");
            const key = name === "customer" ? "customerId" : "doctorId";
            if (
                name !== "schedule" &&
                tables.schedule.some((s) => s[key] === row.id)
            ) {
                throw prismaError("P2003");
            }
            tables[name].splice(tables[name].indexOf(row), 1);
            return withParticipants(row, include);
        },
    });

    return {
        customer: delegate("customer"),
        doctor: delegate("doctor"),
        schedule: delegate("schedule"),
        $transaction: (operations: Promise<unknown>[]) =>
            Promise.all(operations),
        onModuleInit: async () => {},
        onModuleDestroy: async () => {},
    };
}

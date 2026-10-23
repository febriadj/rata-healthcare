import {
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import type { PaginationArgs } from "../common/dto/pagination.args.js";
import { toPage, toSkipTake } from "../common/pagination.js";
import {
    isForeignKeyViolation,
    isRecordNotFound,
    isUniqueViolation,
} from "../common/prisma-errors.js";
import type { Customer } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateCustomerInput } from "./dto/create-customer.input.js";
import type { UpdateCustomerInput } from "./dto/update-customer.input.js";

@Injectable()
export class CustomersService {
    constructor(private readonly prisma: PrismaService) {}

    async create(input: CreateCustomerInput): Promise<Customer> {
        try {
            return await this.prisma.customer.create({
                data: this.normalize(input),
            });
        } catch (error) {
            throw this.translateError(error);
        }
    }

    async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
        try {
            return await this.prisma.customer.update({
                where: { id },
                data: this.normalize(input),
            });
        } catch (error) {
            throw this.translateError(error);
        }
    }

    async findAll(pagination: PaginationArgs) {
        const [items, total] = await this.prisma.$transaction([
            this.prisma.customer.findMany({
                ...toSkipTake(pagination),
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.customer.count(),
        ]);

        return toPage(items, total, pagination);
    }

    async findOne(id: string): Promise<Customer> {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
        });

        if (!customer) {
            throw new NotFoundException("Customer not found");
        }

        return customer;
    }

    async remove(id: string): Promise<Customer> {
        try {
            return await this.prisma.customer.delete({ where: { id } });
        } catch (error) {
            throw this.translateError(error);
        }
    }

    private normalize<T extends { email?: string }>(input: T): T {
        return input.email === undefined
            ? input
            : { ...input, email: input.email.trim().toLowerCase() };
    }

    private translateError(error: unknown): unknown {
        if (isUniqueViolation(error)) {
            return new ConflictException(
                "Email is already used by another customer",
            );
        }
        if (isRecordNotFound(error)) {
            return new NotFoundException("Customer not found");
        }
        if (isForeignKeyViolation(error)) {
            return new ConflictException(
                "Customer still has schedules and cannot be deleted",
            );
        }
        return error;
    }
}

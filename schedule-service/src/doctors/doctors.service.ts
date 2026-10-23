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
} from "../common/prisma-errors.js";
import type { Doctor } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateDoctorInput } from "./dto/create-doctor.input.js";
import type { UpdateDoctorInput } from "./dto/update-doctor.input.js";

@Injectable()
export class DoctorsService {
    constructor(private readonly prisma: PrismaService) {}

    create(input: CreateDoctorInput): Promise<Doctor> {
        return this.prisma.doctor.create({ data: input });
    }

    async update(id: string, input: UpdateDoctorInput): Promise<Doctor> {
        try {
            return await this.prisma.doctor.update({
                where: { id },
                data: input,
            });
        } catch (error) {
            throw this.translateError(error);
        }
    }

    async findAll(pagination: PaginationArgs) {
        const [items, total] = await this.prisma.$transaction([
            this.prisma.doctor.findMany({
                ...toSkipTake(pagination),
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.doctor.count(),
        ]);

        return toPage(items, total, pagination);
    }

    async findOne(id: string): Promise<Doctor> {
        const doctor = await this.prisma.doctor.findUnique({ where: { id } });

        if (!doctor) {
            throw new NotFoundException("Doctor not found");
        }

        return doctor;
    }

    async remove(id: string): Promise<Doctor> {
        try {
            return await this.prisma.doctor.delete({ where: { id } });
        } catch (error) {
            throw this.translateError(error);
        }
    }

    private translateError(error: unknown): unknown {
        if (isRecordNotFound(error)) {
            return new NotFoundException("Doctor not found");
        }
        if (isForeignKeyViolation(error)) {
            return new ConflictException(
                "Doctor still has schedules and cannot be deleted",
            );
        }
        return error;
    }
}

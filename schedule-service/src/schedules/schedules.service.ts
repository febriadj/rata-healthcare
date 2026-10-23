import {
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { toPage, toSkipTake } from "../common/pagination.js";
import {
    isRecordNotFound,
    isUniqueViolation,
} from "../common/prisma-errors.js";
import { CustomersService } from "../customers/customers.service.js";
import { DoctorsService } from "../doctors/doctors.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import { ScheduleNotificationsService } from "../notifications/schedule-notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateScheduleInput } from "./dto/create-schedule.input.js";
import type { SchedulesArgs } from "./dto/schedules.args.js";

const WITH_PARTICIPANTS = { customer: true, doctor: true } as const;

@Injectable()
export class SchedulesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly customersService: CustomersService,
        private readonly doctorsService: DoctorsService,
        private readonly notifications: ScheduleNotificationsService,
    ) {}

    async create(input: CreateScheduleInput) {
        await this.customersService.findOne(input.customerId);
        await this.doctorsService.findOne(input.doctorId);

        try {
            const schedule = await this.prisma.schedule.create({
                data: input,
                include: WITH_PARTICIPANTS,
            });
            // Fire and forget: the notifier handles its own errors and must not delay the response.
            void this.notifications.notifyCreated(schedule);
            return schedule;
        } catch (error) {
            // The unique (doctorId, scheduledAt) index is what guarantees no double booking, even under concurrency.
            if (isUniqueViolation(error)) {
                throw new ConflictException(
                    "The doctor already has a schedule at that time",
                );
            }
            throw error;
        }
    }

    async findAll(args: SchedulesArgs) {
        const where = this.buildFilter(args);
        const [items, total] = await this.prisma.$transaction([
            this.prisma.schedule.findMany({
                where,
                ...toSkipTake(args),
                orderBy: { scheduledAt: "asc" },
                include: WITH_PARTICIPANTS,
            }),
            this.prisma.schedule.count({ where }),
        ]);

        return toPage(items, total, args);
    }

    async findOne(id: string) {
        const schedule = await this.prisma.schedule.findUnique({
            where: { id },
            include: WITH_PARTICIPANTS,
        });

        if (!schedule) {
            throw new NotFoundException("Schedule not found");
        }

        return schedule;
    }

    async remove(id: string) {
        try {
            const schedule = await this.prisma.schedule.delete({
                where: { id },
                include: WITH_PARTICIPANTS,
            });
            void this.notifications.notifyDeleted(schedule);
            return schedule;
        } catch (error) {
            throw isRecordNotFound(error)
                ? new NotFoundException("Schedule not found")
                : error;
        }
    }

    private buildFilter({
        doctorId,
        customerId,
        from,
        to,
    }: SchedulesArgs): Prisma.ScheduleWhereInput {
        return {
            doctorId,
            customerId,
            scheduledAt: { gte: from, lte: to },
        };
    }
}

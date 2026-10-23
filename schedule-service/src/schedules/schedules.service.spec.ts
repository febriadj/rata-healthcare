import { ConflictException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import type { CustomersService } from "../customers/customers.service.js";
import type { DoctorsService } from "../doctors/doctors.service.js";
import type { ScheduleNotificationsService } from "../notifications/schedule-notifications.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { SchedulesService } from "./schedules.service.js";

const input = {
    objective: "Checkup",
    customerId: "c1",
    doctorId: "d1",
    scheduledAt: new Date("2030-01-01T09:00:00Z"),
};

describe("SchedulesService", () => {
    const create = vi.fn();
    const findCustomer = vi.fn().mockResolvedValue({});
    const findDoctor = vi.fn().mockResolvedValue({});
    const notifyCreated = vi.fn();
    const service = new SchedulesService(
        { schedule: { create } } as unknown as PrismaService,
        { findOne: findCustomer } as unknown as CustomersService,
        { findOne: findDoctor } as unknown as DoctorsService,
        { notifyCreated } as unknown as ScheduleNotificationsService,
    );

    beforeEach(() => {
        notifyCreated.mockClear();
    });

    it("checks that the customer and doctor exist before inserting", async () => {
        create.mockResolvedValue({ id: "s1" });

        await service.create(input);

        expect(findCustomer).toHaveBeenCalledWith("c1");
        expect(findDoctor).toHaveBeenCalledWith("d1");
        expect(notifyCreated).toHaveBeenCalledWith({ id: "s1" });
    });

    it("turns a unique violation into a double-booking conflict", async () => {
        create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("dup", {
                code: "P2002",
                clientVersion: "test",
            }),
        );

        await expect(service.create(input)).rejects.toThrow(ConflictException);
        expect(notifyCreated).not.toHaveBeenCalled();
    });
});

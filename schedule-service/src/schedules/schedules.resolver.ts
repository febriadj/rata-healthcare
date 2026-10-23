import { ParseUUIDPipe } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CreateScheduleInput } from "./dto/create-schedule.input.js";
import { SchedulesArgs } from "./dto/schedules.args.js";
import { PaginatedSchedules, ScheduleModel } from "./schedule.model.js";
import { SchedulesService } from "./schedules.service.js";

const IdArg = () => Args("id", { type: () => ID }, ParseUUIDPipe);

@Resolver(() => ScheduleModel)
export class SchedulesResolver {
    constructor(private readonly schedulesService: SchedulesService) {}

    @Mutation(() => ScheduleModel, {
        description:
            "Creates a schedule. Fails if the customer or doctor does not exist, or the doctor is already booked at that time.",
    })
    createSchedule(@Args("input") input: CreateScheduleInput) {
        return this.schedulesService.create(input);
    }

    @Mutation(() => ScheduleModel, {
        description: "Deletes a schedule and returns it.",
    })
    deleteSchedule(@IdArg() id: string) {
        return this.schedulesService.remove(id);
    }

    @Query(() => PaginatedSchedules, {
        name: "schedules",
        description:
            "Lists schedules by time, optionally filtered by doctor, customer and time range.",
    })
    findAll(@Args() args: SchedulesArgs) {
        return this.schedulesService.findAll(args);
    }

    @Query(() => ScheduleModel, {
        name: "schedule",
        description: "Gets a schedule by id.",
    })
    findOne(@IdArg() id: string) {
        return this.schedulesService.findOne(id);
    }
}

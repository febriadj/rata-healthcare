import { ParseUUIDPipe } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { PaginationArgs } from "../common/dto/pagination.args.js";
import { DoctorModel, PaginatedDoctors } from "./doctor.model.js";
import { DoctorsService } from "./doctors.service.js";
import { CreateDoctorInput } from "./dto/create-doctor.input.js";
import { UpdateDoctorInput } from "./dto/update-doctor.input.js";

const IdArg = () => Args("id", { type: () => ID }, ParseUUIDPipe);

@Resolver(() => DoctorModel)
export class DoctorsResolver {
    constructor(private readonly doctorsService: DoctorsService) {}

    @Mutation(() => DoctorModel, { description: "Creates a doctor." })
    createDoctor(@Args("input") input: CreateDoctorInput) {
        return this.doctorsService.create(input);
    }

    @Mutation(() => DoctorModel, {
        description: "Updates the given fields of a doctor.",
    })
    updateDoctor(@IdArg() id: string, @Args("input") input: UpdateDoctorInput) {
        return this.doctorsService.update(id, input);
    }

    @Mutation(() => DoctorModel, {
        description:
            "Deletes a doctor and returns it. Fails while the doctor still has schedules.",
    })
    deleteDoctor(@IdArg() id: string) {
        return this.doctorsService.remove(id);
    }

    @Query(() => PaginatedDoctors, {
        name: "doctors",
        description: "Lists doctors, newest first.",
    })
    findAll(@Args() pagination: PaginationArgs) {
        return this.doctorsService.findAll(pagination);
    }

    @Query(() => DoctorModel, {
        name: "doctor",
        description: "Gets a doctor by id.",
    })
    findOne(@IdArg() id: string) {
        return this.doctorsService.findOne(id);
    }
}

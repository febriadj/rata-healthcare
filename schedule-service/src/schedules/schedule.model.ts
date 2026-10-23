import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Paginated } from "../common/pagination.js";
import { CustomerModel } from "../customers/customer.model.js";
import { DoctorModel } from "../doctors/doctor.model.js";

@ObjectType("Schedule")
export class ScheduleModel {
    @Field(() => ID)
    id: string;

    @Field({ description: "Purpose of the consultation." })
    objective: string;

    @Field(() => ID)
    customerId: string;

    @Field(() => ID)
    doctorId: string;

    @Field()
    scheduledAt: Date;

    @Field(() => CustomerModel)
    customer: CustomerModel;

    @Field(() => DoctorModel)
    doctor: DoctorModel;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}

@ObjectType()
export class PaginatedSchedules extends Paginated(ScheduleModel) {}

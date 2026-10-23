import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Paginated } from "../common/pagination.js";

@ObjectType("Doctor")
export class DoctorModel {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}

@ObjectType()
export class PaginatedDoctors extends Paginated(DoctorModel) {}

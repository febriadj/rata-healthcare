import { ArgsType, Field, ID } from "@nestjs/graphql";
import { IsDate, IsOptional, IsUUID } from "class-validator";
import { PaginationArgs } from "../../common/dto/pagination.args.js";

@ArgsType()
export class SchedulesArgs extends PaginationArgs {
    @Field(() => ID, {
        nullable: true,
        description: "Only schedules of this doctor.",
    })
    @IsOptional()
    @IsUUID()
    doctorId?: string;

    @Field(() => ID, {
        nullable: true,
        description: "Only schedules of this customer.",
    })
    @IsOptional()
    @IsUUID()
    customerId?: string;

    @Field({
        nullable: true,
        description: "Only schedules at or after this time.",
    })
    @IsOptional()
    @IsDate()
    from?: Date;

    @Field({
        nullable: true,
        description: "Only schedules at or before this time.",
    })
    @IsOptional()
    @IsDate()
    to?: Date;
}

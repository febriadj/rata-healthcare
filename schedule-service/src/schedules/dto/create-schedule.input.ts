import { Field, ID, InputType } from "@nestjs/graphql";
import { IsDate, IsNotEmpty, IsUUID } from "class-validator";

@InputType()
export class CreateScheduleInput {
    @Field({ description: "Purpose of the consultation." })
    @IsNotEmpty()
    objective: string;

    @Field(() => ID)
    @IsUUID()
    customerId: string;

    @Field(() => ID)
    @IsUUID()
    doctorId: string;

    @Field({ description: "When the consultation takes place (ISO 8601)." })
    @IsDate()
    scheduledAt: Date;
}

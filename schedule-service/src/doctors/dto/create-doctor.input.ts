import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator";

@InputType()
export class CreateDoctorInput {
    @Field()
    @IsNotEmpty()
    name: string;
}

import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty } from "class-validator";

@InputType()
export class CreateCustomerInput {
    @Field()
    @IsNotEmpty()
    name: string;

    @Field({ description: "Unique email address." })
    @IsEmail()
    email: string;
}

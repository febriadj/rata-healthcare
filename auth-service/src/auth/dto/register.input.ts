import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, MaxLength, MinLength } from "class-validator";

// bcrypt only considers the first 72 bytes of its input.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

@InputType()
export class RegisterInput {
    @Field({ description: "Unique email address of the user." })
    @IsEmail()
    email: string;

    @Field({
        description: `Plain password, ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`,
    })
    @MinLength(PASSWORD_MIN_LENGTH)
    @MaxLength(PASSWORD_MAX_LENGTH)
    password: string;
}

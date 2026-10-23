import { Field, ObjectType } from "@nestjs/graphql";
import { UserModel } from "../../users/user.model.js";

@ObjectType({ description: "Result of a successful login." })
export class AuthPayload {
    @Field({ description: "JWT to send as `Authorization: Bearer <token>`." })
    accessToken: string;

    @Field(() => UserModel)
    user: UserModel;
}

import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType("User", {
    description: "A registered user. The password is never exposed.",
})
export class UserModel {
    @Field(() => ID)
    id: string;

    @Field()
    email: string;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}

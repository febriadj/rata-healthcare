import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Paginated } from "../common/pagination.js";

@ObjectType("Customer")
export class CustomerModel {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field()
    email: string;

    @Field()
    createdAt: Date;

    @Field()
    updatedAt: Date;
}

@ObjectType()
export class PaginatedCustomers extends Paginated(CustomerModel) {}

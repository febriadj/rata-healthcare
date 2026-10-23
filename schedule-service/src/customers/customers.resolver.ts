import { ParseUUIDPipe } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { PaginationArgs } from "../common/dto/pagination.args.js";
import { CustomerModel, PaginatedCustomers } from "./customer.model.js";
import { CustomersService } from "./customers.service.js";
import { CreateCustomerInput } from "./dto/create-customer.input.js";
import { UpdateCustomerInput } from "./dto/update-customer.input.js";

const IdArg = () => Args("id", { type: () => ID }, ParseUUIDPipe);

@Resolver(() => CustomerModel)
export class CustomersResolver {
    constructor(private readonly customersService: CustomersService) {}

    @Mutation(() => CustomerModel, { description: "Creates a customer." })
    createCustomer(@Args("input") input: CreateCustomerInput) {
        return this.customersService.create(input);
    }

    @Mutation(() => CustomerModel, {
        description: "Updates the given fields of a customer.",
    })
    updateCustomer(
        @IdArg() id: string,
        @Args("input") input: UpdateCustomerInput,
    ) {
        return this.customersService.update(id, input);
    }

    @Mutation(() => CustomerModel, {
        description:
            "Deletes a customer and returns it. Fails while the customer still has schedules.",
    })
    deleteCustomer(@IdArg() id: string) {
        return this.customersService.remove(id);
    }

    @Query(() => PaginatedCustomers, {
        name: "customers",
        description: "Lists customers, newest first.",
    })
    findAll(@Args() pagination: PaginationArgs) {
        return this.customersService.findAll(pagination);
    }

    @Query(() => CustomerModel, {
        name: "customer",
        description: "Gets a customer by id.",
    })
    findOne(@IdArg() id: string) {
        return this.customersService.findOne(id);
    }
}

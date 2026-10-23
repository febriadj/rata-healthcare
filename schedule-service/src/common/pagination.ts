import { Field, Int, ObjectType } from "@nestjs/graphql";
import type { Type } from "@nestjs/common";
import type { PaginationArgs } from "./dto/pagination.args.js";

/** Builds the GraphQL page type for the given item class. */
export function Paginated<T>(itemClass: Type<T>) {
    @ObjectType({ isAbstract: true })
    abstract class PaginatedType {
        @Field(() => [itemClass])
        items: T[];

        @Field(() => Int, {
            description: "Total number of items across all pages.",
        })
        total: number;

        @Field(() => Int)
        page: number;

        @Field(() => Int)
        limit: number;

        @Field(() => Int)
        totalPages: number;
    }

    return PaginatedType;
}

export function toSkipTake({ page, limit }: PaginationArgs): {
    skip: number;
    take: number;
} {
    return { skip: (page - 1) * limit, take: limit };
}

export function toPage<T>(
    items: T[],
    total: number,
    { page, limit }: PaginationArgs,
) {
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

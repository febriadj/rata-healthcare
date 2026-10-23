import { ArgsType, Field, Int } from "@nestjs/graphql";
import { IsInt, Max, Min } from "class-validator";

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

@ArgsType()
export class PaginationArgs {
    @Field(() => Int, { defaultValue: 1, description: "1-based page number." })
    @IsInt()
    @Min(1)
    page: number = 1;

    @Field(() => Int, {
        defaultValue: DEFAULT_PAGE_SIZE,
        description: `Items per page, at most ${MAX_PAGE_SIZE}.`,
    })
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    limit: number = DEFAULT_PAGE_SIZE;
}

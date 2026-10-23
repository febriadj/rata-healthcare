import { toPage, toSkipTake } from "./pagination.js";

describe("pagination", () => {
    it("converts a 1-based page into skip and take", () => {
        expect(toSkipTake({ page: 3, limit: 10 })).toEqual({
            skip: 20,
            take: 10,
        });
    });

    it("rounds the page count up", () => {
        expect(toPage(["a"], 21, { page: 1, limit: 10 })).toEqual({
            items: ["a"],
            total: 21,
            page: 1,
            limit: 10,
            totalPages: 3,
        });
    });

    it("reports zero pages when there is nothing", () => {
        expect(toPage([], 0, { page: 1, limit: 10 }).totalPages).toBe(0);
    });
});

import { Module } from "@nestjs/common";
import { CustomersResolver } from "./customers.resolver.js";
import { CustomersService } from "./customers.service.js";

@Module({
    providers: [CustomersService, CustomersResolver],
    exports: [CustomersService],
})
export class CustomersModule {}

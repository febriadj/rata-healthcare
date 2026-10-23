import { Module } from "@nestjs/common";
import { DoctorsResolver } from "./doctors.resolver.js";
import { DoctorsService } from "./doctors.service.js";

@Module({
    providers: [DoctorsService, DoctorsResolver],
    exports: [DoctorsService],
})
export class DoctorsModule {}

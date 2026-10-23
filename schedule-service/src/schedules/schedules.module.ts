import { Module } from "@nestjs/common";
import { CustomersModule } from "../customers/customers.module.js";
import { DoctorsModule } from "../doctors/doctors.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { SchedulesResolver } from "./schedules.resolver.js";
import { SchedulesService } from "./schedules.service.js";

@Module({
    imports: [CustomersModule, DoctorsModule, NotificationsModule],
    providers: [SchedulesService, SchedulesResolver],
})
export class SchedulesModule {}

import { Module } from "@nestjs/common";
import { MailerService } from "./mailer.service.js";
import { ScheduleNotificationsService } from "./schedule-notifications.service.js";

@Module({
    providers: [MailerService, ScheduleNotificationsService],
    exports: [ScheduleNotificationsService],
})
export class NotificationsModule {}

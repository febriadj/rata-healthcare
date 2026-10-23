import { Injectable, Logger } from "@nestjs/common";
import { MailerService, type Mail } from "./mailer.service.js";

export interface ScheduleNotificationData {
    objective: string;
    scheduledAt: Date;
    customer: { name: string; email: string };
    doctor: { name: string };
}

/** Composes the customer-facing emails for schedule events. Never throws: a failed email must not fail the request. */
@Injectable()
export class ScheduleNotificationsService {
    private readonly logger = new Logger(ScheduleNotificationsService.name);

    constructor(private readonly mailer: MailerService) {}

    notifyCreated(schedule: ScheduleNotificationData): Promise<void> {
        return this.deliver(
            this.compose(
                schedule,
                "Your consultation has been scheduled",
                "has been scheduled",
            ),
            "created",
        );
    }

    notifyDeleted(schedule: ScheduleNotificationData): Promise<void> {
        return this.deliver(
            this.compose(
                schedule,
                "Your consultation has been cancelled",
                "has been cancelled",
            ),
            "deleted",
        );
    }

    private compose(
        schedule: ScheduleNotificationData,
        subject: string,
        outcome: string,
    ): Mail {
        const { customer, doctor, objective, scheduledAt } = schedule;

        return {
            to: customer.email,
            subject,
            // Plain text only: user-provided values such as the objective are never interpreted as markup.
            text: [
                `Hello ${customer.name},`,
                "",
                `Your consultation with ${doctor.name} ${outcome}.`,
                "",
                `Objective: ${objective}`,
                `Time: ${scheduledAt.toISOString()} (UTC)`,
            ].join("\n"),
        };
    }

    private async deliver(mail: Mail, event: string): Promise<void> {
        try {
            await this.mailer.send(mail);
        } catch (error) {
            this.logger.error(
                `Failed to send "${event}" email to ${mail.to}`,
                error instanceof Error ? error.stack : error,
            );
        }
    }
}

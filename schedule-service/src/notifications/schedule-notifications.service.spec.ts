import type { MailerService } from "./mailer.service.js";
import { ScheduleNotificationsService } from "./schedule-notifications.service.js";

const schedule = {
    objective: "Annual <b>checkup</b>",
    scheduledAt: new Date("2030-01-01T09:00:00Z"),
    customer: { name: "Jane", email: "jane@example.com" },
    doctor: { name: "Dr. Strange" },
};

describe("ScheduleNotificationsService", () => {
    const send = vi.fn();
    const notifications = new ScheduleNotificationsService({
        send,
    } as unknown as MailerService);

    beforeEach(() => {
        send.mockReset().mockResolvedValue(undefined);
    });

    it("emails the customer when a schedule is created", async () => {
        await notifications.notifyCreated(schedule);

        const [mail] = send.mock.calls[0];
        expect(mail.to).toBe("jane@example.com");
        expect(mail.subject).toBe("Your consultation has been scheduled");
        expect(mail.text).toContain("Dr. Strange");
        expect(mail.text).toContain("2030-01-01T09:00:00.000Z");
    });

    it("emails the customer when a schedule is deleted", async () => {
        await notifications.notifyDeleted(schedule);

        const [mail] = send.mock.calls[0];
        expect(mail.subject).toBe("Your consultation has been cancelled");
        expect(mail.text).toContain("has been cancelled");
    });

    it("keeps user-provided text as-is, since the email is plain text", async () => {
        await notifications.notifyCreated(schedule);

        expect(send.mock.calls[0][0].text).toContain("Annual <b>checkup</b>");
    });

    it("swallows delivery errors so the caller is never affected", async () => {
        send.mockRejectedValue(new Error("SMTP down"));

        await expect(
            notifications.notifyCreated(schedule),
        ).resolves.toBeUndefined();
    });
});

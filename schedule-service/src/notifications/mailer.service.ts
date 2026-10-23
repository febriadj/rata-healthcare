import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";

export interface Mail {
    to: string;
    subject: string;
    text: string;
}

/** Thin wrapper over the SMTP transport, so the rest of the app never touches nodemailer. */
@Injectable()
export class MailerService {
    private readonly transporter: Transporter;
    private readonly from: string;

    constructor(config: ConfigService) {
        this.from = config.getOrThrow<string>("MAIL_FROM");
        this.transporter = createTransport({
            host: config.getOrThrow<string>("SMTP_HOST"),
            port: Number(config.get("SMTP_PORT", 1025)),
            auth: this.buildAuth(config),
        });
    }

    async send({ to, subject, text }: Mail): Promise<void> {
        await this.transporter.sendMail({ from: this.from, to, subject, text });
    }

    private buildAuth(
        config: ConfigService,
    ): { user: string; pass: string } | undefined {
        const user = config.get<string>("SMTP_USER");
        const pass = config.get<string>("SMTP_PASSWORD");

        return user && pass ? { user, pass } : undefined;
    }
}

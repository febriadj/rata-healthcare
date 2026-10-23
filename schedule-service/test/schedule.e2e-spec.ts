import {
    UnauthorizedException,
    ValidationPipe,
    type INestApplication,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { AuthClient } from "../src/auth/auth.client.js";
import {
    MailerService,
    type Mail,
} from "../src/notifications/mailer.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { createFakePrisma } from "./fake-prisma.js";

const VALID_TOKEN = "valid-token";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

describe("Schedule service (e2e)", () => {
    let app: INestApplication;
    let sentMails: Mail[];
    let failMail = false;

    const send = (query: string, token: string | null = VALID_TOKEN) => {
        const call = request(app.getHttpServer()).post("/graphql");
        if (token) call.set("Authorization", `Bearer ${token}`);
        return call.send({ query });
    };

    /** Runs an operation that is expected to succeed and returns the field it selected. */
    const data = async (query: string, field: string) => {
        const { body } = await send(query);
        expect(body.errors).toBeUndefined();
        return body.data[field];
    };

    const createCustomer = (email = "jane@example.com") =>
        data(
            `mutation { createCustomer(input: { name: "Jane", email: "${email}" }) { id email } }`,
            "createCustomer",
        );

    const createDoctor = () =>
        data(
            `mutation { createDoctor(input: { name: "Dr. Strange" }) { id } }`,
            "createDoctor",
        );

    const createSchedule = (
        customerId: string,
        doctorId: string,
        scheduledAt = "2030-01-01T09:00:00.000Z",
    ) =>
        send(`mutation { createSchedule(input: {
            objective: "Checkup", customerId: "${customerId}", doctorId: "${doctorId}", scheduledAt: "${scheduledAt}"
        }) { id customer { id } doctor { id } scheduledAt } }`);

    beforeEach(() => {
        sentMails = [];
        failMail = false;
    });

    /** Notifications are fire-and-forget, so let pending promises settle before asserting. */
    const settle = () => new Promise((resolve) => setImmediate(resolve));

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(PrismaService)
            .useValue(createFakePrisma())
            .overrideProvider(MailerService)
            .useValue({
                send: async (mail: Mail) => {
                    if (failMail) throw new Error("SMTP down");
                    sentMails.push(mail);
                },
            })
            .overrideProvider(AuthClient)
            .useValue({
                validateToken: async (token: string) => {
                    if (token !== VALID_TOKEN)
                        throw new UnauthorizedException(
                            "Invalid or expired token",
                        );
                    return { id: "user-1", email: "admin@example.com" };
                },
            })
            .compile();

        app = moduleRef.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe("authentication", () => {
        it("rejects a request without a token", async () => {
            const { body } = await send(`{ customers { total } }`, null);
            expect(body.errors[0].message).toBe("Missing bearer token");
        });

        it("rejects a token the auth service refuses", async () => {
            const { body } = await send(`{ customers { total } }`, "forged");
            expect(body.errors[0].message).toBe("Invalid or expired token");
        });
    });

    describe("customers", () => {
        it("creates, reads, updates and lists customers with pagination", async () => {
            const created = await createCustomer("crud@example.com");

            expect(
                await data(
                    `{ customer(id: "${created.id}") { email } }`,
                    "customer",
                ),
            ).toEqual({
                email: "crud@example.com",
            });

            const updated = await data(
                `mutation { updateCustomer(id: "${created.id}", input: { name: "Renamed" }) { name email } }`,
                "updateCustomer",
            );
            expect(updated).toEqual({
                name: "Renamed",
                email: "crud@example.com",
            });

            const page = await data(
                `{ customers(page: 1, limit: 1) { items { id } total page limit totalPages } }`,
                "customers",
            );
            expect(page.items).toHaveLength(1);
            expect(page.total).toBeGreaterThanOrEqual(1);
            expect(page.totalPages).toBe(Math.ceil(page.total / 1));
        });

        it("rejects a duplicate email", async () => {
            await createCustomer("dup@example.com");
            const { body } = await send(
                `mutation { createCustomer(input: { name: "X", email: "DUP@example.com" }) { id } }`,
            );

            expect(body.errors[0].message).toBe(
                "Email is already used by another customer",
            );
        });

        it("rejects invalid input and out-of-range pagination", async () => {
            const invalid = await send(
                `mutation { createCustomer(input: { name: "", email: "nope" }) { id } }`,
            );
            const tooLarge = await send(`{ customers(limit: 1000) { total } }`);

            expect(invalid.body.errors).toBeDefined();
            expect(tooLarge.body.errors).toBeDefined();
        });

        it("returns not found for an unknown or malformed id", async () => {
            const unknown = await send(
                `{ customer(id: "${UNKNOWN_ID}") { id } }`,
            );
            const malformed = await send(`{ customer(id: "abc") { id } }`);

            expect(unknown.body.errors[0].message).toBe("Customer not found");
            expect(malformed.body.errors).toBeDefined();
        });
    });

    describe("doctors", () => {
        it("creates, updates and deletes a doctor", async () => {
            const doctor = await createDoctor();

            const updated = await data(
                `mutation { updateDoctor(id: "${doctor.id}", input: { name: "Dr. Who" }) { name } }`,
                "updateDoctor",
            );
            expect(updated.name).toBe("Dr. Who");

            await data(
                `mutation { deleteDoctor(id: "${doctor.id}") { id } }`,
                "deleteDoctor",
            );
            const { body } = await send(
                `{ doctor(id: "${doctor.id}") { id } }`,
            );
            expect(body.errors[0].message).toBe("Doctor not found");
        });
    });

    describe("schedules", () => {
        it("creates a schedule that embeds its customer and doctor", async () => {
            const [customer, doctor] = [
                await createCustomer("s1@example.com"),
                await createDoctor(),
            ];

            const { body } = await createSchedule(customer.id, doctor.id);

            expect(body.errors).toBeUndefined();
            expect(body.data.createSchedule.customer.id).toBe(customer.id);
            expect(body.data.createSchedule.doctor.id).toBe(doctor.id);
        });

        it("rejects a second schedule for the same doctor at the same time", async () => {
            const [customer, doctor] = [
                await createCustomer("s2@example.com"),
                await createDoctor(),
            ];
            await createSchedule(
                customer.id,
                doctor.id,
                "2030-02-01T09:00:00.000Z",
            );

            const { body } = await createSchedule(
                customer.id,
                doctor.id,
                "2030-02-01T09:00:00.000Z",
            );

            expect(body.errors[0].message).toBe(
                "The doctor already has a schedule at that time",
            );
        });

        it("allows another doctor, or another time, to be booked", async () => {
            const [customer, doctor, other] = [
                await createCustomer("s3@example.com"),
                await createDoctor(),
                await createDoctor(),
            ];
            await createSchedule(
                customer.id,
                doctor.id,
                "2030-03-01T09:00:00.000Z",
            );

            const otherDoctor = await createSchedule(
                customer.id,
                other.id,
                "2030-03-01T09:00:00.000Z",
            );
            const otherTime = await createSchedule(
                customer.id,
                doctor.id,
                "2030-03-01T10:00:00.000Z",
            );

            expect(otherDoctor.body.errors).toBeUndefined();
            expect(otherTime.body.errors).toBeUndefined();
        });

        it("rejects an unknown customer or doctor", async () => {
            const [customer, doctor] = [
                await createCustomer("s4@example.com"),
                await createDoctor(),
            ];

            const noCustomer = await createSchedule(UNKNOWN_ID, doctor.id);
            const noDoctor = await createSchedule(customer.id, UNKNOWN_ID);

            expect(noCustomer.body.errors[0].message).toBe(
                "Customer not found",
            );
            expect(noDoctor.body.errors[0].message).toBe("Doctor not found");
        });

        it("filters by doctor and by time range, with pagination", async () => {
            const [customer, doctor] = [
                await createCustomer("s5@example.com"),
                await createDoctor(),
            ];
            for (const day of ["01", "02", "03"]) {
                await createSchedule(
                    customer.id,
                    doctor.id,
                    `2031-01-${day}T09:00:00.000Z`,
                );
            }

            const byDoctor = await data(
                `{ schedules(doctorId: "${doctor.id}", limit: 2) { items { id } total totalPages } }`,
                "schedules",
            );
            const byRange = await data(
                `{ schedules(doctorId: "${doctor.id}", from: "2031-01-02T00:00:00Z", to: "2031-01-03T23:59:59Z") { total } }`,
                "schedules",
            );

            expect(byDoctor).toMatchObject({ total: 3, totalPages: 2 });
            expect(byDoctor.items).toHaveLength(2);
            expect(byRange.total).toBe(2);
        });

        it("deletes a schedule, and blocks deleting a customer or doctor that still has one", async () => {
            const [customer, doctor] = [
                await createCustomer("s6@example.com"),
                await createDoctor(),
            ];
            const { body } = await createSchedule(
                customer.id,
                doctor.id,
                "2032-01-01T09:00:00.000Z",
            );
            const scheduleId = body.data.createSchedule.id;

            const blocked = await send(
                `mutation { deleteCustomer(id: "${customer.id}") { id } }`,
            );
            expect(blocked.body.errors[0].message).toMatch(
                /still has schedules/,
            );

            await data(
                `mutation { deleteSchedule(id: "${scheduleId}") { id } }`,
                "deleteSchedule",
            );
            await data(
                `mutation { deleteCustomer(id: "${customer.id}") { id } }`,
                "deleteCustomer",
            );

            const gone = await send(`{ schedule(id: "${scheduleId}") { id } }`);
            expect(gone.body.errors[0].message).toBe("Schedule not found");
        });
    });
    describe("email notifications", () => {
        it("emails the customer when a schedule is created and when it is deleted", async () => {
            const [customer, doctor] = [
                await createCustomer("mail1@example.com"),
                await createDoctor(),
            ];

            const { body } = await createSchedule(
                customer.id,
                doctor.id,
                "2033-01-01T09:00:00.000Z",
            );
            await settle();
            expect(sentMails).toHaveLength(1);
            expect(sentMails[0]).toMatchObject({
                to: "mail1@example.com",
                subject: "Your consultation has been scheduled",
            });

            await data(
                `mutation { deleteSchedule(id: "${body.data.createSchedule.id}") { id } }`,
                "deleteSchedule",
            );
            await settle();
            expect(sentMails).toHaveLength(2);
            expect(sentMails[1].subject).toBe(
                "Your consultation has been cancelled",
            );
        });

        it("sends nothing when the schedule is rejected", async () => {
            const [customer, doctor] = [
                await createCustomer("mail2@example.com"),
                await createDoctor(),
            ];
            await createSchedule(
                customer.id,
                doctor.id,
                "2033-02-01T09:00:00.000Z",
            );
            await settle();
            sentMails = [];

            await createSchedule(
                customer.id,
                doctor.id,
                "2033-02-01T09:00:00.000Z",
            );
            await settle();

            expect(sentMails).toHaveLength(0);
        });

        it("still creates the schedule when the email cannot be sent", async () => {
            const [customer, doctor] = [
                await createCustomer("mail3@example.com"),
                await createDoctor(),
            ];
            failMail = true;

            const { body } = await createSchedule(
                customer.id,
                doctor.id,
                "2033-03-01T09:00:00.000Z",
            );

            expect(body.errors).toBeUndefined();
            expect(body.data.createSchedule.id).toBeDefined();
        });
    });
});

import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { AuthModule } from "./auth/auth.module.js";
import { validateEnv } from "./config/env.validation.js";
import { CustomersModule } from "./customers/customers.module.js";
import { DoctorsModule } from "./doctors/doctors.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { SchedulesModule } from "./schedules/schedules.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            path: "/graphql",
            autoSchemaFile: true,
            sortSchema: true,
            // Apollo Server 5 no longer ships the legacy GraphQL Playground;
            // the embedded Apollo Sandbox is its replacement and is served on GET /graphql.
            introspection: true,
            playground: false,
            plugins: [
                ApolloServerPluginLandingPageLocalDefault({ embed: true }),
            ],
        }),
        PrismaModule,
        AuthModule,
        CustomersModule,
        DoctorsModule,
        SchedulesModule,
    ],
})
export class AppModule {}

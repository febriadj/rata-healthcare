import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { AuthModule } from "./auth/auth.module.js";
import { CacheModule } from "./cache/cache.module.js";
import { validateEnv } from "./config/env.validation.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            path: "/graphql",
            autoSchemaFile: true,
            sortSchema: true,
            introspection: true,
            playground: false,
            plugins: [
                ApolloServerPluginLandingPageLocalDefault({ embed: true }),
            ],
        }),
        PrismaModule,
        CacheModule,
        AuthModule,
    ],
})
export class AppModule {}

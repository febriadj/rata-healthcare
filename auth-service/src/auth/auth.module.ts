import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, type JwtSignOptions } from "@nestjs/jwt";
import { UsersModule } from "../users/users.module.js";
import { AuthResolver } from "./auth.resolver.js";
import { AuthService } from "./auth.service.js";

const DEFAULT_TOKEN_LIFETIME = "1h";

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>("JWT_SECRET"),
                signOptions: {
                    expiresIn: config.get<string>(
                        "JWT_EXPIRES_IN",
                        DEFAULT_TOKEN_LIFETIME,
                    ) as JwtSignOptions["expiresIn"],
                },
            }),
        }),
    ],
    providers: [AuthService, AuthResolver],
})
export class AuthModule {}

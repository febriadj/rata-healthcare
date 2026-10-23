import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthClient } from "./auth.client.js";
import { AuthGuard } from "./auth.guard.js";

@Module({
    providers: [AuthClient, { provide: APP_GUARD, useClass: AuthGuard }],
    exports: [AuthClient],
})
export class AuthModule {}

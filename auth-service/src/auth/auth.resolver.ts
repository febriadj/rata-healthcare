import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UserModel } from "../users/user.model.js";
import { AuthService } from "./auth.service.js";
import { LoginInput } from "./dto/login.input.js";
import { RegisterInput } from "./dto/register.input.js";
import { AuthPayload } from "./models/auth-payload.model.js";

@Resolver()
export class AuthResolver {
    constructor(private readonly authService: AuthService) {}

    @Mutation(() => UserModel, {
        description: "Registers a new user with an email and a password.",
    })
    register(@Args("input") input: RegisterInput): Promise<UserModel> {
        return this.authService.register(input);
    }

    @Mutation(() => AuthPayload, {
        description: "Logs in and returns a JWT access token.",
    })
    login(@Args("input") input: LoginInput): Promise<AuthPayload> {
        return this.authService.login(input);
    }

    @Query(() => UserModel, {
        description:
            "Validates a JWT and returns its user. Used by other services; fails with Unauthorized when invalid.",
    })
    validateToken(@Args("token") token: string): Promise<UserModel> {
        return this.authService.validateToken(token);
    }
}

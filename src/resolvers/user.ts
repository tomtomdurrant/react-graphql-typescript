import {
  Resolver,
  InputType,
  Field,
  Mutation,
  Arg,
  Ctx,
  ObjectType,
} from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import argon2 from "argon2";

@InputType()
class UsernamePasswortInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswortInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [{ field: "username", message: "username is too short" }],
      };
    }
    if (options.password.length <= 3) {
      return {
        errors: [
          { field: "password", message: "password must be greater than 3" },
        ],
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });
    try {
      await em.persistAndFlush(user);
      return { user };
    } catch (error) {
      console.log("error:", error);
      if (error.code === "23505") {
        // duplicate username code
        return {
          errors: [
            {
              field: "username",
              message: "username already exists",
            },
          ],
        };
      }
      return {
        errors: [
          {
            field: "etc",
            message: "something went wrong",
          },
        ],
      };
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswortInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username });
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "username does not exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      console.log("invalid password");
      return {
        errors: [{ field: "password", message: "incorrect password" }],
      };
    }
    console.log("password is valid");

    return { user };
  }
}

import { Resolver, Mutation, Arg, Ctx, Query } from "type-graphql";
import { MyContext } from "../types";
import { User } from "../entities/User";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { UserResponse } from "./UserResponse";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    console.log("session:", req.session);

    // User does not have cookie & is not logged in
    if (!req.session!.userId) {
      return null;
    }
    const user = await em.findOne(User, req.session!.userId);
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      email: options.email,
      password: hashedPassword,
    });
    try {
      await em.persistAndFlush(user);
      // store user id session
      req.session!.userId = user.id;
      return { user };
    } catch (error) {
      console.log("error:", error);
      const duplicateUserName = error.code === "23505";
      console.log("duplicateUsername error: ", duplicateUserName);

      if (duplicateUserName) {
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
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes("@")
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );
    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "username does not exist",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      console.log("invalid password");
      return {
        errors: [{ field: "password", message: "incorrect password" }],
      };
    }
    req.session!.userId = user.id;
    console.log("password is valid");
    console.log("req session: ", req.session);

    return { user };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
    return new Promise((resolve) => {
      req.session?.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return false;
        }
        resolve(true);
        return true;
      });
    });
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = await em.findOne(User, { email });
    if (!user) {
      // email not in db, don't alert that to user though
      console.log("didnt find user");

      return true;
    }
    const token = v4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user!.id,
      "ex",
      1000 * 60 * 60 * 24 * 3 // 3 days
    );
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${token}" target="_blank">Forgot Password</a>`
    );
    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { em, redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 3) {
      return {
        errors: [
          { field: "newPassword", message: "length must be greater than 2" },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [{ field: "token", message: "token is expired" }],
      };
    }

    const user = await em.findOne(User, { id: parseInt(userId) });

    if (!user) {
      return {
        errors: [{ field: "token", message: "user no longer exists" }],
      };
    }

    // Will auto update with the update hook
    user.password = await argon2.hash(newPassword);
    await em.persistAndFlush(user);

    await redis.del(key);

    // Log in user after change password
    req.session!.userId = user.id;

    return { user };
  }
}

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
import { Post } from "src/entities/Post";
import { getConnection } from "typeorm";

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    console.log("session:", req.session);

    // User does not have cookie & is not logged in
    if (!req.session!.userId) {
      return null;
    }
    const user = await User.findOne(req.session!.userId);
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<any> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password);

    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedPassword,
        })
        .returning("*")
        .execute();
      console.log("result: ", result);
    } catch (error) {
      console.log(error);
    }

    return {};
    // Old Micro-orm use
    // const user = em.create(User, {
    //   username: options.username,
    //   email: options.email,
    //   password: hashedPassword,
    // });
    // try {
    //   await em.persistAndFlush(user);
    //   // store user id session
    //   req.session!.userId = user.id;
    //   return { user };
    // } catch (error) {
    //   console.log("error:", error);
    //   const duplicateUserName = error.code === "23505";
    //   console.log("duplicateUsername error: ", duplicateUserName);

    //   if (duplicateUserName) {
    //     // duplicate username code
    //     return {
    //       errors: [
    //         {
    //           field: "username",
    //           message: "username already exists",
    //         },
    //       ],
    //     };
    //   }
    //   return {
    //     errors: [
    //       {
    //         field: "etc",
    //         message: "something went wrong",
    //       },
    //     ],
    //   };
    // }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
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
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
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
    @Ctx() { redis, req }: MyContext
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
    const userNumId = parseInt(userId);
    const user = await User.findOne(userNumId);

    if (!user) {
      return {
        errors: [{ field: "token", message: "user no longer exists" }],
      };
    }

    // Will auto update with the update hook
    await User.update(
      { id: userNumId },
      { password: await argon2.hash(newPassword) }
    );

    await redis.del(key);

    // Log in user after change password
    req.session!.userId = user.id;

    return { user };
  }
}

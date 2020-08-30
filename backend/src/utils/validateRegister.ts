import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";
import { FieldError } from "src/resolvers/FieldError";

export const validateRegister = (
  options: UsernamePasswordInput
): FieldError[] | null => {
  if (!options.email.includes("@")) {
    return [{ field: "email", message: "email not valid" }];
  }

  if (options.username.length <= 2) {
    return [{ field: "username", message: "username is too short" }];
  }

  if (options.username.includes("@")) {
    return [
      { field: "username", message: `username cannot include an @ sign` },
    ];
  }

  if (options.password.length <= 3) {
    return [{ field: "password", message: "password must be greater than 3" }];
  }

  return null;
};

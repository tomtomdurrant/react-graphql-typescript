import * as React from "react";
import { Formik, Form } from "formik";
import { Box, Button, Link, Flex } from "@chakra-ui/core";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { useLoginMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import NextLink from "next/link";

interface ILoginProps {}

const Login: React.FunctionComponent<ILoginProps> = () => {
  const router = useRouter();
  const [, login] = useLoginMutation();
  return (
    <Wrapper variant={"small"}>
      <Formik
        initialValues={{ usernameOrEmail: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          console.log(values);
          const response = await login(values);
          if (response.data?.login.errors) {
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            router.push("/");
          }
          console.log(response);
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="usernameOrEmail"
              placeholder="username or email"
              label="Username or Email"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="password"
                type="password"
              />
            </Box>
            <Flex>
              <Button
                mt={4}
                isLoading={isSubmitting}
                type="submit"
                variantColor="teal"
              >
                Login
              </Button>
              <NextLink href="/forgot-password">
                <Link mt={2} ml={"auto"}>
                  Forgot password?
                </Link>
              </NextLink>
            </Flex>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default withUrqlClient(createUrqlClient)(Login);

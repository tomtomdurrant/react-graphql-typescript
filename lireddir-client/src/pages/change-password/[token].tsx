import React, { useState } from "react";
import { NextPage } from "next";
import Wrapper from "../../components/Wrapper";
import { Formik, Form } from "formik";
import { toErrorMap } from "../../utils/toErrorMap";
import InputField from "../../components/InputField";
import { Button, Box, Link, Flex } from "@chakra-ui/core";
import { useChangePasswordMutation } from "../../generated/graphql";
import { useRouter } from "next/router";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../../utils/createUrqlClient";
import NextLink from "next/link";

const ChangePassword: NextPage<{ token: string }> = ({ token }) => {
  const router = useRouter();
  const [, changePassword] = useChangePasswordMutation();
  const [tokenError, setTokenError] = useState("");
  return (
    <Wrapper variant={"small"}>
      <Formik
        initialValues={{ newPassword: "" }}
        onSubmit={async (values, { setErrors }) => {
          console.log(values);
          const response = await changePassword({
            newPassword: values.newPassword,
            token,
          });
          if (response.data?.changePassword.errors) {
            const errorMap = toErrorMap(response.data.changePassword.errors);
            if ("token" in errorMap) {
              setTokenError(errorMap.token);
            }
            setErrors(errorMap);
          } else if (response.data?.changePassword.user) {
            router.push("/");
          }
          console.log(response);
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="newPassword"
              placeholder="New Password"
              label="New Password"
              type="password"
            />
            {tokenError ? (
              <Flex>
                <Box mr={2} style={{ color: "red" }}>
                  {tokenError}
                </Box>
                <NextLink href="/forgot-password">
                  <Link>Click here to reset again</Link>
                </NextLink>
              </Flex>
            ) : null}
            <Button
              mt={4}
              isLoading={isSubmitting}
              type="submit"
              variantColor="teal"
            >
              Change Password
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

ChangePassword.getInitialProps = ({ query }) => {
  return {
    token: query.token as string,
  };
};

export default withUrqlClient(createUrqlClient)(ChangePassword);

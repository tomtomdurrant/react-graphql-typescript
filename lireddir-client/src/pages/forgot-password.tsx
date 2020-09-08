import React, { useState } from "react";
import Wrapper from "../components/Wrapper";
import { Formik, Form } from "formik";
import login from "./login";
import { toErrorMap } from "../utils/toErrorMap";
import InputField from "../components/InputField";
import { Box, Flex, Button, Link } from "@chakra-ui/core";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { useForgotPasswordMutation } from "../generated/graphql";

interface Props {}

const ForgotPassword: React.FC<Props> = (props: Props) => {
  const [complete, setComplete] = useState(false);
  const [, forgotPassword] = useForgotPasswordMutation();
  return (
    <Wrapper variant={"small"}>
      <Formik
        initialValues={{ email: "" }}
        onSubmit={async (values, { setErrors }) => {
          console.log(values);
          const response = await forgotPassword(values);
          setComplete(true);
        }}
      >
        {({ isSubmitting }) =>
          complete ? (
            <Box>Sent email to that account</Box>
          ) : (
            <Form>
              <InputField
                name="email"
                placeholder="email"
                label="Email"
                type="email"
              />
              <Flex>
                <Button
                  mt={4}
                  isLoading={isSubmitting}
                  type="submit"
                  variantColor="teal"
                >
                  Forgot Password
                </Button>
              </Flex>
            </Form>
          )
        }
      </Formik>
    </Wrapper>
  );
};

export default withUrqlClient(createUrqlClient)(ForgotPassword);

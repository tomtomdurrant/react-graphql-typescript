import * as React from "react";
import { Formik, Form } from "formik";
import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
} from "@chakra-ui/core";
import Wrapper from "../components/Wrapper";

interface IRegisterProps {}

const Register: React.FunctionComponent<IRegisterProps> = (props) => {
  return (
    <Wrapper variant={"small"}>
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={(values) => console.log(values)}
      >
        {(values, handleChange) => (
          <Form>
            <FormControl>
              <FormLabel htmlFor="username">Username</FormLabel>
              <Input
                value={values.username}
                id="username"
                placeholder="username"
                onChange={handleChange}
              />
              {/* <FormErrorMessage>{form.errors.name}</FormErrorMessage> */}
            </FormControl>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default Register;

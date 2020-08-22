import * as React from "react";
import { Box } from "@chakra-ui/core";

interface IWrapperProps {
  variant?: "small" | "regular";
}

const Wrapper: React.FC<IWrapperProps> = ({
  children,
  variant = "regular",
}) => {
  return (
    <Box
      maxW={variant === "regular" ? "800px" : "400px"}
      w="100%"
      mt={8}
      mx="auto"
    >
      {children}
    </Box>
  );
};

export default Wrapper;

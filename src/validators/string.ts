import type { ValidateData } from "../types/types-helpers";

export function validateString(
  input: unknown,
  options?: {
    key: string;
  }
): ValidateData<string> {
  if (typeof input !== "string") {
    const core = `Expected string, but received ${typeof input}`;
    return {
      success: false,
      error: {
        message: options?.key ? `[${options.key}] ${core}` : core,
      },
    };
  }

  if (input === "") {
    return {
      success: false,
      error: {
        message: `${options?.key ? options?.key : "String"} cannot be empty`,
      },
    };
  }
  const inputTrimmed = input.trim();

  if (inputTrimmed === "") {
    return {
      success: false,
      error: {
        message: `${
          options?.key ? options?.key : "String"
        } cannot be empty or contain only whitespace`,
      },
    };
  }

  return {
    success: true,
    data: inputTrimmed,
  };
}

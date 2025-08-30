interface ValidateDataFailure<T> {
  success: false;
  error: {
    message: string;
  };
}

interface ValidateDataSuccess<T> {
  success: true;
  data: T;
}

export type ValidateData<T> = ValidateDataFailure<T> | ValidateDataSuccess<T>;

import { FormEvent } from "react";

export type FieldError = {
  type?: string;
  message?: string;
};

export type FieldErrors<TFieldValues> = {
  [K in keyof TFieldValues]?: FieldError;
};

export type SubmitHandler<TFieldValues> = (
  values: TFieldValues,
  event?: FormEvent
) => void | Promise<void>;

export type SubmitErrorHandler<TFieldValues> = (
  errors: FieldErrors<TFieldValues>
) => void | Promise<void>;

export type ResolverResult<TFieldValues> = {
  values: TFieldValues;
  errors: FieldErrors<TFieldValues>;
};

export type Resolver<TFieldValues> = (
  values: any,
  context: unknown,
  options: unknown
) => Promise<ResolverResult<TFieldValues>> | ResolverResult<TFieldValues>;

export type RegisterOptions = {
  valueAsNumber?: boolean;
  valueAsDate?: boolean;
  setValueAs?: (value: any) => any;
};

export interface UseFormOptions<TFieldValues> {
  defaultValues?: Partial<TFieldValues>;
  resolver?: Resolver<TFieldValues>;
}

export interface UseFormReturn<TFieldValues> {
  register: (
    name: keyof TFieldValues & string,
    options?: RegisterOptions
  ) => {
    name: string;
    defaultValue: unknown;
    onChange: (event: { target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement }) => void;
    onBlur: () => void;
    ref: (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => void;
  };
  handleSubmit: (
    onValid: SubmitHandler<TFieldValues>,
    onInvalid?: SubmitErrorHandler<TFieldValues>
  ) => (event?: FormEvent) => Promise<void>;
  reset: (values?: Partial<TFieldValues>) => void;
  setValue: (
    name: keyof TFieldValues & string,
    value: any,
    options?: RegisterOptions
  ) => void;
  getValues: () => TFieldValues;
  watch: (name?: keyof TFieldValues | Array<keyof TFieldValues>) => any;
  formState: {
    errors: FieldErrors<TFieldValues>;
    isSubmitting: boolean;
    isSubmitSuccessful: boolean;
    isDirty: boolean;
  };
}

export declare function useForm<TFieldValues = Record<string, any>>(
  options?: UseFormOptions<TFieldValues>
): UseFormReturn<TFieldValues>;

export declare const FormProvider: React.FC<{ children: React.ReactNode }>;
export declare const Controller: React.FC;
export declare const useFormContext: () => never;
export declare const useController: () => never;
export declare const useWatch: (options: {
  control?: UseFormReturn<any>;
  name?: string;
}) => any;

export default {
  useForm,
  FormProvider,
};

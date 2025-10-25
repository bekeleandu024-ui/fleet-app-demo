import { useCallback, useMemo, useRef, useState } from "react";

function cloneDefaultValues(defaultValues = {}) {
  return JSON.parse(JSON.stringify(defaultValues));
}

function applyValue(element, value, config) {
  if (!element) return;
  const normalized = formatForInput(value, config);
  if (element.type === "checkbox") {
    element.checked = Boolean(normalized);
  } else if (element.type === "number" && normalized === "") {
    element.value = "";
  } else {
    element.value = normalized;
  }
}

function formatForInput(value, config = {}) {
  if (value == null) return "";
  if (config.valueAsDate) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return String(value);
}

function parseValue(raw, config = {}) {
  if (config.valueAsDate) {
    if (!raw) return undefined;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (config.setValueAs) {
    return config.setValueAs(raw);
  }
  if (config.valueAsNumber) {
    const numberValue = raw === "" || raw == null ? undefined : Number(raw);
    return Number.isNaN(numberValue) ? undefined : numberValue;
  }
  return raw;
}

function emptyErrors() {
  return Object.create(null);
}

export function useForm(options = {}) {
  const { defaultValues = {}, resolver } = options;
  const defaultClone = useMemo(() => cloneDefaultValues(defaultValues), [defaultValues]);
  const valuesRef = useRef(cloneDefaultValues(defaultValues));
  const refs = useRef(new Map());
  const [, forceRerender] = useState({});
  const [formState, setFormState] = useState({
    errors: emptyErrors(),
    isSubmitting: false,
    isSubmitSuccessful: false,
    isDirty: false,
  });

  const register = useCallback(
    (name, config = {}) => {
      const fieldName = String(name);
      return {
        name: fieldName,
        defaultValue: valuesRef.current[fieldName] ?? defaultClone[fieldName] ?? "",
        onChange: (event) => {
          const { value, checked, type } = event.target;
          const raw = type === "checkbox" ? checked : value;
          valuesRef.current[fieldName] = parseValue(raw, config);
          setFormState((state) => (state.isDirty ? state : { ...state, isDirty: true }));
        },
        onBlur: () => {},
        ref: (element) => {
          if (element) {
            refs.current.set(fieldName, { element, config });
            const currentValue = valuesRef.current[fieldName];
            if (currentValue !== undefined) {
              applyValue(element, currentValue, config);
            }
          } else {
            refs.current.delete(fieldName);
          }
        },
      };
    },
    [defaultClone]
  );

  const setValue = useCallback((name, value, config = {}) => {
    const fieldName = String(name);
    valuesRef.current[fieldName] = value;
    const ref = refs.current.get(fieldName);
    const mergedConfig = { ...(ref?.config ?? {}), ...config };
    if (ref?.element) {
      applyValue(ref.element, value, mergedConfig);
    }
    setFormState((state) => ({ ...state, isDirty: true }));
  }, []);

  const getValues = useCallback(() => {
    return { ...valuesRef.current };
  }, []);

  const reset = useCallback((nextValues) => {
    const base = nextValues ? cloneDefaultValues(nextValues) : cloneDefaultValues(defaultClone);
    valuesRef.current = base;
    refs.current.forEach(({ element, config }, fieldName) => {
      applyValue(element, base[fieldName], config);
    });
    setFormState({ errors: emptyErrors(), isSubmitting: false, isSubmitSuccessful: false, isDirty: false });
    forceRerender({});
  }, [defaultClone]);

  const setErrors = useCallback((errors) => {
    setFormState((state) => ({ ...state, errors }));
  }, []);

  const executeResolver = useCallback(
    async (values) => {
      if (!resolver) {
        return { values, errors: emptyErrors() };
      }
      const result = await resolver(values, {}, {});
      const nextValues = result?.values ?? values;
      return {
        values: nextValues,
        errors: result?.errors ?? emptyErrors(),
      };
    },
    [resolver]
  );

  const handleSubmit = useCallback(
    (onValid, onInvalid = undefined) => {
      return async (event) => {
        if (event?.preventDefault) {
          event.preventDefault();
        }
        setFormState((state) => ({ ...state, isSubmitting: true }));
        const snapshot = { ...valuesRef.current };
        try {
          const { values, errors } = await executeResolver(snapshot);
          const hasErrors = Object.keys(errors).length > 0;
          if (hasErrors) {
            setErrors(errors);
            setFormState((state) => ({ ...state, isSubmitting: false, isSubmitSuccessful: false }));
            if (onInvalid) {
              await onInvalid(errors);
            }
            return;
          }
          valuesRef.current = { ...values };
          setErrors(emptyErrors());
          await onValid(values, event);
          setFormState((state) => ({ ...state, isSubmitting: false, isSubmitSuccessful: true }));
        } catch (error) {
          setFormState((state) => ({ ...state, isSubmitting: false }));
          throw error;
        }
      };
    },
    [executeResolver, setErrors]
  );

  const watch = useCallback((name) => {
    if (!name) return { ...valuesRef.current };
    if (Array.isArray(name)) {
      return name.map((key) => valuesRef.current[String(key)]);
    }
    return valuesRef.current[String(name)];
  }, []);

  return {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState,
  };
}

export const FormProvider = ({ children }) => children;
export const Controller = () => {
  throw new Error("Controller is not implemented in the local react-hook-form shim.");
};

export const useFormContext = () => {
  throw new Error("useFormContext is not implemented in the local react-hook-form shim.");
};

export const useController = () => {
  throw new Error("useController is not implemented in the local react-hook-form shim.");
};

export const useWatch = (options = {}) => {
  const { control, name } = options;
  if (!control || !control.watch) return undefined;
  return control.watch(name);
};

export const FormStateProxy = () => {
  throw new Error("FormStateProxy is not implemented in the local react-hook-form shim.");
};

export default {
  useForm,
  FormProvider,
};

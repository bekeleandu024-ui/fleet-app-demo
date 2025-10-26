declare namespace React {
  type ReactNode = any;
  type Key = string | number;

  interface Attributes {
    key?: Key;
  }

  interface ClassAttributes<T> extends Attributes {
    ref?: any;
  }

  interface DOMAttributes<T> {
    children?: ReactNode;
    onClick?: any;
    onChange?: any;
    onSubmit?: any;
    onBlur?: any;
    onFocus?: any;
    onKeyDown?: any;
    onKeyUp?: any;
    onPointerDown?: any;
    onPointerUp?: any;
    onPointerMove?: any;
  }

  interface HTMLAttributes<T> extends DOMAttributes<T> {
    className?: string;
    style?: any;
    id?: string;
    title?: string;
    role?: string;
    tabIndex?: number;
  }

  interface SVGProps<T> extends HTMLAttributes<T> {
    stroke?: string;
    fill?: string;
  }

  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: any;
    defaultValue?: any;
    type?: string;
    checked?: boolean;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    name?: string;
  }

  interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: any;
    defaultValue?: any;
    placeholder?: string;
    rows?: number;
  }

  interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
    value?: any;
    multiple?: boolean;
  }

  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    type?: string;
    disabled?: boolean;
    form?: string;
  }

  interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
    htmlFor?: string;
  }

  interface DetailedHTMLProps<E, T> extends E {}
  type TdHTMLAttributes<T> = HTMLAttributes<T>;
  type ThHTMLAttributes<T> = HTMLAttributes<T>;
  type TableHTMLAttributes<T> = HTMLAttributes<T>;
  type HTMLProps<T> = HTMLAttributes<T>;

  interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  interface RefObject<T> {
    readonly current: T | null;
  }

  interface MutableRefObject<T> {
    current: T;
  }

  interface Context<T> {
    Provider: FC<{ value: T }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
  }

  type Dispatch<A> = (value: A) => void;

  type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactNode | null;
  type ComponentType<P = {}> = (props: P & { children?: ReactNode }) => ReactNode | null;

  interface ForwardRefRenderFunction<T, P = {}> {
    (props: P & { children?: ReactNode }, ref: any): ReactNode | null;
  }

  interface ExoticComponent<P = {}> {
    (props: P & { children?: ReactNode }): ReactNode | null;
  }

  function forwardRef<T, P = {}>(render: ForwardRefRenderFunction<T, P>): ExoticComponent<P>;
  function memo<T>(component: T, propsAreEqual?: any): T;
  function createContext<T>(defaultValue: T): Context<T>;

  function createElement(type: any, props?: any, ...children: any[]): ReactElement;

  interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }

  interface JSXElementConstructor<P> {
    (props: P): ReactElement | null;
  }

  function useState<T>(initial: T): [T, (value: T) => void];
  function useState<T = undefined>(): [T | undefined, (value: T | undefined) => void];
  function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  function useMemo<T>(factory: () => T, deps?: ReadonlyArray<any>): T;
  function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: ReadonlyArray<any>): T;
  function useRef<T>(initial: T): MutableRefObject<T>;
  function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  function useContext<T>(context: Context<T>): T;
  function useReducer<R extends (state: any, action: any) => any, I>(
    reducer: R,
    initialState: I
  ): [ReturnType<R>, (action: Parameters<R>[1]) => void];
  function useTransition(): [boolean, Dispatch<() => void>];
  function useDeferredValue<T>(value: T): T;
  function useId(): string;
  function startTransition(scope: () => void): void;
  function useLayoutEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;

  type ReactNodeArray = Array<ReactNode>;

  namespace JSX {
    interface Element extends ReactElement {}
    interface ElementClass {
      render?: any;
    }
    interface IntrinsicAttributes extends Attributes {}
    interface IntrinsicClassAttributes<T> extends ClassAttributes<T> {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare const React: {
  createElement: typeof React.createElement;
  forwardRef: typeof React.forwardRef;
  memo: typeof React.memo;
  useState: typeof React.useState;
  useEffect: typeof React.useEffect;
  useMemo: typeof React.useMemo;
  useCallback: typeof React.useCallback;
  useRef: typeof React.useRef;
  useContext: typeof React.useContext;
  useReducer: typeof React.useReducer;
  useTransition: typeof React.useTransition;
  useDeferredValue: typeof React.useDeferredValue;
  useId: typeof React.useId;
  startTransition: typeof React.startTransition;
  useLayoutEffect: typeof React.useLayoutEffect;
  Fragment: any;
};

export = React;
export as namespace React;

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }

  interface Process {
    env: ProcessEnv;
    cwd(): string;
  }
}

declare const process: NodeJS.Process;

declare module "node:process" {
  export = process;
}

export {};

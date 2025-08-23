/// <reference types="preact" />

declare global {
  var process: {
    env: {
      NODE_ENV: 'development' | 'production'
    }
  }
  
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface ImportMetaEnv {
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
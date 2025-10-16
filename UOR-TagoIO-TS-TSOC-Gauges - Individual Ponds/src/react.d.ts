// Type declaration for React compatibility with Preact
declare module 'react' {
  export * from 'preact/compat'
  export { default } from 'preact/compat'
}

declare module 'react-dom' {
  export * from 'preact/compat'
  export { default } from 'preact/compat'
}
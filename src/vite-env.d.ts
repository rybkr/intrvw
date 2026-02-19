/// <reference types="vite/client" />

declare module '*.wasm' {
  const content: string;
  export default content;
}

declare module '*.onnx' {
  const content: string;
  export default content;
}

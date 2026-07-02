declare module '@monaco-editor/react' {
  import type { ComponentType } from 'react';

  export type OnMount = (editor: any, monaco: any) => void;
  export type OnChange = (value: string | undefined) => void;

  const MonacoEditorReact: ComponentType<any>;
  export default MonacoEditorReact;
}

declare module 'xterm' {
  export class Terminal {
    constructor(options?: any);
    clear(): void;
    dispose(): void;
    loadAddon(addon: any): void;
    onData(callback: (data: string) => void): void;
    onResize(callback: (size: { cols: number; rows: number }) => void): void;
    open(container: HTMLElement): void;
    write(data: string): void;
    writeln(data: string): void;
  }
}

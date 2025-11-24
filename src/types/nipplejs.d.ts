// Type definitions for nipplejs
declare module 'nipplejs' {
  export interface JoystickManager {
    on(event: string, callback: (evt: any, data: any) => void): void
    destroy(): void
  }

  export interface JoystickOptions {
    zone: HTMLElement
    mode?: 'static' | 'semi' | 'dynamic'
    position?: { left?: string; top?: string; right?: string; bottom?: string }
    color?: string
    size?: number
    threshold?: number
    fadeTime?: number
  }

  export interface JoystickManagerStatic {
    create(options: JoystickOptions): JoystickManager
  }

  const nipplejs: JoystickManagerStatic
  export default nipplejs
}


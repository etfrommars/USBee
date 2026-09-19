/// <reference types="w3c-web-usb" />

declare global {
  interface Navigator {
    usb: USB;
    serial?: {
      requestPort: (options?: any) => Promise<any>;
      getPorts: () => Promise<any[]>;
    };
  }
}

export {};

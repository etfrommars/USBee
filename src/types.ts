export interface UsbPresetCommand {
  id: string;
  name: string;
  hex: string;
  description?: string;
  isBuiltIn?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'TX' | 'RX' | 'SYS' | 'ERR' | 'CTRL';
  direction?: 'OUT' | 'IN';
  endpoint?: number;
  data?: Uint8Array;
  hexString?: string;
  asciiString?: string;
  message: string;
}

export interface ScriptStep {
  id: string;
  type: 'send_bulk' | 'read_bulk' | 'send_ctrl' | 'delay';
  endpoint?: number;
  hexData?: string;
  delayMs?: number;
  ctrlRequestType?: USBRequestType;
  ctrlRecipient?: USBRecipient;
  ctrlRequest?: number;
  ctrlValue?: number;
  ctrlIndex?: number;
  expectedLength?: number;
}

export interface FilterConfig {
  mode: 'all' | 'custom' | 'preset';
  vendorId?: number;
  productId?: number;
  presetName?: string;
}

export interface DeviceStats {
  txBytes: number;
  rxBytes: number;
  txPackets: number;
  rxPackets: number;
  errors: number;
  connectedTime: Date | null;
}

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
  timestampMs?: number;
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

export interface AutoResponderRule {
  id: string;
  name: string;
  enabled: boolean;
  matchType: 'contains_hex' | 'exact_hex' | 'ascii_prefix' | 'always';
  matchValue: string;
  replyHex: string;
  delayMs: number;
  replyEndpoint: number;
  hitCount: number;
}

export interface PeriodicSendConfig {
  enabled: boolean;
  endpoint: number;
  hexData: string;
  intervalMs: number;
  countLimit: number; // 0 = unlimited
  sentCount: number;
  autoIncrementByteIndex?: number; // optionally auto-increment a specific byte
}

export interface UrbPacket {
  id: string;
  urbSeq: number;
  timestamp: string;
  timestampMs: number;
  deltaMs: number;
  transferType: 'CONTROL' | 'BULK' | 'INTERRUPT' | 'ISOCHRONOUS';
  direction: 'IN' | 'OUT';
  endpoint: number;
  length: number;
  status: 'OK' | 'STALL' | 'ERROR' | 'BABBLE';
  data?: Uint8Array;
  hexString?: string;
  asciiString?: string;
  setupPacket?: {
    bmRequestType: number;
    requestType: string;
    recipient: string;
    bRequest: number;
    requestName?: string;
    wValue: number;
    wIndex: number;
    wLength: number;
  };
  setup?: {
    requestType: string;
    recipient: string;
    request: number;
    value: number;
    index: number;
    length?: number;
  };
  summary?: string;
}

export interface DfuStatusInfo {
  status: number;
  statusName: string;
  pollTimeoutMs: number;
  state: number;
  stateName: string;
  iString: number;
}

export interface DfuProgress {
  isFlashing: boolean;
  blockSeq: number;
  totalBlocks: number;
  bytesTransferred: number;
  totalBytes: number;
  percent: number;
  speedKbps: number;
  state: string;
  logMessage: string;
}

export interface HidReportItem {
  offset: number;
  rawBytes: number[];
  type: 'Main' | 'Global' | 'Local' | 'Reserved';
  tag: string;
  tagValue: number;
  size: number;
  dataValue: number;
  decodedText: string;
  level: number;
}

export interface HidParsedReport {
  items: HidReportItem[];
  reportIds: number[];
  totalInputBits: number;
  totalOutputBits: number;
  totalFeatureBits: number;
  collections: {
    name: string;
    type: string;
    usages: string[];
  }[];
}

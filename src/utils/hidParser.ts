import { HidParsedReport, HidReportItem } from '../types';

// HID Item Types
const ITEM_TYPES: Record<number, 'Main' | 'Global' | 'Local' | 'Reserved'> = {
  0: 'Main',
  1: 'Global',
  2: 'Local',
  3: 'Reserved',
};

// Global Item Tags
const GLOBAL_TAGS: Record<number, string> = {
  0: 'Usage Page',
  1: 'Logical Minimum',
  2: 'Logical Maximum',
  3: 'Physical Minimum',
  4: 'Physical Maximum',
  5: 'Unit Exponent',
  6: 'Unit',
  7: 'Report Size',
  8: 'Report ID',
  9: 'Report Count',
  10: 'Push',
  11: 'Pop',
};

// Main Item Tags
const MAIN_TAGS: Record<number, string> = {
  8: 'Input',
  9: 'Output',
  10: 'Collection',
  11: 'Feature',
  12: 'End Collection',
};

// Local Item Tags
const LOCAL_TAGS: Record<number, string> = {
  0: 'Usage',
  1: 'Usage Minimum',
  2: 'Usage Maximum',
  3: 'Designator Index',
  4: 'Designator Minimum',
  5: 'Designator Maximum',
  7: 'String Index',
  8: 'String Minimum',
  9: 'String Maximum',
  10: 'Delimiter',
};

// Usage Pages map
const USAGE_PAGES: Record<number, string> = {
  0x01: 'Generic Desktop Controls',
  0x02: 'Simulation Controls',
  0x03: 'VR Controls',
  0x04: 'Sport Controls',
  0x05: 'Game Controls',
  0x06: 'Generic Device Controls',
  0x07: 'Keyboard/Keypad',
  0x08: 'LEDs',
  0x09: 'Button',
  0x0a: 'Ordinal',
  0x0b: 'Telephony Device',
  0x0c: 'Consumer Devices',
  0x0d: 'Digitizers',
  0x0e: 'Haptics',
  0x20: 'Sensor',
  0xf1d0: 'FIDO Alliance',
  0xff00: 'Vendor Defined (0xFF00)',
};

// Generic Desktop Usages (0x01)
const GENERIC_DESKTOP_USAGES: Record<number, string> = {
  0x01: 'Pointer',
  0x02: 'Mouse',
  0x04: 'Joystick',
  0x05: 'Gamepad',
  0x06: 'Keyboard',
  0x07: 'Keypad',
  0x08: 'Multi-axis Controller',
  0x30: 'X (Direction/Axis)',
  0x31: 'Y (Direction/Axis)',
  0x32: 'Z (Direction/Axis)',
  0x33: 'Rx (Rotation X)',
  0x34: 'Ry (Rotation Y)',
  0x35: 'Rz (Rotation Z)',
  0x36: 'Slider',
  0x37: 'Dial',
  0x38: 'Wheel',
  0x39: 'Hat switch',
  0x3d: 'Start',
  0x3e: 'Select',
  0x80: 'System Control',
  0x81: 'System Power Down',
  0x82: 'System Sleep',
  0x83: 'System Wake Up',
};

// Collection types
const COLLECTION_TYPES: Record<number, string> = {
  0x00: 'Physical (group of axes)',
  0x01: 'Application (mouse, keyboard)',
  0x02: 'Logical (interrelated data)',
  0x03: 'Report',
  0x04: 'Named Array',
  0x05: 'Usage Switch',
  0x06: 'Usage Modifier',
};

export function parseHidReportDescriptor(bytes: Uint8Array): HidParsedReport {
  const items: HidReportItem[] = [];
  const reportIds: number[] = [];
  let totalInputBits = 0;
  let totalOutputBits = 0;
  let totalFeatureBits = 0;
  let currentUsagePage = 0;
  let currentReportSize = 8;
  let currentReportCount = 1;
  let currentReportId = 0;
  let currentLevel = 0;
  const collections: { name: string; type: string; usages: string[] }[] = [];

  let i = 0;
  while (i < bytes.length) {
    const offset = i;
    const header = bytes[i++];
    const bSize = header & 0x03;
    const bType = (header >> 2) & 0x03;
    const bTag = (header >> 4) & 0x0f;

    const dataSize = bSize === 3 ? 4 : bSize;
    let dataValue = 0;
    const rawBytes: number[] = [header];

    for (let s = 0; s < dataSize; s++) {
      if (i < bytes.length) {
        const b = bytes[i++];
        rawBytes.push(b);
        dataValue |= b << (s * 8);
      }
    }

    // Sign extend if necessary for logical minimum etc.
    let signedValue = dataValue;
    if (dataSize === 1 && (dataValue & 0x80)) {
      signedValue = dataValue - 0x100;
    } else if (dataSize === 2 && (dataValue & 0x8000)) {
      signedValue = dataValue - 0x10000;
    }

    const typeName = ITEM_TYPES[bType] || 'Reserved';
    let tagName = `Tag 0x${bTag.toString(16)}`;
    let decodedText = '';

    if (typeName === 'Global') {
      tagName = GLOBAL_TAGS[bTag] || `Global Tag ${bTag}`;
      switch (bTag) {
        case 0: // Usage Page
          currentUsagePage = dataValue;
          const pageName = USAGE_PAGES[dataValue] || (dataValue >= 0xff00 ? 'Vendor Defined' : 'Unknown');
          decodedText = `${pageName} (0x${dataValue.toString(16).toUpperCase()})`;
          break;
        case 1: // Logical Minimum
          decodedText = `${signedValue}`;
          break;
        case 2: // Logical Maximum
          decodedText = `${signedValue}`;
          break;
        case 3: // Physical Minimum
          decodedText = `${signedValue}`;
          break;
        case 4: // Physical Maximum
          decodedText = `${signedValue}`;
          break;
        case 7: // Report Size
          currentReportSize = dataValue;
          decodedText = `${dataValue} bits`;
          break;
        case 8: // Report ID
          currentReportId = dataValue;
          if (!reportIds.includes(dataValue)) reportIds.push(dataValue);
          decodedText = `ID: ${dataValue} (0x${dataValue.toString(16).padStart(2, '0').toUpperCase()})`;
          break;
        case 9: // Report Count
          currentReportCount = dataValue;
          decodedText = `${dataValue} fields`;
          break;
        case 10: // Push
          decodedText = 'Push Global State';
          break;
        case 11: // Pop
          decodedText = 'Pop Global State';
          break;
        default:
          decodedText = `0x${dataValue.toString(16)}`;
      }
    } else if (typeName === 'Local') {
      tagName = LOCAL_TAGS[bTag] || `Local Tag ${bTag}`;
      switch (bTag) {
        case 0: // Usage
          if (currentUsagePage === 0x01) {
            decodedText = GENERIC_DESKTOP_USAGES[dataValue] || `Usage 0x${dataValue.toString(16)}`;
          } else if (currentUsagePage === 0x09) {
            decodedText = `Button ${dataValue}`;
          } else {
            decodedText = `Usage ID: 0x${dataValue.toString(16)}`;
          }
          break;
        case 1: // Usage Min
          decodedText = `Min: 0x${dataValue.toString(16)}`;
          break;
        case 2: // Usage Max
          decodedText = `Max: 0x${dataValue.toString(16)}`;
          break;
        default:
          decodedText = `0x${dataValue.toString(16)}`;
      }
    } else if (typeName === 'Main') {
      tagName = MAIN_TAGS[bTag] || `Main Tag ${bTag}`;
      switch (bTag) {
        case 8: // Input
          totalInputBits += currentReportSize * currentReportCount;
          decodedText = decodeIoFlags(dataValue, currentReportSize * currentReportCount);
          break;
        case 9: // Output
          totalOutputBits += currentReportSize * currentReportCount;
          decodedText = decodeIoFlags(dataValue, currentReportSize * currentReportCount);
          break;
        case 10: // Collection
          currentLevel++;
          const collType = COLLECTION_TYPES[dataValue] || `Type 0x${dataValue.toString(16)}`;
          decodedText = `Collection (${collType})`;
          collections.push({
            name: collType,
            type: collType,
            usages: [],
          });
          break;
        case 11: // Feature
          totalFeatureBits += currentReportSize * currentReportCount;
          decodedText = decodeIoFlags(dataValue, currentReportSize * currentReportCount);
          break;
        case 12: // End Collection
          if (currentLevel > 0) currentLevel--;
          decodedText = 'End Collection';
          break;
        default:
          decodedText = `0x${dataValue.toString(16)}`;
      }
    }

    items.push({
      offset,
      rawBytes,
      type: typeName,
      tag: tagName,
      tagValue: bTag,
      size: dataSize,
      dataValue,
      decodedText,
      level: currentLevel,
    });
  }

  return {
    items,
    reportIds,
    totalInputBits,
    totalOutputBits,
    totalFeatureBits,
    collections,
  };
}

function decodeIoFlags(flags: number, totalBits: number): string {
  const isConstant = (flags & 0x01) !== 0;
  const isVariable = (flags & 0x02) !== 0;
  const isRelative = (flags & 0x04) !== 0;
  const isWrap = (flags & 0x08) !== 0;
  const isNonLinear = (flags & 0x10) !== 0;
  const isNoPreferred = (flags & 0x20) !== 0;
  const hasNull = (flags & 0x40) !== 0;

  const parts = [
    `${totalBits} bits`,
    isConstant ? 'Constant' : 'Data',
    isVariable ? 'Variable' : 'Array',
    isRelative ? 'Relative' : 'Absolute',
  ];
  if (isWrap) parts.push('Wrap');
  if (isNonLinear) parts.push('Non-linear');
  if (hasNull) parts.push('Null State');

  return `(${parts.join(', ')})`;
}

// Built-in real sample descriptors
export const HID_SAMPLE_PRESETS = [
  {
    name: '标准 3 键 USB 鼠标 (Mouse with Wheel)',
    desc: '标准 HID 鼠标描述符：3 个按键、X/Y 相对坐标与滚轮',
    hex: '05 01 09 02 A1 01 09 01 A1 00 05 09 19 01 29 03 15 00 25 01 95 03 75 01 81 02 95 01 75 05 81 01 05 01 09 30 09 31 09 38 15 81 25 7F 75 08 95 03 81 06 C0 C0',
  },
  {
    name: '标准 104 键 USB 键盘 (Keyboard with LEDs)',
    desc: '标准 HID 键盘描述符：8 位修饰键 (Ctrl/Shift/Alt/Win) + 6 键无冲键码 + 5 位 LED 指示灯',
    hex: '05 01 09 06 A1 01 05 07 19 E0 29 E7 15 00 25 01 75 01 95 08 81 02 95 01 75 08 81 01 95 05 75 01 05 08 19 01 29 05 91 02 95 01 75 03 91 01 95 06 75 08 15 00 25 65 05 07 19 00 29 65 81 00 C0',
  },
  {
    name: 'USB 游戏手柄 (Gamepad / Joystick)',
    desc: '包含 16 个按键、双模拟摇杆 (X/Y/Z/Rz) 以及 8 向苦力帽 (Hat Switch)',
    hex: '05 01 09 05 A1 01 09 01 A1 00 05 09 19 01 29 10 15 00 25 01 75 01 95 10 81 02 05 01 09 30 09 31 09 32 09 35 15 00 26 FF 00 75 08 95 04 81 02 09 39 15 01 25 08 75 04 95 01 81 42 C0 C0',
  },
  {
    name: '沁恒 / STM32 自定义 Vendor HID (64-byte Bulk/Interrupt)',
    desc: '自定义免驱动 Vendor 传输报文：64 字节 IN / 64 字节 OUT 双向直通',
    hex: '06 00 FF 09 01 A1 01 09 02 15 00 26 FF 00 75 08 95 40 81 02 09 03 15 00 26 FF 00 75 08 95 40 91 02 C0',
  },
];

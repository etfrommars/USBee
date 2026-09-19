import { DfuStatusInfo } from '../types';

export const DFU_REQUESTS = {
  DETACH: 0x00,
  DNLOAD: 0x01,
  UPLOAD: 0x02,
  GETSTATUS: 0x03,
  CLRSTATUS: 0x04,
  GETSTATE: 0x05,
  ABORT: 0x06,
};

export const DFU_STATES: Record<number, string> = {
  0: 'appIDLE (正常应用运行态)',
  1: 'appDETACH (等待总线复位)',
  2: 'dfuIDLE (DFU 固件引导待机)',
  3: 'dfuDNLOAD_SYNC (下载同步)',
  4: 'dfuDNBUSY (内部 Flash 擦写繁忙)',
  5: 'dfuDNLOAD_IDLE (下载块就绪)',
  6: 'dfuMANIFEST_SYNC (固件重校验同步)',
  7: 'dfuMANIFEST (固件写入校验生效中)',
  8: 'dfuMANIFEST_WAIT_RESET (生效完成，等待重启)',
  9: 'dfuUPLOAD_IDLE (固件回读待机)',
  10: 'dfuERROR (DFU 出错状态)',
};

export const DFU_STATUS_CODES: Record<number, string> = {
  0x00: 'OK (操作正常成功)',
  0x01: 'errTARGET (目标硬件不匹配)',
  0x02: 'errFILE (固件文件格式或校验错误)',
  0x03: 'errWRITE (Flash 写入错误)',
  0x04: 'errERASE (Flash 擦除错误)',
  0x05: 'errCHECK_ERASED (擦除未干净)',
  0x06: 'errPROG (编程编程校验失败)',
  0x07: 'errVERIFY (固件签名或内容校验失败)',
  0x08: 'errADDRESS (目标扇区地址越界)',
  0x09: 'errNOTDONE (写入尚未全部完成)',
  0x0a: 'errFIRMWARE (固件受保护禁止篡改)',
  0x0b: 'errVENDOR (厂商自定义硬件异常)',
  0x0c: 'errUSBR (USB 总线复位失败)',
  0x0d: 'errPOR (上电复位异常)',
  0x0e: 'errUNKNOWN (未知错误)',
  0x0f: 'errSTALLEDPKT (设备停顿数据包)',
};

/**
 * Parses DFU_GETSTATUS 6-byte response packet:
 * Byte 0: bStatus
 * Byte 1..3: bwPollTimeout (24-bit unsigned little-endian)
 * Byte 4: bState
 * Byte 5: iString
 */
export function parseDfuStatus(data: Uint8Array): DfuStatusInfo {
  if (data.length < 6) {
    return {
      status: 0x0e,
      statusName: '数据长度不足 6 字节',
      pollTimeoutMs: 100,
      state: 10,
      stateName: '未知异常',
      iString: 0,
    };
  }

  const bStatus = data[0];
  const bwPollTimeout = data[1] | (data[2] << 8) | (data[3] << 16);
  const bState = data[4];
  const iString = data[5];

  return {
    status: bStatus,
    statusName: DFU_STATUS_CODES[bStatus] || `Status 0x${bStatus.toString(16)}`,
    pollTimeoutMs: Math.max(bwPollTimeout, 10), // minimum 10ms
    state: bState,
    stateName: DFU_STATES[bState] || `State ${bState}`,
    iString,
  };
}

/**
 * Execute DFU_GETSTATUS control transfer
 * bmRequestType = 0xA1 (Device-to-Host, Class, Interface)
 * bRequest = 0x03 (DFU_GETSTATUS)
 * wValue = 0x0000
 * wIndex = interfaceNumber
 * wLength = 6
 */
export async function dfuGetStatus(
  device: USBDevice,
  interfaceNumber: number = 0
): Promise<DfuStatusInfo> {
  const result = await device.controlTransferIn(
    {
      requestType: 'class',
      recipient: 'interface',
      request: DFU_REQUESTS.GETSTATUS,
      value: 0,
      index: interfaceNumber,
    },
    6
  );

  if (result.status !== 'ok' || !result.data) {
    throw new Error(`DFU_GETSTATUS 失败: status = ${result.status}`);
  }

  const bytes = new Uint8Array(result.data.buffer);
  return parseDfuStatus(bytes);
}

/**
 * Execute DFU_CLRSTATUS control transfer
 * bmRequestType = 0x21 (Host-to-Device, Class, Interface)
 * bRequest = 0x04 (DFU_CLRSTATUS)
 */
export async function dfuClearStatus(
  device: USBDevice,
  interfaceNumber: number = 0
): Promise<void> {
  const result = await device.controlTransferOut({
    requestType: 'class',
    recipient: 'interface',
    request: DFU_REQUESTS.CLRSTATUS,
    value: 0,
    index: interfaceNumber,
  });

  if (result.status !== 'ok') {
    throw new Error(`DFU_CLRSTATUS 失败: status = ${result.status}`);
  }
}

/**
 * Execute DFU_ABORT control transfer
 */
export async function dfuAbort(
  device: USBDevice,
  interfaceNumber: number = 0
): Promise<void> {
  const result = await device.controlTransferOut({
    requestType: 'class',
    recipient: 'interface',
    request: DFU_REQUESTS.ABORT,
    value: 0,
    index: interfaceNumber,
  });

  if (result.status !== 'ok') {
    throw new Error(`DFU_ABORT 失败: status = ${result.status}`);
  }
}

/**
 * Execute DFU_DNLOAD block transfer
 * wValue = blockNum (starting from 2 for firmware data, or 0/1 depending on DFU implementation)
 */
export async function dfuDownloadBlock(
  device: USBDevice,
  blockNum: number,
  chunk: Uint8Array,
  interfaceNumber: number = 0
): Promise<void> {
  const result = await device.controlTransferOut(
    {
      requestType: 'class',
      recipient: 'interface',
      request: DFU_REQUESTS.DNLOAD,
      value: blockNum,
      index: interfaceNumber,
    },
    chunk
  );

  if (result.status !== 'ok') {
    throw new Error(`DFU_DNLOAD 块 #${blockNum} 失败: status = ${result.status}`);
  }
}

/**
 * Intel HEX file parser helper
 */
export function parseIntelHex(text: string): Uint8Array {
  const lines = text.split(/\r?\n/);
  const memory: { address: number; data: number[] }[] = [];
  let upperAddress = 0;
  let maxAddress = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(':')) continue;

    const len = parseInt(trimmed.substring(1, 3), 16);
    const addr = parseInt(trimmed.substring(3, 7), 16);
    const type = parseInt(trimmed.substring(7, 9), 16);
    const dataHex = trimmed.substring(9, 9 + len * 2);

    if (type === 0x00) {
      // Data Record
      const fullAddr = upperAddress + addr;
      const bytes: number[] = [];
      for (let i = 0; i < len; i++) {
        bytes.push(parseInt(dataHex.substr(i * 2, 2), 16));
      }
      memory.push({ address: fullAddr, data: bytes });
      if (fullAddr + len > maxAddress) maxAddress = fullAddr + len;
    } else if (type === 0x04) {
      // Extended Linear Address Record
      upperAddress = parseInt(dataHex, 16) << 16;
    } else if (type === 0x01) {
      // End Of File
      break;
    }
  }

  // Flatten into contiguous buffer
  if (memory.length === 0) {
    return new Uint8Array(0);
  }

  const startAddr = memory[0].address;
  const size = maxAddress - startAddr;
  const result = new Uint8Array(size);
  result.fill(0xff); // default flash erased state

  for (const chunk of memory) {
    const offset = chunk.address - startAddr;
    for (let i = 0; i < chunk.data.length; i++) {
      result[offset + i] = chunk.data[i];
    }
  }

  return result;
}

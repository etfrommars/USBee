import { UrbPacket, LogEntry } from '../types';

/**
 * Standard Libpcap file format builder for Wireshark
 * Magic number 0xa1b2c3d4 (Little-Endian microsecond resolution)
 * LinkType: LINKTYPE_USB_2_0 (288) or LINKTYPE_USER0 (147)
 */
export function generatePcapBlob(packets: UrbPacket[]): Blob {
  // Calculate total buffer size
  // Global Header: 24 bytes
  // Each Packet: 16 bytes Packet Header + Packet Data
  let totalDataLength = 24;

  const preparedPackets = packets.map((pkt) => {
    let payload = pkt.data;
    if (!payload && pkt.hexString) {
      // reconstruct if needed
      const cleanHex = pkt.hexString.replace(/[^0-9a-fA-F]/g, '');
      const arr = new Uint8Array(Math.floor(cleanHex.length / 2));
      for (let i = 0; i < arr.length; i++) {
        arr[i] = parseInt(cleanHex.substr(i * 2, 2), 16) || 0;
      }
      payload = arr;
    }
    if (!payload) {
      payload = new Uint8Array(0);
    }

    // Wireshark USB header simulation (USB 2.0 pseudo-header: 32 bytes or direct payload)
    // Here we wrap standard USB request info
    const pktLen = payload.length;
    totalDataLength += 16 + pktLen;
    return {
      pkt,
      payload,
      len: pktLen,
    };
  });

  const buffer = new ArrayBuffer(totalDataLength);
  const view = new DataView(buffer);
  let offset = 0;

  // 1. Global Header (24 bytes)
  view.setUint32(offset, 0xa1b2c3d4, false); // Magic Number (Big-endian marker in little-endian system or direct)
  // Let's use standard native little-endian: 0xa1b2c3d4
  view.setUint32(0, 0xa1b2c3d4, true);
  view.setUint16(4, 2, true); // Version Major (2)
  view.setUint16(6, 4, true); // Version Minor (4)
  view.setInt32(8, 0, true); // ThisZone (GMT / local correction = 0)
  view.setUint32(12, 0, true); // SigFigs (accuracy of timestamps = 0)
  view.setUint32(16, 65535, true); // SnapLen (max length of captured packets)
  // LinkType: 288 is LINKTYPE_USB_2_0, 249 is LINKTYPE_USBPCAP, 147 is DLT_USER0
  view.setUint32(20, 288, true);
  offset = 24;

  // 2. Packet Records
  const startTime = packets.length > 0 ? packets[0].timestampMs : Date.now();

  for (const item of preparedPackets) {
    const tsMs = item.pkt.timestampMs || Date.now();
    const sec = Math.floor(tsMs / 1000);
    const usec = (tsMs % 1000) * 1000;

    // Packet Header (16 bytes)
    view.setUint32(offset, sec, true); // ts_sec
    view.setUint32(offset + 4, usec, true); // ts_usec
    view.setUint32(offset + 8, item.len, true); // incl_len
    view.setUint32(offset + 12, item.len, true); // orig_len
    offset += 16;

    // Payload
    new Uint8Array(buffer, offset, item.len).set(item.payload);
    offset += item.len;
  }

  return new Blob([buffer], { type: 'application/vnd.tcpdump.pcap' });
}

export function downloadPcapFile(packets: UrbPacket[], filename?: string) {
  const blob = generatePcapBlob(packets);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `usb_traffic_capture_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.pcap`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadLogsAsJson(logs: LogEntry[], filename?: string) {
  const jsonStr = JSON.stringify(logs, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `usb_debug_log_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

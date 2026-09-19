import React, { useState } from 'react';
import {
  Cable,
  Power,
  Send,
  RefreshCw,
  Terminal,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import {
  hexToUint8Array,
  bytesToHexString,
  stringToUint8Array,
} from '../utils/usbUtils';

interface SerialDebuggerProps {
  serialPort: any;
  onConnectSerial: (baudRate: number) => Promise<void>;
  onDisconnectSerial: () => Promise<void>;
  onSendSerial: (data: Uint8Array) => Promise<void>;
  onLog: (msg: string, type?: 'TX' | 'RX' | 'SYS' | 'ERR') => void;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export const SerialDebugger: React.FC<SerialDebuggerProps> = ({
  serialPort,
  onConnectSerial,
  onDisconnectSerial,
  onSendSerial,
  onLog,
}) => {
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [inputText, setInputText] = useState<string>('AT\\r\\n');
  const [sendFormat, setSendFormat] = useState<'ascii' | 'hex'>('ascii');

  const isWebSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  const handleConnect = async () => {
    try {
      await onConnectSerial(baudRate);
    } catch (err: any) {
      onLog(`WebSerial 连接取消或失败: ${err.message || err}`, 'ERR');
    }
  };

  const handleSend = async () => {
    if (!serialPort) return;
    let bytes: Uint8Array;
    if (sendFormat === 'hex') {
      bytes = hexToUint8Array(inputText);
    } else {
      // Replace literal \r and \n with actual CR / LF
      const formatted = inputText.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
      bytes = stringToUint8Array(formatted);
    }
    await onSendSerial(bytes);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/80 text-cyan-400 border border-cyan-800 rounded-lg">
            <Cable className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Web Serial 虚拟串口调试器 (USB CDC / UART)
            </h2>
            <p className="text-xs text-slate-400">
              面向 USB 转 TTL 串口、CH340/341、CP210x、Arduino/STM32 虚拟串口通信
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        {serialPort ? (
          <button
            onClick={onDisconnectSerial}
            className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>关闭串口 (Close Port)</span>
          </button>
        ) : (
          <div className="text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-3 py-1 rounded-lg font-medium">
            串口处于关闭状态
          </div>
        )}
      </div>

      {!isWebSerialSupported ? (
        <div className="bg-rose-950/80 border border-rose-800 rounded-xl p-4 text-xs text-rose-300">
          当前浏览器不支持 Web Serial API，请使用 Chrome 或 Edge 访问。
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4 items-end">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 block">
                波特率 (Baud Rate):
              </label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {BAUD_RATES.map((b) => (
                  <option key={b} value={b}>
                    {b} bps
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={!!serialPort}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Cable className="w-4 h-4" />
                <span>
                  {serialPort ? '串口已建立通信' : '搜索并选择串口设备 (WebSerial)'}
                </span>
              </button>
            </div>
          </div>

          {/* Serial Transmitter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                串口数据发送 (TX)
              </label>

              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSendFormat('ascii')}
                  className={`px-2 py-0.5 rounded font-mono cursor-pointer ${
                    sendFormat === 'ascii'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ASCII (字符串)
                </button>
                <button
                  type="button"
                  onClick={() => setSendFormat('hex')}
                  className={`px-2 py-0.5 rounded font-mono cursor-pointer ${
                    sendFormat === 'hex'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  HEX (十六进制)
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  sendFormat === 'ascii' ? '例: AT+RST\\r\\n' : '例: 41 54 0D 0A'
                }
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                disabled={!serialPort}
                onClick={handleSend}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>发送</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

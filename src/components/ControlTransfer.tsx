import React, { useState } from 'react';
import { Sliders, Send, Download, Sparkles, Cpu, Layers } from 'lucide-react';
import { hexToUint8Array, toHex4, toHex2 } from '../utils/usbUtils';

interface ControlTransferProps {
  device: USBDevice | null;
  onControlTransferOut: (
    setup: USBControlTransferParameters,
    data?: Uint8Array
  ) => Promise<USBOutTransferResult | undefined>;
  onControlTransferIn: (
    setup: USBControlTransferParameters,
    length: number
  ) => Promise<USBInTransferResult | undefined>;
}

export const ControlTransfer: React.FC<ControlTransferProps> = ({
  device,
  onControlTransferOut,
  onControlTransferIn,
}) => {
  const [direction, setDirection] = useState<'out' | 'in'>('out');
  const [requestType, setRequestType] = useState<USBRequestType>('vendor');
  const [recipient, setRecipient] = useState<USBRecipient>('device');
  const [requestCode, setRequestCode] = useState<string>('0x01');
  const [value, setValue] = useState<string>('0x0000');
  const [index, setIndex] = useState<string>('0x0000');
  const [payloadHex, setPayloadHex] = useState<string>('00 00 00 00');
  const [expectedLength, setExpectedLength] = useState<number>(64);

  const parseHexNum = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/^0x/i, '').trim();
    return parseInt(clean, 16) || 0;
  };

  const handleExecute = async () => {
    if (!device || !device.opened) return;

    const setup: USBControlTransferParameters = {
      requestType,
      recipient,
      request: parseHexNum(requestCode),
      value: parseHexNum(value),
      index: parseHexNum(index),
    };

    if (direction === 'out') {
      const bytes = hexToUint8Array(payloadHex);
      await onControlTransferOut(setup, bytes);
    } else {
      await onControlTransferIn(setup, expectedLength);
    }
  };

  // Presets for Standard Requests
  const setStandardDeviceDescriptor = () => {
    setDirection('in');
    setRequestType('standard');
    setRecipient('device');
    setRequestCode('0x06'); // GET_DESCRIPTOR
    setValue('0x0100'); // Device Descriptor (Type 1, Index 0)
    setIndex('0x0000');
    setExpectedLength(18);
  };

  const setStandardConfigDescriptor = () => {
    setDirection('in');
    setRequestType('standard');
    setRecipient('device');
    setRequestCode('0x06'); // GET_DESCRIPTOR
    setValue('0x0200'); // Configuration Descriptor (Type 2, Index 0)
    setIndex('0x0000');
    setExpectedLength(64);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-950/80 text-purple-400 border border-purple-800 rounded-lg">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              USB 控制传输调试工作台 (Control Transfers)
            </h2>
            <p className="text-xs text-slate-400">
              面向 EP0 发送底层 Setup Packet 描述符请求与 Vendor 自定义控制指令
            </p>
          </div>
        </div>
      </div>

      {/* Preset standard requests toolbar */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>标准控制传输预设 (Standard USB Control Presets)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={setStandardDeviceDescriptor}
            className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 hover:border-purple-500 text-purple-300 hover:text-purple-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            获取设备描述符 (Get Device Descriptor)
          </button>
          <button
            type="button"
            onClick={setStandardConfigDescriptor}
            className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 hover:border-purple-500 text-purple-300 hover:text-purple-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            获取配置描述符 (Get Configuration Descriptor)
          </button>
        </div>
      </div>

      {/* Control Request Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
        {/* Direction */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 block">
            传输方向 (Direction):
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'out' | 'in')}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="out">OUT (Host → Device 写入控制数据)</option>
            <option value="in">IN (Device → Host 读取控制数据)</option>
          </select>
        </div>

        {/* Request Type */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 block">
            请求类型 (bmRequestType.Type):
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as USBRequestType)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="vendor">vendor (厂商自定义指令 0x40/0xC0)</option>
            <option value="standard">standard (USB 标准请求 0x00/0x80)</option>
            <option value="class">class (类库请求 0x20/0xA0)</option>
          </select>
        </div>

        {/* Recipient */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 block">
            接收对象 (bmRequestType.Recipient):
          </label>
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value as USBRecipient)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="device">device (设备 0x00)</option>
            <option value="interface">interface (接口 0x01)</option>
            <option value="endpoint">endpoint (端点 0x02)</option>
            <option value="other">other (其他 0x03)</option>
          </select>
        </div>

        {/* Request Code */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 block">
            请求代码 (bRequest):
          </label>
          <input
            type="text"
            value={requestCode}
            onChange={(e) => setRequestCode(e.target.value)}
            placeholder="0x01"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Value */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 block">
            参数值 (wValue):
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0x0000"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Index */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 block">
            索引值 (wIndex):
          </label>
          <input
            type="text"
            value={index}
            onChange={(e) => setIndex(e.target.value)}
            placeholder="0x0000"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Payload or Expected Length depending on Direction */}
      <div className="space-y-2">
        {direction === 'out' ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Control OUT 传输数据包 (Hex Payload):
            </label>
            <input
              type="text"
              value={payloadHex}
              onChange={(e) => setPayloadHex(e.target.value)}
              placeholder="01 02 03 04"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Control IN 期望返回的字节数 (Expected Buffer Length):
            </label>
            <input
              type="number"
              min={1}
              max={4096}
              value={expectedLength}
              onChange={(e) => setExpectedLength(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Execute Button */}
      <button
        type="button"
        disabled={!device || !device.opened}
        onClick={handleExecute}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {direction === 'out' ? (
          <>
            <Send className="w-4 h-4" />
            <span>发送 Control OUT 传输指令</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>执行 Control IN 数据读取</span>
          </>
        )}
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Send,
  Download,
  RefreshCcw,
  Plus,
  Play,
  Square,
  Sparkles,
  Zap,
  Sliders,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  BookmarkPlus,
  Radio,
} from 'lucide-react';
import { UsbPresetCommand } from '../types';
import {
  hexToUint8Array,
  bytesToHexString,
  padByteArray,
  stringToUint8Array,
  toHex2,
} from '../utils/usbUtils';

interface DataTransceiverProps {
  device: USBDevice | null;
  claimedInterfaceNumber: number | null;
  onSendBulk: (endpointNumber: number, data: Uint8Array) => Promise<void>;
  onReadBulk: (endpointNumber: number, length: number) => Promise<void>;
  isPolling: boolean;
  onTogglePolling: (endpointNumber: number, intervalMs: number) => void;
  pollingEp: number;
  pollingInterval: number;
  setPollingInterval: (ms: number) => void;
}

const DEFAULT_PRESETS: UsbPresetCommand[] = [
  {
    id: 'p1',
    name: '[0x01] 查询 IO 状态',
    hex: '01 00 00 00',
    description: '查询芯片外设与 IO 电平状态',
    isBuiltIn: true,
  },
  {
    id: 'p2',
    name: '[0x02] 开启受控电源',
    hex: '02 00 00 00',
    description: '控制 MOS / 电源开关通电',
    isBuiltIn: true,
  },
  {
    id: 'p3',
    name: '[0x03] 关断受控电源',
    hex: '03 00 00 00',
    description: '控制 MOS / 电源断电',
    isBuiltIn: true,
  },
  {
    id: 'p4',
    name: '[0x04] 翻转 Debug LED',
    hex: '04 00 00 00',
    description: '翻转板载指示灯 IO 电平',
    isBuiltIn: true,
  },
];

export const DataTransceiver: React.FC<DataTransceiverProps> = ({
  device,
  claimedInterfaceNumber,
  onSendBulk,
  onReadBulk,
  isPolling,
  onTogglePolling,
  pollingEp,
  pollingInterval,
  setPollingInterval,
}) => {
  const [inputFormat, setInputFormat] = useState<'hex' | 'ascii'>('hex');
  const [inputText, setInputText] = useState<string>('01 00 00 00');
  const [selectedEpOut, setSelectedEpOut] = useState<number>(2);
  const [selectedEpIn, setSelectedEpIn] = useState<number>(2);
  const [paddingSize, setPaddingSize] = useState<number>(64);
  const [readLength, setReadLength] = useState<number>(64);

  // Custom user presets state
  const [presets, setPresets] = useState<UsbPresetCommand[]>(DEFAULT_PRESETS);
  const [newCmdName, setNewCmdName] = useState<string>('');
  const [newCmdHex, setNewCmdHex] = useState<string>('');
  const [showAddPresetModal, setShowAddPresetModal] = useState<boolean>(false);

  // Parse current device endpoints
  const activeConfig = device?.configuration;
  const currentIface = activeConfig?.interfaces.find(
    (i) => i.interfaceNumber === (claimedInterfaceNumber ?? 0)
  );
  const endpoints = currentIface?.alternates[0]?.endpoints || [];

  const outEndpoints = endpoints.filter((e) => e.direction === 'out');
  const inEndpoints = endpoints.filter((e) => e.direction === 'in');

  // Handle Send Data
  const handleSend = async () => {
    let bytes: Uint8Array;
    if (inputFormat === 'hex') {
      bytes = hexToUint8Array(inputText);
    } else {
      bytes = stringToUint8Array(inputText);
    }

    if (paddingSize > 0 && bytes.length < paddingSize) {
      bytes = padByteArray(bytes, paddingSize);
    }

    await onSendBulk(selectedEpOut, bytes);
  };

  // Handle Send Preset Command
  const handleSendPreset = async (preset: UsbPresetCommand) => {
    let bytes = hexToUint8Array(preset.hex);
    if (paddingSize > 0 && bytes.length < paddingSize) {
      bytes = padByteArray(bytes, paddingSize);
    }
    await onSendBulk(selectedEpOut, bytes);
  };

  // Add Custom Preset
  const handleAddPreset = () => {
    if (!newCmdName.trim() || !newCmdHex.trim()) return;
    const newPreset: UsbPresetCommand = {
      id: Date.now().toString(),
      name: newCmdName.trim(),
      hex: newCmdHex.trim(),
      isBuiltIn: false,
    };
    setPresets([...presets, newPreset]);
    setNewCmdName('');
    setNewCmdHex('');
    setShowAddPresetModal(false);
  };

  // Delete Custom Preset
  const handleDeletePreset = (id: string) => {
    setPresets(presets.filter((p) => p.id !== id));
  };

  const isInterfaceReady = device && device.opened && claimedInterfaceNumber !== null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 text-indigo-400 border border-indigo-800 rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Bulk / Interrupt 端点数据收发器
            </h2>
            <p className="text-xs text-slate-400">
              面向 EP OUT 端点发送硬件控制数据指令，面向 EP IN 端点读取/轮询通信响应
            </p>
          </div>
        </div>

        {!isInterfaceReady && (
          <div className="px-3 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-lg text-xs font-medium">
            提示: 需先在设备卡片中点击「声明接口」方可发送数据
          </div>
        )}
      </div>

      {/* Endpoint selectors bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
        {/* OUT Endpoint Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-sky-400" />
            <span>发送目标端点 (Endpoint OUT / Host → Device):</span>
          </label>
          <select
            value={selectedEpOut}
            onChange={(e) => setSelectedEpOut(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {outEndpoints.length > 0 ? (
              outEndpoints.map((ep) => (
                <option key={ep.endpointNumber} value={ep.endpointNumber}>
                  EP {ep.endpointNumber} (0x
                  {ep.endpointNumber.toString(16).padStart(2, '0').toUpperCase()}) - {ep.type} (Max {ep.packetSize}B)
                </option>
              ))
            ) : (
              <option value={2}>EP 2 (默认 0x02 Bulk OUT)</option>
            )}
          </select>
        </div>

        {/* IN Endpoint Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>接收监听端点 (Endpoint IN / Device → Host):</span>
          </label>
          <select
            value={selectedEpIn}
            onChange={(e) => setSelectedEpIn(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {inEndpoints.length > 0 ? (
              inEndpoints.map((ep) => (
                <option key={ep.endpointNumber} value={ep.endpointNumber}>
                  EP {ep.endpointNumber} (0x
                  {ep.endpointNumber.toString(16).padStart(2, '0').toUpperCase()}) - {ep.type} (Max {ep.packetSize}B)
                </option>
              ))
            ) : (
              <option value={2}>EP 2 (默认 0x82 Bulk IN)</option>
            )}
          </select>
        </div>
      </div>

      {/* Preset Command Buttons Toolbar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>常用指令快捷预设工具栏 (Quick Presets Toolbar)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddPresetModal(!showAddPresetModal)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加自定义预设指令</span>
          </button>
        </div>

        {/* Preset buttons grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presets.map((p) => (
            <div key={p.id} className="relative group">
              <button
                type="button"
                disabled={!isInterfaceReady}
                onClick={() => handleSendPreset(p)}
                className="w-full p-2.5 bg-slate-950/70 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 hover:border-indigo-500 rounded-xl text-left transition-all cursor-pointer space-y-0.5"
              >
                <div className="font-bold text-xs text-slate-200 truncate flex items-center justify-between">
                  <span>{p.name}</span>
                </div>
                <div className="text-[10px] font-mono text-indigo-400 truncate">
                  Payload: {p.hex}
                </div>
              </button>
              {!p.isBuiltIn && (
                <button
                  onClick={() => handleDeletePreset(p.id)}
                  className="absolute top-1 right-1 p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="删除预设"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add custom preset form drawer */}
        {showAddPresetModal && (
          <div className="bg-slate-950 border border-indigo-900/80 rounded-xl p-3.5 space-y-3">
            <div className="text-xs font-bold text-slate-200">
              添加快捷调试指令 (Save Custom Preset)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="指令名称 (例: 复位芯片)"
                value={newCmdName}
                onChange={(e) => setNewCmdName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <input
                type="text"
                placeholder="Hex 内容 (例: FF 00 A1 02)"
                value={newCmdHex}
                onChange={(e) => setNewCmdHex(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddPresetModal(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleAddPreset}
                className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 cursor-pointer"
              >
                保存预设
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Data Transmitter Panel */}
      <div className="space-y-3 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            自定义数据包发送 (Send Payload Out)
          </label>
          <div className="flex items-center gap-3 text-xs">
            {/* Input format toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setInputFormat('hex')}
                className={`px-2 py-0.5 rounded font-mono font-medium cursor-pointer ${
                  inputFormat === 'hex'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HEX
              </button>
              <button
                type="button"
                onClick={() => setInputFormat('ascii')}
                className={`px-2 py-0.5 rounded font-mono font-medium cursor-pointer ${
                  inputFormat === 'ascii'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ASCII 文本
              </button>
            </div>

            {/* Auto Padding Selector */}
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span>自动填充补零:</span>
              <select
                value={paddingSize}
                onChange={(e) => setPaddingSize(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-[11px] font-mono"
              >
                <option value={0}>不填充 (原样发)</option>
                <option value={16}>补满 16 字节</option>
                <option value={64}>补满 64 字节 (标准 Bulk)</option>
                <option value={512}>补满 512 字节</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input Text Box & Send Button */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              inputFormat === 'hex'
                ? '输入十六进制数据 (例: 01 02 03 04 或 0x01,0x02)'
                : '输入 ASCII 字符串 (例: AT+RST)'
            }
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-xs"
          />
          <button
            type="button"
            disabled={!isInterfaceReady}
            onClick={handleSend}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>发送 (TX)</span>
          </button>
        </div>
      </div>

      {/* Endpoint IN Reader & Continuous Polling Manager */}
      <div className="space-y-3 border-t border-slate-800 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>EP IN 接收与自动轮询管理器 (Polling Engine)</span>
          </label>

          <div className="flex items-center gap-3">
            {/* Polling Interval Selector */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <span>轮询间隔:</span>
              <input
                type="number"
                min={10}
                max={2000}
                step={10}
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 text-center"
              />
              <span>ms</span>
            </div>

            {/* Toggle Polling Button */}
            <button
              type="button"
              disabled={!isInterfaceReady}
              onClick={() => onTogglePolling(selectedEpIn, pollingInterval)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPolling
                  ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-xs'
              }`}
            >
              {isPolling ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>停止连续接收轮询</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>开启 EP IN 连续轮询接收</span>
                </>
              )}
            </button>

            {/* Manual Single Read IN Button */}
            <button
              type="button"
              disabled={!isInterfaceReady}
              onClick={() => onReadBulk(selectedEpIn, readLength)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>手动读取一次 (Read 64B)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

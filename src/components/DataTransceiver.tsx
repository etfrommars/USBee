import React, { useState, useEffect } from 'react';
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
  Clock,
  Repeat,
  Bot,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { UsbPresetCommand, AutoResponderRule } from '../types';
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
  // Periodic sending
  isPeriodicSending: boolean;
  periodicSentCount: number;
  onTogglePeriodicSend: (
    endpoint: number,
    data: Uint8Array,
    intervalMs: number,
    countLimit: number,
    autoIncrement: boolean
  ) => void;
  // Auto-responder rules
  autoResponderRules: AutoResponderRule[];
  onUpdateAutoResponderRules: (rules: AutoResponderRule[]) => void;
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
  isPeriodicSending,
  periodicSentCount,
  onTogglePeriodicSend,
  autoResponderRules,
  onUpdateAutoResponderRules,
}) => {
  const [inputFormat, setInputFormat] = useState<'hex' | 'ascii'>('hex');
  const [inputText, setInputText] = useState<string>('01 00 00 00');
  const [selectedEpOut, setSelectedEpOut] = useState<number>(2);
  const [selectedEpIn, setSelectedEpIn] = useState<number>(2);
  const [paddingSize, setPaddingSize] = useState<number>(64);
  const [readLength, setReadLength] = useState<number>(64);

  // Periodic send configuration
  const [periodicInterval, setPeriodicInterval] = useState<number>(200);
  const [periodicCountLimit, setPeriodicCountLimit] = useState<number>(0);
  const [periodicAutoInc, setPeriodicAutoInc] = useState<boolean>(false);

  // Custom user presets state
  const [presets, setPresets] = useState<UsbPresetCommand[]>(DEFAULT_PRESETS);
  const [newCmdName, setNewCmdName] = useState<string>('');
  const [newCmdHex, setNewCmdHex] = useState<string>('');
  const [showAddPresetModal, setShowAddPresetModal] = useState<boolean>(false);

  // Auto responder modal state
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);
  const [newRuleName, setNewRuleName] = useState<string>('');
  const [newRuleMatch, setNewRuleMatch] = useState<string>('AA 55');
  const [newRuleReply, setNewRuleReply] = useState<string>('55 AA 01 00');
  const [newRuleDelay, setNewRuleDelay] = useState<number>(0);

  // Parse current device endpoints
  const activeConfig = device?.configuration;
  const currentIface = activeConfig?.interfaces.find(
    (i) => i.interfaceNumber === (claimedInterfaceNumber ?? 0)
  );
  const endpoints = currentIface?.alternates[0]?.endpoints || [];

  const outEndpoints = endpoints.filter((e) => e.direction === 'out');
  const inEndpoints = endpoints.filter((e) => e.direction === 'in');

  // Auto-set endpoint defaults if available
  useEffect(() => {
    if (outEndpoints.length > 0 && !outEndpoints.some((e) => e.endpointNumber === selectedEpOut)) {
      setSelectedEpOut(outEndpoints[0].endpointNumber);
    }
    if (inEndpoints.length > 0 && !inEndpoints.some((e) => e.endpointNumber === selectedEpIn)) {
      setSelectedEpIn(inEndpoints[0].endpointNumber);
    }
  }, [endpoints]);

  // Handle Send Data
  const getPreparedBytes = (): Uint8Array => {
    let bytes: Uint8Array;
    if (inputFormat === 'hex') {
      bytes = hexToUint8Array(inputText);
    } else {
      bytes = stringToUint8Array(inputText);
    }

    if (paddingSize > 0 && bytes.length < paddingSize) {
      bytes = padByteArray(bytes, paddingSize);
    }
    return bytes;
  };

  const handleSend = async () => {
    const bytes = getPreparedBytes();
    await onSendBulk(selectedEpOut, bytes);
  };

  const handleTogglePeriodic = () => {
    const bytes = getPreparedBytes();
    onTogglePeriodicSend(
      selectedEpOut,
      bytes,
      periodicInterval,
      periodicCountLimit,
      periodicAutoInc
    );
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

  // Toggle Auto-responder rule
  const handleToggleRule = (ruleId: string) => {
    onUpdateAutoResponderRules(
      autoResponderRules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r
      )
    );
  };

  // Delete Auto-responder rule
  const handleDeleteRule = (ruleId: string) => {
    onUpdateAutoResponderRules(autoResponderRules.filter((r) => r.id !== ruleId));
  };

  // Add Auto-responder rule
  const handleAddRule = () => {
    if (!newRuleName.trim() || !newRuleReply.trim()) return;
    const rule: AutoResponderRule = {
      id: Date.now().toString(),
      name: newRuleName.trim(),
      enabled: true,
      matchType: 'contains_hex',
      matchValue: newRuleMatch.trim(),
      replyHex: newRuleReply.trim(),
      delayMs: Number(newRuleDelay) || 0,
      replyEndpoint: selectedEpOut,
      hitCount: 0,
    };
    onUpdateAutoResponderRules([...autoResponderRules, rule]);
    setNewRuleName('');
    setNewRuleMatch('');
    setNewRuleReply('');
    setShowAddRuleModal(false);
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
              Bulk / Interrupt 端点数据收发器 (Transceiver & Auto-Responder)
            </h2>
            <p className="text-xs text-slate-400">
              支持单次/定时自动发送、连续轮询接收、端点特征识别与智能自动应答规则引擎
            </p>
          </div>
        </div>

        {!isInterfaceReady && (
          <div className="px-3 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-lg text-xs font-medium">
            提示: 需先在设备卡片中点击「声明接口」方可传输数据
          </div>
        )}
      </div>

      {/* Endpoint selectors bar with transfer type and maxPacketSize */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
        {/* OUT Endpoint Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-sky-400" />
              <span>发送端点 (EP OUT):</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {outEndpoints.length > 0
                ? `${outEndpoints.length} 个可用发送端点`
                : '未扫描到 OUT 端点'}
            </span>
          </div>

          <select
            value={selectedEpOut}
            onChange={(e) => setSelectedEpOut(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {outEndpoints.length === 0 ? (
              <option value={selectedEpOut}>EP {selectedEpOut} (默认)</option>
            ) : (
              outEndpoints.map((ep) => (
                <option key={ep.endpointNumber} value={ep.endpointNumber}>
                  EP {ep.endpointNumber} (0x{ep.endpointNumber.toString(16).padStart(2, '0').toUpperCase()}) - [{ep.type.toUpperCase()}] 包长: {ep.packetSize}B
                </option>
              ))
            )}
          </select>
        </div>

        {/* IN Endpoint Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <span>接收端点 (EP IN):</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {inEndpoints.length > 0
                ? `${inEndpoints.length} 个可用接收端点`
                : '未扫描到 IN 端点'}
            </span>
          </div>

          <select
            value={selectedEpIn}
            onChange={(e) => setSelectedEpIn(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {inEndpoints.length === 0 ? (
              <option value={selectedEpIn}>EP {selectedEpIn} (默认)</option>
            ) : (
              inEndpoints.map((ep) => (
                <option key={ep.endpointNumber} value={ep.endpointNumber}>
                  EP {ep.endpointNumber} (0x{ep.endpointNumber.toString(16).padStart(2, '0').toUpperCase()}) - [{ep.type.toUpperCase()}] 包长: {ep.packetSize}B
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Preset Command Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>常用快速测试指令库 (One-Click Presets)</span>
          </label>
          <button
            onClick={() => setShowAddPresetModal(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增预设</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 flex flex-col justify-between gap-2 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {preset.name}
                  </span>
                  {!preset.isBuiltIn && (
                    <button
                      onClick={() => setPresets(presets.filter((p) => p.id !== preset.id))}
                      className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] font-mono text-indigo-400 truncate mt-1">
                  {preset.hex}
                </p>
                {preset.description && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {preset.description}
                  </p>
                )}
              </div>

              <button
                disabled={!isInterfaceReady}
                onClick={() => handleSendPreset(preset)}
                className="w-full py-1.5 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800 disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>立即发送</span>
              </button>
            </div>
          ))}
        </div>

        {/* Add Preset Modal */}
        {showAddPresetModal && (
          <div className="bg-slate-950 border border-indigo-900/60 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <BookmarkPlus className="w-4 h-4" />
              <span>添加自定义 USB 发送预设</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="预设名称 (如: 读取传感器参数)"
                value={newCmdName}
                onChange={(e) => setNewCmdName(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="HEX 序列 (如: 05 01 00 00)"
                value={newCmdHex}
                onChange={(e) => setNewCmdHex(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
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

      {/* Manual Data Transmitter & Timed Periodic Sending */}
      <div className="space-y-3 border-t border-slate-800 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            数据包发送与定时循环 (Send Payload & Periodic Transmitter)
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
              <span>自动补零:</span>
              <select
                value={paddingSize}
                onChange={(e) => setPaddingSize(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-[11px] font-mono"
              >
                <option value={0}>不填充</option>
                <option value={16}>补满 16 字节</option>
                <option value={64}>补满 64 字节 (标准 Bulk)</option>
                <option value={512}>补满 512 字节</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input Text Box & Send Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
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
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>单次发送 (TX)</span>
          </button>
        </div>

        {/* Periodic Sending Control Bar */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>定时循环发送:</span>
            </span>

            {/* Interval */}
            <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
              <span>周期:</span>
              <input
                type="number"
                min={20}
                max={10000}
                step={50}
                value={periodicInterval}
                onChange={(e) => setPeriodicInterval(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-center"
              />
              <span>ms</span>
            </div>

            {/* Count Limit */}
            <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
              <span>次数:</span>
              <input
                type="number"
                min={0}
                max={10000}
                value={periodicCountLimit}
                onChange={(e) => setPeriodicCountLimit(Number(e.target.value))}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-center"
                title="设置为 0 表示无限循环持续发送"
              />
              <span className="text-[10px] text-slate-400">(0=无限)</span>
            </div>

            {/* Auto increment checkbox */}
            <label className="flex items-center gap-1.5 text-slate-400 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={periodicAutoInc}
                onChange={(e) => setPeriodicAutoInc(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>首字节累加 (Counter)</span>
            </label>
          </div>

          {/* Start/Stop Periodic Button */}
          <div className="flex items-center gap-3">
            {isPeriodicSending && (
              <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                已发送: {periodicSentCount} 次
              </span>
            )}
            <button
              type="button"
              disabled={!isInterfaceReady}
              onClick={handleTogglePeriodic}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isPeriodicSending
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white'
              }`}
            >
              {isPeriodicSending ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>停止定时发送</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>启动定时发送</span>
                </>
              )}
            </button>
          </div>
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

      {/* Auto-Responder Rule Engine */}
      <div className="space-y-3 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-amber-400" />
            <span>智能自动应答规则引擎 (Auto-Responder Engine)</span>
          </label>
          <button
            onClick={() => setShowAddRuleModal(true)}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加应答规则</span>
          </button>
        </div>

        {autoResponderRules.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-400">
            暂无配置应答规则，点击上方「添加应答规则」可在收到指定 HEX 指令时自动触发回复
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {autoResponderRules.map((rule) => (
              <div
                key={rule.id}
                className={`border rounded-xl p-3 space-y-2 transition-all ${
                  rule.enabled
                    ? 'bg-slate-950/80 border-slate-700 shadow-xs'
                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className="cursor-pointer text-slate-400 hover:text-slate-200"
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <span className="font-bold text-slate-200">{rule.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      触发 {rule.hitCount} 次
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900 border border-slate-800 rounded p-1.5">
                    <span className="text-slate-400 block text-[9px]">匹配条件 (RX)</span>
                    <span className="text-indigo-300 font-bold truncate block">{rule.matchValue}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded p-1.5">
                    <span className="text-slate-400 block text-[9px]">自动回复 (TX &rarr; EP {rule.replyEndpoint})</span>
                    <span className="text-amber-300 font-bold truncate block">{rule.replyHex}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Rule Modal */}
        {showAddRuleModal && (
          <div className="bg-slate-950 border border-amber-900/60 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              <span>新增智能自动应答规则</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                placeholder="规则名称 (如: Ping 自动回包)"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="RX 匹配条件 HEX (如: AA 55)"
                value={newRuleMatch}
                onChange={(e) => setNewRuleMatch(e.target.value)}
                className="bg-slate-900 border border-slate-700 font-mono text-slate-200 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="TX 自动响应 HEX (如: 55 AA 01 00)"
                value={newRuleReply}
                onChange={(e) => setNewRuleReply(e.target.value)}
                className="bg-slate-900 border border-slate-700 font-mono text-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">应答延迟:</span>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={newRuleDelay}
                  onChange={(e) => setNewRuleDelay(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 text-slate-200 text-center rounded px-2 py-0.5 text-xs font-mono"
                />
                <span className="text-slate-400">ms</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleAddRule}
                  className="px-3 py-1 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-500 cursor-pointer"
                >
                  添加规则
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

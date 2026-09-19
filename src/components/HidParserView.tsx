import React, { useState } from 'react';
import {
  FileCode2,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Download,
  Copy,
  Check,
  Cpu,
  Info,
} from 'lucide-react';
import { parseHidReportDescriptor, HID_SAMPLE_PRESETS } from '../utils/hidParser';
import { HidParsedReport } from '../types';
import { hexToUint8Array } from '../utils/usbUtils';

interface HidParserViewProps {
  device: USBDevice | null;
  onLog: (msg: string, type?: 'SYS' | 'ERR') => void;
}

export const HidParserView: React.FC<HidParserViewProps> = ({ device, onLog }) => {
  const [hexInput, setHexInput] = useState<string>(HID_SAMPLE_PRESETS[0].hex);
  const [parsedReport, setParsedReport] = useState<HidParsedReport>(() =>
    parseHidReportDescriptor(hexToUint8Array(HID_SAMPLE_PRESETS[0].hex))
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [isReadingFromDevice, setIsReadingFromDevice] = useState<boolean>(false);

  const handleParse = (hexText: string) => {
    try {
      const bytes = hexToUint8Array(hexText);
      const parsed = parseHidReportDescriptor(bytes);
      setParsedReport(parsed);
    } catch (err: any) {
      onLog(`HID 解析错误: ${err.message}`, 'ERR');
    }
  };

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIdx(idx);
    const preset = HID_SAMPLE_PRESETS[idx];
    setHexInput(preset.hex);
    handleParse(preset.hex);
  };

  // Read Report Descriptor directly from connected USB Device via Control Transfer
  // bmRequestType: 0x81 (Device-to-Host, Standard, Interface)
  // bRequest: 0x06 (GET_DESCRIPTOR)
  // wValue: 0x2200 (Descriptor Type 0x22: HID Report, Index 0x00)
  // wIndex: interfaceNumber (typically 0)
  const handleReadFromDevice = async () => {
    if (!device || !device.opened) {
      onLog('读取失败: USB 设备未连接或未打开', 'ERR');
      return;
    }

    setIsReadingFromDevice(true);
    try {
      onLog('正在向 USB 接口发送 GET_DESCRIPTOR (HID Report 0x2200) 控制传输请求...', 'SYS');
      const result = await device.controlTransferIn(
        {
          requestType: 'standard',
          recipient: 'interface',
          request: 0x06, // GET_DESCRIPTOR
          value: (0x22 << 8) | 0x00, // Descriptor Type 0x22 (HID Report), Index 0
          index: 0, // Interface 0
        },
        512 // expected max length
      );

      if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
        const bytes = new Uint8Array(result.data.buffer);
        const hexStr = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(' ');
        setHexInput(hexStr);
        handleParse(hexStr);
        onLog(`成功读取到设备物理 HID 报告描述符 (${bytes.length} 字节)!`, 'SYS');
      } else {
        onLog(
          `设备未返回 HID 报告描述符 (可能该设备不是标准 HID 类别，或接口编号不同)`,
          'ERR'
        );
      }
    } catch (err: any) {
      onLog(`读取 HID 报告描述符失败: ${err.message}`, 'ERR');
    } finally {
      setIsReadingFromDevice(false);
    }
  };

  const handleCopyHex = () => {
    navigator.clipboard.writeText(hexInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-lg">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                USB HID 报告描述符解析器 (HID Report Parser)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-bold">
                HID 1.11 标准
              </span>
            </div>
            <p className="text-xs text-slate-400">
              深度逐项解析 Global / Local / Main 标签、Usage Pages、按键位图与报文结构
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {device && device.opened && (
            <button
              onClick={handleReadFromDevice}
              disabled={isReadingFromDevice}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isReadingFromDevice ? '正在读取...' : '从当前连接设备读取'}</span>
            </button>
          )}

          <button
            onClick={handleCopyHex}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制' : '复制 HEX'}</span>
          </button>
        </div>
      </div>

      {/* Preset selector bar */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>常用硬件标准 HID 描述符预设模版</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {HID_SAMPLE_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(idx)}
              className={`p-2.5 text-left rounded-lg border text-xs transition-all cursor-pointer ${
                selectedPresetIdx === idx
                  ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-xs'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="font-bold truncate">{preset.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hex Input Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-300 flex items-center gap-1.5">
            <span>HEX 字节流 (支持空格或逗号分隔，如 05 01 09 02 A1 01...)</span>
          </label>
          <span className="font-mono text-slate-400">
            {hexToUint8Array(hexInput).length} 字节
          </span>
        </div>
        <div className="relative">
          <textarea
            rows={3}
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value);
              handleParse(e.target.value);
            }}
            placeholder="粘贴 HID 报告描述符十六进制数据..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 block">输入报文 (Input)</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-1 block">
            {parsedReport.totalInputBits} bits ({Math.ceil(parsedReport.totalInputBits / 8)} 字节)
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 block">输出报文 (Output)</span>
          <span className="text-sm font-bold font-mono text-sky-400 mt-1 block">
            {parsedReport.totalOutputBits} bits ({Math.ceil(parsedReport.totalOutputBits / 8)} 字节)
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 block">特征报文 (Feature)</span>
          <span className="text-sm font-bold font-mono text-purple-400 mt-1 block">
            {parsedReport.totalFeatureBits} bits ({Math.ceil(parsedReport.totalFeatureBits / 8)} 字节)
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 block">解析条目数量</span>
          <span className="text-sm font-bold font-mono text-amber-400 mt-1 block">
            {parsedReport.items.length} 个条目
          </span>
        </div>
      </div>

      {/* Item-by-item Decoded Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>逐项语义解构明细表 (Decoded Items Breakdown)</span>
          </label>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70">
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 text-[11px] text-slate-400 z-10">
                <tr>
                  <th className="py-2 px-3">偏移</th>
                  <th className="py-2 px-3">原始 HEX</th>
                  <th className="py-2 px-3">类型</th>
                  <th className="py-2 px-3">标签 (Tag)</th>
                  <th className="py-2 px-3">语义解析含义 (Decoded Value)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {parsedReport.items.map((item, idx) => {
                  const typeColor =
                    item.type === 'Global'
                      ? 'text-sky-400 bg-sky-950/60 border-sky-800'
                      : item.type === 'Local'
                      ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                      : 'text-emerald-400 bg-emerald-950/60 border-emerald-800';

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-800/40 transition-colors"
                      style={{ paddingLeft: `${item.level * 16}px` }}
                    >
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        0x{item.offset.toString(16).padStart(2, '0').toUpperCase()}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-200">
                        {item.rawBytes
                          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                          .join(' ')}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeColor}`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        <div style={{ marginLeft: `${item.level * 12}px` }}>
                          {item.level > 0 && <span className="text-slate-400 mr-1">↳</span>}
                          {item.tag}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-indigo-300">
                        {item.decodedText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

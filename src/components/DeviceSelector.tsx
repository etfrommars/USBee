import React, { useState, useEffect } from 'react';
import {
  Usb,
  Search,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  ExternalLink,
  Power,
  Trash2,
} from 'lucide-react';
import { FilterConfig } from '../types';
import { toHex4, getVendorName } from '../utils/usbUtils';

interface DeviceSelectorProps {
  currentDevice: USBDevice | null;
  pairedDevices: USBDevice[];
  onSelectDevice: (filter: FilterConfig) => Promise<void>;
  onConnectExistingDevice: (device: USBDevice) => Promise<void>;
  onDisconnectDevice: () => Promise<void>;
  onForgetDevice?: (device: USBDevice) => void;
  onLog: (msg: string, type?: 'SYS' | 'ERR') => void;
  isInIframe: boolean;
}

const PRESET_DEVICES = [
  {
    name: '沁恒 CH554 Vendor Bulk 固件',
    vid: 0x3344,
    pid: 0x1122,
    desc: '自定义 64 字节 Endpoint Bulk 收发测试固件',
  },
  {
    name: '沁恒 CH340 / CH341 串口',
    vid: 0x1a86,
    pid: 0x7523,
    desc: '常见 USB 转 TTL 串口芯片',
  },
  {
    name: '意法半导体 STM32 Virtual COM / DFU',
    vid: 0x0483,
    pid: undefined,
    desc: 'STM32 全系列 USB HID/Bulk/CDC 设备',
  },
  {
    name: '乐鑫 ESP32 USB JTAG / CDC',
    vid: 0x303a,
    pid: undefined,
    desc: 'ESP32-S2/S3/C3 内置 USB 控制器',
  },
  {
    name: 'Arduino 全系列开发板',
    vid: 0x2341,
    pid: undefined,
    desc: 'Arduino Uno / Nano / Mega / Leonardo',
  },
  {
    name: '树莓派 Raspberry Pi Pico (RP2040)',
    vid: 0x2e8a,
    pid: undefined,
    desc: 'RP2040 微控制器 USB CDC/Vendor 设备',
  },
];

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  currentDevice,
  pairedDevices,
  onSelectDevice,
  onConnectExistingDevice,
  onDisconnectDevice,
  onForgetDevice,
  onLog,
  isInIframe,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'preset' | 'custom'>('all');
  const [customVid, setCustomVid] = useState<string>('');
  const [customPid, setCustomPid] = useState<string>('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  // Handle request device button click - Step 1: Search all connected USB devices with no PID/VID filters
  const handleRequestDevice = async () => {
    setIsRequesting(true);
    try {
      // Empty filters array -> Search ALL connected USB devices in browser popup
      const config: FilterConfig = { mode: 'all' };
      await onSelectDevice(config);
    } catch (err: any) {
      onLog(`选择设备取消或失败: ${err.message || err}`, 'ERR');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Usb className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">
              第一步：搜索并刷选所有 USB 设备
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            不需要绑定 PID / VID，点击按钮即可通过 WebUSB 搜索电脑连接的所有 USB 硬件
          </p>
        </div>

        {currentDevice && (
          <button
            onClick={onDisconnectDevice}
            className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>断开当前 USB 连接</span>
          </button>
        )}
      </div>

      {/* Primary iFrame Notice if running in preview iframe */}
      {isInIframe && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>重要提示：浏览器 Preview 内框安全规则</span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            因 Chrome 浏览器安全策略限制，嵌合框架 (iFrame) 中可能拦截硬件 USB 弹窗。
            如果点击下方按钮后无反应或提示权限被拒绝，请点击下方按钮在<strong>新标签页中独立打开应用</strong>：
          </p>
          <div className="pt-1">
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-colors shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>在新标签页独立打开 (开启原生 USB 访问)</span>
            </a>
          </div>
        </div>
      )}

      {/* Main Single-Button Action Bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>通用 USB 设备搜索与授权 (无需 PID/VID)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Main Request Device Button */}
          <button
            type="button"
            disabled={isRequesting}
            onClick={handleRequestDevice}
            className="sm:col-span-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>
              {isRequesting ? '正在请求浏览器弹窗...' : '搜索所有已连接的 USB 设备'}
            </span>
          </button>

          {/* Refresh Paired Devices List Button */}
          <button
            type="button"
            onClick={async () => {
              try {
                const devs = await navigator.usb.getDevices();
                onLog(`已重新刷新获取授权设备列表，找到 ${devs.length} 个已授权 USB 设备`, 'SYS');
              } catch (e: any) {
                onLog(`刷新授权设备失败: ${e.message || e}`, 'ERR');
              }
            }}
            className="py-3 px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Usb className="w-4 h-4 text-indigo-400" />
            <span>仅刷新授权列表</span>
          </button>
        </div>
      </div>

      {/* Paired / Discovered Devices List */}
      <div className="border-t border-slate-800 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              搜索到的已授权 USB 设备 ({pairedDevices.length})
            </h3>
          </div>
        </div>

        {pairedDevices.length === 0 ? (
          <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-5 text-center text-xs text-slate-400 space-y-1.5">
            <p className="font-semibold text-slate-300">尚未选中任何 USB 设备</p>
            <p className="text-[11px] text-slate-500">
              请点击上方的【搜索所有已连接的 USB 设备】按钮，在浏览器弹窗中选中您插在电脑上的硬件设备。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pairedDevices.map((dev, idx) => {
              const isSelected =
                currentDevice &&
                currentDevice.vendorId === dev.vendorId &&
                currentDevice.productId === dev.productId &&
                currentDevice.serialNumber === dev.serialNumber;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-950/60 border-2 border-indigo-500 text-slate-100 shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="space-y-1 overflow-hidden min-w-0">
                    <div className="flex items-center gap-2">
                      <Usb className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className="font-bold text-xs text-slate-100 truncate">
                        {dev.productName || '未知 USB 设备'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span className="text-indigo-400 font-bold">VID: {toHex4(dev.vendorId)}</span>
                      <span className="text-indigo-400 font-bold">PID: {toHex4(dev.productId)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {dev.manufacturerName ? `厂商: ${dev.manufacturerName}` : getVendorName(dev.vendorId)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isSelected ? (
                      <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded-md text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>已连接</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onConnectExistingDevice(dev)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                      >
                        连接此设备
                      </button>
                    )}

                    {onForgetDevice && (
                      <button
                        type="button"
                        onClick={() => onForgetDevice(dev)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-md transition-colors cursor-pointer"
                        title="在界面列表中移除此设备"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

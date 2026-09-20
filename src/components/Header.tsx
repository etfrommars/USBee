import React from 'react';
import {
  Usb,
  ExternalLink,
  HelpCircle,
  Activity,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Github,
} from 'lucide-react';

interface HeaderProps {
  device: USBDevice | null;
  onOpenHelp: () => void;
  onRefreshDevices: () => void;
  isInIframe: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  device,
  onOpenHelp,
  onRefreshDevices,
  isInIframe,
}) => {
  const isWebUsbSupported = typeof navigator !== 'undefined' && 'usb' in navigator;

  return (
    <header className="bg-slate-900 border-b border-slate-800 shadow-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand logo & title */}
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-lg flex items-center justify-center shadow-md">
            <Usb className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>USBee</span>
                <span className="text-xs font-normal text-slate-400">| USB 通用调试上位机</span>
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 rounded-full">
                WebUSB
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              支持全量 USB 设备发现、端点 Bulk/Interrupt 收发与控制传输调试
            </p>
          </div>
        </div>

        {/* Right side status indicators and buttons */}
        <div className="flex items-center space-x-3">
          {/* Active status pill */}
          <div className="flex items-center px-1 rounded-full text-xs font-medium">
            {device && device.opened ? (
              <span className="flex items-center text-emerald-400 bg-emerald-950/70 px-3 py-1.5 rounded-full border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2" />
                USB 已连接 ({device.productName || 'USB Device'})
              </span>
            ) : (
              <span className="flex items-center text-amber-400 bg-amber-950/70 px-3 py-1.5 rounded-full border border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500/80 mr-2" />
                等待选择 USB 设备
              </span>
            )}
          </div>

          <button
            onClick={onRefreshDevices}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 text-xs flex items-center gap-1.5 font-medium shadow-xs cursor-pointer"
            title="刷新已连接/记忆的设备列表"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">刷新设备</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 rounded-lg transition-colors border border-indigo-700/60 text-xs flex items-center gap-1.5 font-medium shadow-xs cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>排错与指南</span>
          </button>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/etfrommars/USBee"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 rounded-lg transition-colors border border-slate-700 text-xs flex items-center gap-1.5 font-medium shadow-xs"
            title="访问 GitHub 开源项目仓库 (https://github.com/etfrommars/USBee)"
          >
            <Github className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline font-mono">GitHub</span>
          </a>

          {isInIframe && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              title="部分浏览器在嵌入式 iFrame 中会限制 WebUSB 弹窗权限，新标签页打开可保证正常弹窗"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>在新标签页打开</span>
            </a>
          )}
        </div>
      </div>

      {/* API compatibility warning banner if WebUSB is not available in browser */}
      {!isWebUsbSupported && (
        <div className="bg-rose-950/90 border-t border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>
            当前浏览器不支持 WebUSB API！请使用 <strong>Google Chrome</strong> 或 <strong>Microsoft Edge</strong> 最新版本访问以体验完整 USB 调试功能。
          </span>
        </div>
      )}
    </header>
  );
};

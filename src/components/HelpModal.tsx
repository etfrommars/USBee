import React from 'react';
import {
  X,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Cpu,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInIframe: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  isInIframe,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">
              USB 设备搜索与连接排错指南
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Question 1: Why empty device list? */}
          <section className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>为什么点击「连接/搜索」后，列表里什么设备都没有？</span>
            </div>
            <p className="text-slate-400 pl-7">
              这是因为浏览器（Chrome/Edge）在请求 WebUSB 硬件时，如果应用了特定芯片（如 VID/PID）的过滤条件，而您的设备不是该特定硬件，列表就会显示“找不到匹配的设备”。
            </p>
            <div className="pl-7 pt-1 text-indigo-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>解决方案：选定「全量无限制搜索」模式即可在弹窗中显示电脑插上的全部 USB 设备！</span>
            </div>
          </section>

          {/* Question 2: iFrame permission issues */}
          {isInIframe && (
            <section className="bg-amber-950/60 border border-amber-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-200 text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">
                  2
                </span>
                <span>在 AI Studio 预览框内未弹出系统 USB 授权窗口？</span>
              </div>
              <p className="text-amber-300/90 pl-7">
                浏览器出于安全规范，限制第三方嵌合框架 (iFrame) 直接唤起 USB 硬件底层的原生访问弹窗。
              </p>
              <div className="pl-7 pt-1">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-500 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>点击在新标签页 (独立窗口) 中打开运行</span>
                </a>
              </div>
            </section>
          )}

          {/* Question 3: Windows Zadig Driver instruction */}
          <section className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                3
              </span>
              <span>Windows 系统下的驱动准备 (WinUSB / Zadig)</span>
            </div>
            <p className="text-slate-400 pl-7">
              在 Windows 系统下，WebUSB 通信要求设备绑定的驱动为 <strong className="text-slate-200">WinUSB (libusb)</strong>。如果您使用的是 CH554 Vendor Bulk 自定义设备：
            </p>
            <ol className="list-decimal pl-12 text-slate-400 space-y-1">
              <li>下载免费驱动配置工具 Zadig (zadig.akeo.ie)</li>
              <li>在 Zadig 中勾选 Options → List All Devices</li>
              <li>下拉框选择您的 USB 设备，驱动类型选择 <strong className="text-slate-200">WinUSB (v6.1.7600.16385)</strong></li>
              <li>点击 Replace Driver 完成安装，即可流畅进行 WebUSB 数据收发！</li>
            </ol>
          </section>

          {/* Question 4: Linux udev rules */}
          <section className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                4
              </span>
              <span>Linux / Ubuntu 系统权限配置</span>
            </div>
            <p className="text-slate-400 pl-7">
              Linux 用户若遇免驱动权限不足拒绝访问，请在 `/etc/udev/rules.d/99-usb.rules` 中添加 udev 规则：
            </p>
            <pre className="bg-slate-900 border border-slate-700 rounded p-2 text-[11px] font-mono text-indigo-300 ml-7 overflow-x-auto">
              {"SUBSYSTEM==\"usb\", ATTR{idVendor}==\"3344\", MODE=\"0666\""}
            </pre>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
          >
            我已知晓，开始调试
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Cpu,
  Info,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Unlock,
  Lock,
} from 'lucide-react';
import { toHex4, toHex2, getVendorName } from '../utils/usbUtils';

interface DeviceInfoCardProps {
  device: USBDevice | null;
  claimedInterfaceNumber: number | null;
  onClaimInterface: (interfaceNum: number) => Promise<void>;
  onReleaseInterface: () => Promise<void>;
}

export const DeviceInfoCard: React.FC<DeviceInfoCardProps> = ({
  device,
  claimedInterfaceNumber,
  onClaimInterface,
  onReleaseInterface,
}) => {
  const [selectedInterface, setSelectedInterface] = useState<number>(0);

  if (!device) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 space-y-2 shadow-sm">
        <Cpu className="w-8 h-8 text-slate-500 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-200">未选择 USB 硬件设备</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          请在左侧「USB 设备发现中心」点击搜索并选择想要连接调试的 USB 硬件。
        </p>
      </div>
    );
  }

  const activeConfig = device.configuration;
  const interfaces = activeConfig ? activeConfig.interfaces : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                {device.productName || '通用 USB 设备'}
              </h2>
              {device.opened ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  已打开 (Opened)
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800 rounded-full">
                  未打开
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {device.manufacturerName || getVendorName(device.vendorId)}
            </p>
          </div>
        </div>

        {/* Claim/Release button */}
        <div className="flex items-center gap-2">
          {claimedInterfaceNumber !== null ? (
            <button
              onClick={onReleaseInterface}
              className="px-3.5 py-1.5 bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>释放接口 (#{claimedInterfaceNumber})</span>
            </button>
          ) : (
            <button
              onClick={() => onClaimInterface(selectedInterface)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>声明接口 #{selectedInterface}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of specifications */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            厂商 ID (VID)
          </span>
          <span className="text-xs font-mono font-bold text-indigo-400">
            {toHex4(device.vendorId)}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            产品 ID (PID)
          </span>
          <span className="text-xs font-mono font-bold text-indigo-400">
            {toHex4(device.productId)}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            USB 协议版本
          </span>
          <span className="text-xs font-mono font-bold text-slate-200">
            v{device.usbVersionMajor}.{device.usbVersionMinor}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            序列号 (SN)
          </span>
          <span className="text-xs font-mono font-medium text-slate-300 truncate block">
            {device.serialNumber || 'N/A'}
          </span>
        </div>
      </div>

      {/* Interfaces & Endpoints Inspector */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>USB 接口 (Interfaces) 与端点 (Endpoints) 明细</span>
          </label>
          <span className="text-[11px] font-mono text-slate-500">
            Configuration: #{activeConfig ? activeConfig.configurationValue : 1}
          </span>
        </div>

        {interfaces.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
            未能识别到有效的 USB 接口列表
          </div>
        ) : (
          <div className="space-y-3">
            {/* Interface Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {interfaces.map((iface) => {
                const isClaimed = claimedInterfaceNumber === iface.interfaceNumber;
                const isCurrent = selectedInterface === iface.interfaceNumber;

                return (
                  <button
                    key={iface.interfaceNumber}
                    onClick={() => setSelectedInterface(iface.interfaceNumber)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>Interface #{iface.interfaceNumber}</span>
                    {isClaimed && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Endpoints Detail Table for Selected Interface */}
            {interfaces.find((i) => i.interfaceNumber === selectedInterface) && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                  <span>
                    接口 #{selectedInterface} 端点列表 (Endpoints):
                  </span>
                  {claimedInterfaceNumber === selectedInterface ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 已声明 (Claimed)
                    </span>
                  ) : (
                    <span className="text-slate-500">未声明 (Unclaimed)</span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-1.5 px-2">端点地址</th>
                        <th className="py-1.5 px-2">传输方向</th>
                        <th className="py-1.5 px-2">传输类型</th>
                        <th className="py-1.5 px-2">最大包长</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {interfaces
                        .find((i) => i.interfaceNumber === selectedInterface)
                        ?.alternates[0]?.endpoints.map((ep, eIdx) => (
                          <tr key={eIdx} className="hover:bg-slate-800/40">
                            <td className="py-2 px-2 font-bold text-indigo-400">
                              EP {ep.endpointNumber} (0x{ep.endpointNumber.toString(16).padStart(2, '0').toUpperCase()})
                            </td>
                            <td className="py-2 px-2">
                              {ep.direction === 'out' ? (
                                <span className="inline-flex items-center gap-1 text-sky-300 bg-sky-950/70 border border-sky-800 px-2 py-0.5 rounded text-[11px]">
                                  <ArrowUpRight className="w-3 h-3 text-sky-400" /> OUT (Host → Device)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded text-[11px]">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" /> IN (Device → Host)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-slate-300 capitalize">
                              {ep.type}
                            </td>
                            <td className="py-2 px-2 text-indigo-300 font-bold">
                              {ep.packetSize} Bytes
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

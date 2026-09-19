import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Download,
  Trash2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  FileCode,
  Layers,
  Sparkles,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { UrbPacket } from '../types';
import { downloadPcapFile } from '../utils/pcapUtils';

interface UrbSnifferViewProps {
  packets: UrbPacket[];
  onClearPackets: () => void;
  isSniffing: boolean;
  onToggleSniffing: () => void;
}

export const UrbSnifferView: React.FC<UrbSnifferViewProps> = ({
  packets,
  onClearPackets,
  isSniffing,
  onToggleSniffing,
}) => {
  const [selectedPkt, setSelectedPkt] = useState<UrbPacket | null>(null);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'CONTROL' | 'BULK' | 'INTERRUPT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const tableEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && tableEndRef.current) {
      tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [packets, autoScroll]);

  // Filter logic
  const filteredPackets = packets.filter((pkt) => {
    if (filterDirection !== 'ALL' && pkt.direction !== filterDirection) return false;
    if (filterType !== 'ALL' && pkt.transferType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSummary = pkt.summary.toLowerCase().includes(q);
      const matchHex = pkt.hexString?.toLowerCase().includes(q);
      const matchAscii = pkt.asciiString?.toLowerCase().includes(q);
      return matchSummary || matchHex || matchAscii;
    }
    return true;
  });

  const handleExportPcap = () => {
    downloadPcapFile(packets);
  };

  const handleCopyHex = (hex?: string) => {
    if (!hex) return;
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-950/80 text-indigo-400 border border-indigo-800 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                USB 传输报文抓包与 URB 深度解析器 (URB Packet Sniffer)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full font-bold">
                {packets.length} 帧已捕获
              </span>
            </div>
            <p className="text-xs text-slate-400">
              捕获底层 USB Request Block (URB)、控制传输 Setup 结构解析，支持导出 Wireshark PCAP
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSniffing}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
              isSniffing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSniffing ? 'bg-white animate-ping' : 'bg-slate-500'
              }`}
            />
            <span>{isSniffing ? '正在实时抓包中' : '继续抓包'}</span>
          </button>

          <button
            onClick={handleExportPcap}
            disabled={packets.length === 0}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="生成标准二进制 Libpcap 格式，可直接在 Wireshark 中打开进行 USB 协议树分析"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 Wireshark (.pcap)</span>
          </button>

          <button
            onClick={onClearPackets}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 rounded-lg text-xs transition-colors border border-slate-700 cursor-pointer"
            title="清空当前所有抓包记录"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> 方向:
          </span>
          {(['ALL', 'IN', 'OUT'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setFilterDirection(dir)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                filterDirection === dir
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {dir}
            </button>
          ))}

          <span className="text-slate-400 font-semibold ml-2">类型:</span>
          {(['ALL', 'CONTROL', 'BULK', 'INTERRUPT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索 HEX / 描述文本..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Split View: Packet List + Deep URB Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Packet Stream Table */}
        <div className="lg:col-span-7 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80 flex flex-col h-[420px]">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 text-[11px] text-slate-400 z-10">
                <tr>
                  <th className="py-2 px-3">序号</th>
                  <th className="py-2 px-3">时间 / Δt</th>
                  <th className="py-2 px-3">端点</th>
                  <th className="py-2 px-3">传输类型</th>
                  <th className="py-2 px-3">长度</th>
                  <th className="py-2 px-3">摘要 / 状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredPackets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                      暂无捕获到的 USB 报文，点击上方收发器或脚本运行即可触发捕获
                    </td>
                  </tr>
                ) : (
                  filteredPackets.map((pkt) => {
                    const isSelected = selectedPkt?.id === pkt.id;
                    const dirColor =
                      pkt.direction === 'IN'
                        ? 'text-emerald-400 bg-emerald-950/70 border-emerald-800'
                        : 'text-sky-400 bg-sky-950/70 border-sky-800';

                    return (
                      <tr
                        key={pkt.id}
                        onClick={() => setSelectedPkt(pkt)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/80 border-l-2 border-indigo-500'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-400 text-[11px]">
                          #{pkt.urbSeq}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[10px]">
                          <div>{pkt.timestamp}</div>
                          <div className="text-[9px] text-slate-400">+{pkt.deltaMs}ms</div>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${dirColor}`}
                          >
                            {pkt.direction === 'IN' ? (
                              <ArrowDownLeft className="w-2.5 h-2.5" />
                            ) : (
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            )}
                            EP {pkt.endpoint}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px] font-semibold text-slate-200">
                          {pkt.transferType}
                        </td>
                        <td className="py-2 px-3 text-indigo-300 font-bold text-[11px]">
                          {pkt.length} B
                        </td>
                        <td className="py-2 px-3 truncate max-w-[180px] text-[11px] text-slate-300">
                          {pkt.summary}
                        </td>
                      </tr>
                    );
                  })
                )}
                <div ref={tableEndRef} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected URB Inspector */}
        <div className="lg:col-span-5 border border-slate-800 rounded-xl p-4 bg-slate-950/90 h-[420px] overflow-y-auto space-y-4">
          {selectedPkt ? (
            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-300">
                    URB #{selectedPkt.urbSeq} 帧明细
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {selectedPkt.status}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyHex(selectedPkt.hexString)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? '已复制' : '复制 HEX'}</span>
                </button>
              </div>

              {/* URB Fields */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900 border border-slate-800 rounded p-2">
                  <span className="text-slate-400 block text-[10px]">传输方向</span>
                  <span className="font-bold text-slate-200">{selectedPkt.direction} (EP {selectedPkt.endpoint})</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded p-2">
                  <span className="text-slate-400 block text-[10px]">传输模式</span>
                  <span className="font-bold text-slate-200">{selectedPkt.transferType}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded p-2">
                  <span className="text-slate-400 block text-[10px]">有效载荷长度</span>
                  <span className="font-bold text-indigo-400">{selectedPkt.length} 字节</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded p-2">
                  <span className="text-slate-400 block text-[10px]">相对前帧时延 (Δt)</span>
                  <span className="font-bold text-slate-200">{selectedPkt.deltaMs} ms</span>
                </div>
              </div>

              {/* Setup Packet (if Control Transfer) */}
              {selectedPkt.setupPacket && (
                <div className="bg-slate-900 border border-indigo-950 rounded-lg p-3 space-y-2">
                  <div className="font-bold text-indigo-400 flex items-center gap-1.5 text-[11px]">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>USB Setup Packet (8 字节标准结构解构)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                    <div>bmRequestType: <span className="text-slate-100 font-bold">0x{selectedPkt.setupPacket.bmRequestType.toString(16).padStart(2, '0')}</span> ({selectedPkt.setupPacket.requestType}/{selectedPkt.setupPacket.recipient})</div>
                    <div>bRequest: <span className="text-slate-100 font-bold">0x{selectedPkt.setupPacket.bRequest.toString(16).padStart(2, '0')}</span> ({selectedPkt.setupPacket.requestName || 'Custom'})</div>
                    <div>wValue: <span className="text-slate-100 font-bold">0x{selectedPkt.setupPacket.wValue.toString(16).padStart(4, '0')}</span></div>
                    <div>wIndex: <span className="text-slate-100 font-bold">0x{selectedPkt.setupPacket.wIndex.toString(16).padStart(4, '0')}</span></div>
                    <div className="col-span-2">wLength: <span className="text-indigo-400 font-bold">{selectedPkt.setupPacket.wLength} 字节</span></div>
                  </div>
                </div>
              )}

              {/* HEX Dump */}
              <div className="space-y-1.5">
                <span className="text-slate-400 text-[10px] font-bold block">
                  数据载荷转储 (HEX Dump):
                </span>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[11px] text-indigo-300 font-mono break-all leading-relaxed max-h-[140px] overflow-y-auto">
                  {selectedPkt.hexString || '(无数据载荷，纯状态握手)'}
                </div>
              </div>

              {/* ASCII view */}
              {selectedPkt.asciiString && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[10px] font-bold block">
                    ASCII 字符串视窗:
                  </span>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[11px] text-emerald-300 font-mono break-all leading-relaxed">
                    {selectedPkt.asciiString}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 p-6">
              <FileCode className="w-8 h-8 text-slate-600" />
              <p className="text-xs">点击左侧任意抓包记录，查看其完整 URB 协议头、Setup 结构与十六进制转储</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

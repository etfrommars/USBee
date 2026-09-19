import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Info,
  Lock,
  Unlock,
  Sliders,
  Copy,
  Check,
  Activity,
} from 'lucide-react';
import { LogEntry, DeviceStats } from '../types';
import { bytesToHexString, bytesToAsciiString, formatHexAndAscii } from '../utils/usbUtils';

interface ConsoleLogProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  stats: DeviceStats;
}

export const ConsoleLog: React.FC<ConsoleLogProps> = ({
  logs,
  onClearLogs,
  stats,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'TX' | 'RX' | 'ERR' | 'CTRL'>('ALL');
  const [displayMode, setDisplayMode] = useState<'HEX' | 'ASCII' | 'MIXED'>('MIXED');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'ALL' && log.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchHex = log.hexString?.toLowerCase().includes(q);
      const matchAscii = log.asciiString?.toLowerCase().includes(q);
      return matchMsg || matchHex || matchAscii;
    }
    return true;
  });

  // Export logs to TXT
  const handleExportText = () => {
    const textContent = logs
      ? logs
          .map((l) => `[${l.timestamp}] [${l.type}] ${l.message}`)
          .join('\n')
      : '';
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usb_debug_log_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy single line log
  const handleCopyLine = (log: LogEntry) => {
    const str = `[${log.timestamp}] [${log.type}] ${log.message}`;
    navigator.clipboard.writeText(str);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Console Title & Top Stats Ticker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-lg">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                实时通讯数据日志控制台 (Communication Console)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-950 text-emerald-400 border border-slate-800 rounded-full font-bold">
                {filteredLogs.length} 条数据
              </span>
            </div>
            <p className="text-xs text-slate-400">
              精确捕获底层 USB / Serial 数据包细节，支持十六进制与 ASCII 解析对比
            </p>
          </div>
        </div>

        {/* Live Statistics Ticker */}
        <div className="flex items-center gap-3 text-xs font-mono bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 self-start md:self-auto">
          <div className="flex items-center gap-1 text-sky-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>TX: {stats.txBytes} B ({stats.txPackets}包)</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>RX: {stats.rxBytes} B ({stats.rxPackets}包)</span>
          </div>
          {stats.errors > 0 && (
            <>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-rose-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ERR: {stats.errors}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Control & Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3">
        {/* Filter type buttons */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 text-[11px] mr-1 hidden sm:inline">过滤:</span>
          {(['ALL', 'TX', 'RX', 'ERR', 'CTRL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                filterType === t
                  ? t === 'TX'
                    ? 'bg-sky-600 text-white'
                    : t === 'RX'
                    ? 'bg-emerald-600 text-white'
                    : t === 'ERR'
                    ? 'bg-rose-600 text-white'
                    : t === 'CTRL'
                    ? 'bg-purple-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Display mode buttons (HEX / ASCII / MIXED) */}
        <div className="flex items-center gap-1 text-xs bg-slate-900 p-1 rounded-lg border border-slate-700">
          <span className="text-slate-500 text-[10px] px-1 font-mono">模式:</span>
          <button
            onClick={() => setDisplayMode('HEX')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
              displayMode === 'HEX' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HEX
          </button>
          <button
            onClick={() => setDisplayMode('ASCII')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
              displayMode === 'ASCII' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ASCII
          </button>
          <button
            onClick={() => setDisplayMode('MIXED')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
              displayMode === 'MIXED' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HEX + ASCII
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索十六进制或文本日志..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Console Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300 font-bold'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
            title={autoScroll ? '锁定自动滚屏' : '已暂停自动滚屏'}
          >
            {autoScroll ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Export */}
          <button
            onClick={handleExportText}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="导出日志为 TXT 文件"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={onClearLogs}
            className="p-1.5 bg-slate-900 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            title="清空控制台"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Window */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs h-80 overflow-y-auto space-y-1.5 shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            [SYS] 控制台暂无调试日志。发送或接收 USB 数据包后将实时滚动在此处...
          </div>
        ) : (
          filteredLogs.map((log) => {
            let colorClass = 'text-slate-300';
            if (log.type === 'TX') colorClass = 'text-sky-400';
            else if (log.type === 'RX') colorClass = 'text-emerald-400';
            else if (log.type === 'ERR') colorClass = 'text-rose-400 font-bold';
            else if (log.type === 'CTRL') colorClass = 'text-purple-400';
            else if (log.type === 'SYS') colorClass = 'text-amber-300/80';

            // Format representation according to displayMode
            let displayDataStr = log.message;
            if (log.data && log.data.length > 0) {
              if (displayMode === 'HEX') {
                displayDataStr = `${log.type} [${log.data.length}B]: ${bytesToHexString(log.data)}`;
              } else if (displayMode === 'ASCII') {
                displayDataStr = `${log.type} [${log.data.length}B]: ${bytesToAsciiString(log.data)}`;
              } else {
                displayDataStr = `${log.type} [${log.data.length}B]: ${formatHexAndAscii(log.data)}`;
              }
            }

            return (
              <div
                key={log.id}
                className="group flex items-start justify-between gap-2 hover:bg-slate-800/60 p-1 rounded transition-colors"
              >
                <div className="flex items-start gap-2 min-w-0 break-all leading-relaxed">
                  <span className="text-slate-500 text-[11px] flex-shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span className={`font-bold flex-shrink-0 ${colorClass}`}>
                    [{log.type}]
                  </span>
                  <span className={colorClass}>{displayDataStr}</span>
                </div>

                <button
                  onClick={() => handleCopyLine(log)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-200 transition-opacity flex-shrink-0 cursor-pointer"
                  title="复制此行"
                >
                  {copiedId === log.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};

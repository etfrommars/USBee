import React, { useState, useRef } from 'react';
import {
  Cpu,
  UploadCloud,
  FileUp,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  dfuGetStatus,
  dfuClearStatus,
  dfuAbort,
  dfuDownloadBlock,
  parseIntelHex,
  DFU_STATES,
  DFU_STATUS_CODES,
} from '../utils/dfuUtils';
import { DfuStatusInfo, DfuProgress } from '../types';

interface DfuFlasherViewProps {
  device: USBDevice | null;
  claimedInterfaceNumber: number | null;
  onLog: (msg: string, type?: 'SYS' | 'ERR' | 'CTRL') => void;
}

export const DfuFlasherView: React.FC<DfuFlasherViewProps> = ({
  device,
  claimedInterfaceNumber,
  onLog,
}) => {
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [blockSize, setBlockSize] = useState<number>(512);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [dfuStatus, setDfuStatus] = useState<DfuStatusInfo | null>(null);
  const [progress, setProgress] = useState<DfuProgress>({
    isFlashing: false,
    blockSeq: 0,
    totalBlocks: 0,
    bytesTransferred: 0,
    totalBytes: 0,
    percent: 0,
    speedKbps: 0,
    state: '就绪',
    logMessage: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File loading
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      if (typeof buffer === 'string') {
        // Intel Hex file
        const parsed = parseIntelHex(buffer);
        setFileData(parsed);
        onLog(`已成功载入并解析 Intel HEX 固件文件 (${parsed.length} 字节)`, 'SYS');
      } else if (buffer instanceof ArrayBuffer) {
        // Raw binary
        const bytes = new Uint8Array(buffer);
        setFileData(bytes);
        onLog(`已成功载入二进制固件镜像 (${bytes.length} 字节)`, 'SYS');
      }
    };

    if (file.name.toLowerCase().endsWith('.hex')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  // Read DFU Status
  const handleGetStatus = async () => {
    if (isSimulated) {
      setDfuStatus({
        status: 0x00,
        statusName: 'OK (操作正常成功)',
        pollTimeoutMs: 50,
        state: 2,
        stateName: 'dfuIDLE (DFU 固件引导待机)',
        iString: 0,
      });
      onLog('【模拟模式】读取 DFU_GETSTATUS: state=dfuIDLE, status=OK', 'SYS');
      return;
    }

    if (!device || !device.opened) {
      onLog('读取失败: USB 设备未连接或未打开', 'ERR');
      return;
    }

    try {
      const status = await dfuGetStatus(device, claimedInterfaceNumber ?? 0);
      setDfuStatus(status);
      onLog(
        `DFU_GETSTATUS 响应: ${status.stateName} | ${status.statusName} (超时: ${status.pollTimeoutMs}ms)`,
        'CTRL'
      );
    } catch (err: any) {
      onLog(`获取 DFU 状态失败: ${err.message}`, 'ERR');
    }
  };

  // Clear Status
  const handleClearStatus = async () => {
    if (isSimulated) {
      onLog('【模拟模式】DFU_CLRSTATUS 执行成功', 'SYS');
      handleGetStatus();
      return;
    }

    if (!device || !device.opened) return;
    try {
      await dfuClearStatus(device, claimedInterfaceNumber ?? 0);
      onLog('成功发送 DFU_CLRSTATUS 清除异常状态', 'CTRL');
      await handleGetStatus();
    } catch (err: any) {
      onLog(`DFU_CLRSTATUS 失败: ${err.message}`, 'ERR');
    }
  };

  // Execute Flashing
  const handleStartFlashing = async () => {
    if (!fileData || fileData.length === 0) {
      onLog('刷写中止: 请先上传有效 .bin / .hex 固件文件', 'ERR');
      return;
    }

    if (!isSimulated && (!device || !device.opened)) {
      onLog('刷写中止: USB 设备未连接', 'ERR');
      return;
    }

    const totalBytes = fileData.length;
    const totalBlocks = Math.ceil(totalBytes / blockSize);

    setProgress({
      isFlashing: true,
      blockSeq: 0,
      totalBlocks,
      bytesTransferred: 0,
      totalBytes,
      percent: 0,
      speedKbps: 0,
      state: '正在擦除扇区并同步 DFU 下载握手...',
      logMessage: '',
    });

    onLog(
      `启动 USB DFU 固件写入: 总大小 ${totalBytes} 字节，分块大小 ${blockSize} 字节，共 ${totalBlocks} 块`,
      'SYS'
    );

    const startTime = Date.now();

    try {
      // DFU block numbers typically start from 2 according to DFU 1.1 spec
      for (let blockIdx = 0; blockIdx < totalBlocks; blockIdx++) {
        const offset = blockIdx * blockSize;
        const chunk = fileData.slice(offset, offset + blockSize);
        const wBlockNum = blockIdx + 2;

        if (isSimulated) {
          // Simulation delay
          await new Promise((res) => setTimeout(res, 25));
        } else if (device) {
          await dfuDownloadBlock(device, wBlockNum, chunk, claimedInterfaceNumber ?? 0);
        }

        const bytesSent = Math.min(offset + chunk.length, totalBytes);
        const elapsedSec = (Date.now() - startTime) / 1000 || 0.001;
        const speed = Math.round((bytesSent / 1024) / elapsedSec);
        const pct = Math.round((bytesSent / totalBytes) * 100);

        setProgress({
          isFlashing: true,
          blockSeq: blockIdx + 1,
          totalBlocks,
          bytesTransferred: bytesSent,
          totalBytes,
          percent: pct,
          speedKbps: speed,
          state: `正在写入 Block #${wBlockNum} (${pct}%)...`,
          logMessage: `已传输 ${bytesSent}/${totalBytes} 字节 (${speed} KB/s)`,
        });
      }

      // Send 0-length download packet to indicate end of download according to DFU spec
      if (!isSimulated && device) {
        await dfuDownloadBlock(
          device,
          totalBlocks + 2,
          new Uint8Array(0),
          claimedInterfaceNumber ?? 0
        );
      }

      setProgress((prev) => ({
        ...prev,
        isFlashing: false,
        percent: 100,
        state: '固件烧录已圆满完成！设备正在重启加载新固件...',
        logMessage: '写入校验 100% 成功，DFU 退出完成。',
      }));

      onLog('USB DFU 固件刷写全部完成！设备正在重置生效', 'SYS');
    } catch (err: any) {
      setProgress((prev) => ({
        ...prev,
        isFlashing: false,
        state: `写入中断错误: ${err.message}`,
      }));
      onLog(`固件刷写遇到异常: ${err.message}`, 'ERR');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-950/80 text-purple-400 border border-purple-800 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                USB DFU 固件升级与烧录 (Device Firmware Upgrade)
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 rounded-full font-bold">
                DFU 1.1 协议
              </span>
            </div>
            <p className="text-xs text-slate-400">
              符合 USB-IF DFU 1.1 规范的在线固件更新协议，支持 Block 分块下载与校验
            </p>
          </div>
        </div>

        {/* Simulation Mode Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <input
              type="checkbox"
              checked={isSimulated}
              onChange={(e) => setIsSimulated(e.target.checked)}
              className="accent-purple-500 rounded"
            />
            <span className="text-slate-300 font-medium">仿真测试演示模式</span>
          </label>
        </div>
      </div>

      {/* DFU Status Card */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>当前设备 DFU 引导状态机 (DFU State Machine)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGetStatus}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>查询状态 (GETSTATUS)</span>
            </button>
            <button
              onClick={handleClearStatus}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-semibold cursor-pointer"
            >
              清除状态 (CLRSTATUS)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400 text-[10px] block">当前运行状态 (bState)</span>
            <span className="font-bold text-purple-300 mt-1 block">
              {dfuStatus ? dfuStatus.stateName : '未查询 (点击右上方查询)'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400 text-[10px] block">状态错误码 (bStatus)</span>
            <span className="font-bold text-emerald-400 mt-1 block">
              {dfuStatus ? dfuStatus.statusName : 'OK / 未知'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400 text-[10px] block">建议轮询等待 (bwPollTimeout)</span>
            <span className="font-bold text-slate-200 mt-1 block">
              {dfuStatus ? `${dfuStatus.pollTimeoutMs} ms` : '50 ms (默认)'}
            </span>
          </div>
        </div>
      </div>

      {/* Firmware File Uploader & Block Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* File Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="md:col-span-2 border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/60"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".bin,.hex,.dfu"
            onChange={handleFileChange}
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 text-purple-400 mb-2" />
          <div className="text-xs font-bold text-slate-200">
            {fileName ? fileName : '点击选择或拖拽固件文件至此 (.bin / .hex / .dfu)'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {fileData
              ? `固件有效数据尺寸: ${fileData.length} 字节 (${(fileData.length / 1024).toFixed(1)} KB)`
              : '支持标准 Intel HEX 格式与纯二进制 Bin 固件文件'}
          </div>
        </div>

        {/* Flashing Parameters */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              分块大小 (Block Size):
            </label>
            <select
              value={blockSize}
              onChange={(e) => setBlockSize(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-200 text-xs"
            >
              <option value={64}>64 字节 (标准 USB 全速端点)</option>
              <option value={512}>512 字节 (高速 USB 常见块)</option>
              <option value={1024}>1024 字节 (1KB 扇区适配)</option>
              <option value={2048}>2048 字节 (2KB Flash 块)</option>
            </select>
          </div>

          <button
            onClick={handleStartFlashing}
            disabled={progress.isFlashing || !fileData}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{progress.isFlashing ? '正在烧录中...' : '开始 DFU 固件写入'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Status */}
      {progress.percent > 0 && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">{progress.state}</span>
            <span className="font-mono font-bold text-purple-400 text-sm">
              {progress.percent}%
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-purple-500 h-full transition-all duration-200 rounded-full shadow-xs"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              已传输: {progress.bytesTransferred} / {progress.totalBytes} 字节 (块 #{progress.blockSeq}/{progress.totalBlocks})
            </span>
            <span>烧录速率: {progress.speedKbps} KB/s</span>
          </div>
        </div>
      )}
    </div>
  );
};

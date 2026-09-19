import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Usb,
  Cpu,
  Zap,
  Sliders,
  Cable,
  Layers,
  Terminal,
  HelpCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import { Header } from './components/Header';
import { DeviceSelector } from './components/DeviceSelector';
import { DeviceInfoCard } from './components/DeviceInfoCard';
import { DataTransceiver } from './components/DataTransceiver';
import { ControlTransfer } from './components/ControlTransfer';
import { SerialDebugger } from './components/SerialDebugger';
import { ScriptRunner } from './components/ScriptRunner';
import { ConsoleLog } from './components/ConsoleLog';
import { HelpModal } from './components/HelpModal';

import { LogEntry, DeviceStats, FilterConfig } from './types';
import {
  bytesToHexString,
  bytesToAsciiString,
  toHex4,
  toHex2,
  getVendorName,
} from './utils/usbUtils';

export default function App() {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<USBDevice[]>([]);
  const [claimedInterfaceNumber, setClaimedInterfaceNumber] = useState<number | null>(null);

  // Web Serial state
  const [serialPort, setSerialPort] = useState<any>(null);
  const [serialReader, setSerialReader] = useState<any>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'transceiver' | 'control' | 'serial' | 'script'>('transceiver');

  // Logs & Stats
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'SYS',
      message: '系统初始化就绪。等待选择并连接 USB 硬件设备...',
    },
  ]);

  const [stats, setStats] = useState<DeviceStats>({
    txBytes: 0,
    rxBytes: 0,
    txPackets: 0,
    rxPackets: 0,
    errors: 0,
    connectedTime: null,
  });

  // Polling state
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingEp, setPollingEp] = useState<number>(2);
  const [pollingInterval, setPollingInterval] = useState<number>(20);
  const isPollingRef = useRef<boolean>(false);

  // Modal
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Check iframe context
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  // Helper log function
  const addLog = useCallback(
    (
      msg: string,
      type: 'TX' | 'RX' | 'SYS' | 'ERR' | 'CTRL' = 'SYS',
      data?: Uint8Array,
      direction?: 'OUT' | 'IN',
      endpoint?: number
    ) => {
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        type,
        direction,
        endpoint,
        data,
        hexString: data ? bytesToHexString(data) : undefined,
        asciiString: data ? bytesToAsciiString(data) : undefined,
        message: msg,
      };

      setLogs((prev) => {
        // Limit log entries to last 500 lines to preserve DOM performance
        const next = [...prev, newEntry];
        return next.length > 500 ? next.slice(next.length - 500) : next;
      });
    },
    []
  );

  // Query Paired Devices
  const refreshPairedDevices = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      try {
        const devs = await navigator.usb.getDevices();
        setPairedDevices(devs);
      } catch (err: any) {
        // silent catch
      }
    }
  }, []);

  useEffect(() => {
    refreshPairedDevices();

    // USB Attach/Detach Listeners
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      const handleConnect = (e: USBConnectionEvent) => {
        addLog(
          `检测到新 USB 设备插入: ${e.device.productName || 'USB Device'} (VID:${toHex4(e.device.vendorId)})`,
          'SYS'
        );
        refreshPairedDevices();
      };

      const handleDisconnect = (e: USBConnectionEvent) => {
        addLog(
          `USB 设备已拨出断开: ${e.device.productName || 'USB Device'} (VID:${toHex4(e.device.vendorId)})`,
          'ERR'
        );
        if (device && device.vendorId === e.device.vendorId && device.productId === e.device.productId) {
          setDevice(null);
          setClaimedInterfaceNumber(null);
          setIsPolling(false);
          isPollingRef.current = false;
        }
        refreshPairedDevices();
      };

      navigator.usb.addEventListener('connect', handleConnect);
      navigator.usb.addEventListener('disconnect', handleDisconnect);

      return () => {
        navigator.usb.removeEventListener('connect', handleConnect);
        navigator.usb.removeEventListener('disconnect', handleDisconnect);
      };
    }
  }, [addLog, refreshPairedDevices, device]);

  // Request & Connect New Device
  const handleSelectDevice = async (filter: FilterConfig) => {
    if (!('usb' in navigator)) {
      addLog('您的浏览器不支持 WebUSB API，请使用 Chrome 或 Edge。', 'ERR');
      return;
    }

    let usbFilters: USBDeviceFilter[] = [];

    if (filter.mode === 'preset' || filter.mode === 'custom') {
      const f: USBDeviceFilter = {};
      if (filter.vendorId !== undefined) f.vendorId = filter.vendorId;
      if (filter.productId !== undefined) f.productId = filter.productId;
      if (Object.keys(f).length > 0) {
        usbFilters.push(f);
      }
    }
    // Filter mode 'all': empty array -> lists ALL connected devices in Chrome picker dialog!

    addLog(
      `打开系统 USB 设备选择窗口 (模式: ${
        filter.mode === 'all'
          ? '全量无限制列表'
          : filter.mode === 'preset'
          ? filter.presetName
          : `VID:${toHex4(filter.vendorId)}`
      })...`,
      'SYS'
    );

    const dev = await navigator.usb.requestDevice({ filters: usbFilters });
    await openAndClaimUsbDevice(dev);
  };

  // Connect Existing Paired Device
  const handleConnectExistingDevice = async (dev: USBDevice) => {
    await openAndClaimUsbDevice(dev);
  };

  // Open and Claim USB Device core logic
  const openAndClaimUsbDevice = async (dev: USBDevice) => {
    try {
      addLog(`正在打开 USB 设备: ${dev.productName || 'USB Device'}...`, 'SYS');
      await dev.open();

      // Select configuration 1 if configuration is null
      if (dev.configuration === null) {
        await dev.selectConfiguration(1);
        addLog('选定 USB 配置: Configuration 1', 'SYS');
      }

      // Automatically claim Interface 0 by default
      try {
        await dev.claimInterface(0);
        setClaimedInterfaceNumber(0);
        addLog('成功声明并占用接口: Interface #0', 'SYS');
      } catch (ifaceErr: any) {
        addLog(`声明 Interface #0 收到提示: ${ifaceErr.message} (可稍后手动选择声明其他接口)`, 'SYS');
      }

      setDevice(dev);
      setStats((s) => ({ ...s, connectedTime: new Date() }));
      addLog(
        `USB 设备建立通信成功! (${dev.productName || 'USB Device'} VID:${toHex4(dev.vendorId)} PID:${toHex4(dev.productId)})`,
        'SYS'
      );

      await refreshPairedDevices();
    } catch (err: any) {
      addLog(`打开 USB 设备失败: ${err.message || err}`, 'ERR');
      setStats((s) => ({ ...s, errors: s.errors + 1 }));
    }
  };

  // Claim specific interface
  const handleClaimInterface = async (interfaceNum: number) => {
    if (!device || !device.opened) return;
    try {
      await device.claimInterface(interfaceNum);
      setClaimedInterfaceNumber(interfaceNum);
      addLog(`手动声明并占用接口: Interface #${interfaceNum}`, 'SYS');
    } catch (err: any) {
      addLog(`声明接口 #${interfaceNum} 失败: ${err.message}`, 'ERR');
    }
  };

  // Release claimed interface
  const handleReleaseInterface = async () => {
    if (!device || !device.opened || claimedInterfaceNumber === null) return;
    try {
      await device.releaseInterface(claimedInterfaceNumber);
      addLog(`接口 #${claimedInterfaceNumber} 已成功释放`, 'SYS');
      setClaimedInterfaceNumber(null);
    } catch (err: any) {
      addLog(`释放接口失败: ${err.message}`, 'ERR');
    }
  };

  // Disconnect Device
  const handleDisconnectDevice = async () => {
    if (isPolling) {
      setIsPolling(false);
      isPollingRef.current = false;
    }

    if (device && device.opened) {
      try {
        if (claimedInterfaceNumber !== null) {
          await device.releaseInterface(claimedInterfaceNumber);
        }
        await device.close();
        addLog('USB 设备已关闭断开', 'SYS');
      } catch (err: any) {
        addLog(`断开设备遇到提示: ${err.message}`, 'SYS');
      }
    }

    setDevice(null);
    setClaimedInterfaceNumber(null);
  };

  // Forget device from list
  const handleForgetDevice = (dev: USBDevice) => {
    setPairedDevices((prev) =>
      prev.filter((d) => d.vendorId !== dev.vendorId || d.productId !== dev.productId)
    );
    addLog(`在列表中移除记忆设备: ${dev.productName || 'USB Device'}`, 'SYS');
  };

  // Send Bulk
  const handleSendBulk = async (endpointNumber: number, data: Uint8Array) => {
    if (!device || !device.opened) {
      addLog('发送失败: USB 设备未连接或未打开', 'ERR');
      return;
    }

    try {
      const result = await device.transferOut(endpointNumber, data);
      if (result.status === 'ok') {
        addLog(`TX Bulk (EP ${endpointNumber})`, 'TX', data, 'OUT', endpointNumber);
        setStats((s) => ({
          ...s,
          txBytes: s.txBytes + data.length,
          txPackets: s.txPackets + 1,
        }));
      } else {
        addLog(`TX Bulk 状态异常: ${result.status}`, 'ERR');
      }
    } catch (err: any) {
      addLog(`TX Bulk 发送失败: ${err.message || err}`, 'ERR');
      setStats((s) => ({ ...s, errors: s.errors + 1 }));
    }
  };

  // Read Bulk single manual
  const handleReadBulk = async (endpointNumber: number, length: number) => {
    if (!device || !device.opened) {
      addLog('读取失败: USB 设备未连接或未打开', 'ERR');
      return;
    }

    try {
      const result = await device.transferIn(endpointNumber, length);
      if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
        const bytes = new Uint8Array(result.data.buffer);
        addLog(`RX Bulk (EP ${endpointNumber})`, 'RX', bytes, 'IN', endpointNumber);
        setStats((s) => ({
          ...s,
          rxBytes: s.rxBytes + bytes.length,
          rxPackets: s.rxPackets + 1,
        }));
      }
    } catch (err: any) {
      addLog(`RX Bulk 读取错误: ${err.message || err}`, 'ERR');
      setStats((s) => ({ ...s, errors: s.errors + 1 }));
    }
  };

  // Toggle Continuous IN Polling
  const handleTogglePolling = (endpointNumber: number, intervalMs: number) => {
    if (isPolling) {
      setIsPolling(false);
      isPollingRef.current = false;
      addLog(`停止 EP IN (EP ${endpointNumber}) 轮询接收`, 'SYS');
    } else {
      setIsPolling(true);
      isPollingRef.current = true;
      setPollingEp(endpointNumber);
      addLog(`启动 EP IN (EP ${endpointNumber}) 轮询接收 (间隔: ${intervalMs}ms)...`, 'SYS');
    }
  };

  // Polling loop effect
  useEffect(() => {
    let timer: any = null;

    const runPollingStep = async () => {
      if (!isPollingRef.current || !device || !device.opened) return;

      try {
        const result = await device.transferIn(pollingEp, 64);
        if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
          const bytes = new Uint8Array(result.data.buffer);
          addLog(`RX Bulk (EP ${pollingEp})`, 'RX', bytes, 'IN', pollingEp);
          setStats((s) => ({
            ...s,
            rxBytes: s.rxBytes + bytes.length,
            rxPackets: s.rxPackets + 1,
          }));
        }
      } catch (err: any) {
        // stall error silent handle in background polling loop
      }

      if (isPollingRef.current) {
        timer = setTimeout(runPollingStep, pollingInterval);
      }
    };

    if (isPolling) {
      runPollingStep();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPolling, device, pollingEp, pollingInterval, addLog]);

  // Control Transfers
  const handleControlTransferOut = async (
    setup: USBControlTransferParameters,
    data?: Uint8Array
  ) => {
    if (!device || !device.opened) return;
    try {
      addLog(
        `CTRL OUT Req:0x${setup.request.toString(16)} Val:0x${setup.value.toString(16)} Ind:0x${setup.index.toString(16)}`,
        'CTRL',
        data
      );
      const result = await device.controlTransferOut(setup, data);
      addLog(`CTRL OUT 响应状态: ${result.status}`, 'SYS');
      return result;
    } catch (err: any) {
      addLog(`CTRL OUT 错误: ${err.message}`, 'ERR');
      setStats((s) => ({ ...s, errors: s.errors + 1 }));
    }
  };

  const handleControlTransferIn = async (
    setup: USBControlTransferParameters,
    length: number
  ) => {
    if (!device || !device.opened) return;
    try {
      addLog(
        `CTRL IN Req:0x${setup.request.toString(16)} Val:0x${setup.value.toString(16)} Ind:0x${setup.index.toString(16)} (Length:${length})`,
        'CTRL'
      );
      const result = await device.controlTransferIn(setup, length);
      if (result.status === 'ok' && result.data) {
        const bytes = new Uint8Array(result.data.buffer);
        addLog('CTRL IN 读回数据', 'RX', bytes);
      }
      return result;
    } catch (err: any) {
      addLog(`CTRL IN 错误: ${err.message}`, 'ERR');
      setStats((s) => ({ ...s, errors: s.errors + 1 }));
    }
  };

  // Web Serial Integration
  const handleConnectSerial = async (baudRate: number) => {
    if (!('serial' in navigator)) return;
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });
    setSerialPort(port);
    addLog(`WebSerial 端口连接建立 (波特率: ${baudRate} bps)`, 'SYS');

    // Read loop
    const reader = port.readable.getReader();
    setSerialReader(reader);

    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            addLog('RX Serial', 'RX', value);
            setStats((s) => ({
              ...s,
              rxBytes: s.rxBytes + value.length,
              rxPackets: s.rxPackets + 1,
            }));
          }
        }
      } catch (err: any) {
        // read loop ended
      } finally {
        reader.releaseLock();
      }
    })();
  };

  const handleDisconnectSerial = async () => {
    if (serialReader) {
      await serialReader.cancel();
      setSerialReader(null);
    }
    if (serialPort) {
      await serialPort.close();
      setSerialPort(null);
      addLog('WebSerial 端口已正常断开', 'SYS');
    }
  };

  const handleSendSerial = async (data: Uint8Array) => {
    if (!serialPort || !serialPort.writable) return;
    const writer = serialPort.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    addLog('TX Serial', 'TX', data);
    setStats((s) => ({
      ...s,
      txBytes: s.txBytes + data.length,
      txPackets: s.txPackets + 1,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      {/* Header Bar */}
      <Header
        device={device}
        serialPort={serialPort}
        onOpenHelp={() => setIsHelpOpen(true)}
        onRefreshDevices={refreshPairedDevices}
        isInIframe={isInIframe}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Section 1: USB Discovery Center & Device Info Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <DeviceSelector
              currentDevice={device}
              pairedDevices={pairedDevices}
              onSelectDevice={handleSelectDevice}
              onConnectExistingDevice={handleConnectExistingDevice}
              onDisconnectDevice={handleDisconnectDevice}
              onForgetDevice={handleForgetDevice}
              onLog={(m, t) => addLog(m, t || 'SYS')}
              isInIframe={isInIframe}
            />
          </div>

          <div className="lg:col-span-5">
            <DeviceInfoCard
              device={device}
              claimedInterfaceNumber={claimedInterfaceNumber}
              onClaimInterface={handleClaimInterface}
              onReleaseInterface={handleReleaseInterface}
            />
          </div>
        </div>

        {/* Section 2: Functional Debugging Workbench Navigation Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex flex-wrap gap-2 shadow-sm">
          <button
            onClick={() => setActiveTab('transceiver')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'transceiver'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Zap className={`w-4 h-4 ${activeTab === 'transceiver' ? 'text-amber-300' : 'text-amber-400'}`} />
            <span>EP Bulk / Interrupt 端点收发器</span>
          </button>

          <button
            onClick={() => setActiveTab('control')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'control'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Sliders className={`w-4 h-4 ${activeTab === 'control' ? 'text-purple-300' : 'text-purple-400'}`} />
            <span>USB 控制传输 (Control Transfers)</span>
          </button>

          <button
            onClick={() => setActiveTab('serial')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'serial'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Cable className={`w-4 h-4 ${activeTab === 'serial' ? 'text-cyan-300' : 'text-cyan-400'}`} />
            <span>Web Serial 虚拟串口辅助调试</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'script'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'script' ? 'text-emerald-300' : 'text-emerald-400'}`} />
            <span>自动化指令测试脚本 (Script Runner)</span>
          </button>
        </div>

        {/* Section 3: Active Workspace View */}
        <div>
          {activeTab === 'transceiver' && (
            <DataTransceiver
              device={device}
              claimedInterfaceNumber={claimedInterfaceNumber}
              onSendBulk={handleSendBulk}
              onReadBulk={handleReadBulk}
              isPolling={isPolling}
              onTogglePolling={handleTogglePolling}
              pollingEp={pollingEp}
              pollingInterval={pollingInterval}
              setPollingInterval={setPollingInterval}
            />
          )}

          {activeTab === 'control' && (
            <ControlTransfer
              device={device}
              onControlTransferOut={handleControlTransferOut}
              onControlTransferIn={handleControlTransferIn}
            />
          )}

          {activeTab === 'serial' && (
            <SerialDebugger
              serialPort={serialPort}
              onConnectSerial={handleConnectSerial}
              onDisconnectSerial={handleDisconnectSerial}
              onSendSerial={handleSendSerial}
              onLog={(m, t) => addLog(m, t || 'SYS')}
            />
          )}

          {activeTab === 'script' && (
            <ScriptRunner
              device={device}
              claimedInterfaceNumber={claimedInterfaceNumber}
              onSendBulk={handleSendBulk}
              onReadBulk={handleReadBulk}
              onLog={(m, t) => addLog(m, t || 'SYS')}
            />
          )}
        </div>

        {/* Section 4: Real-time Communication Console */}
        <ConsoleLog
          logs={logs}
          onClearLogs={() => setLogs([])}
          stats={stats}
        />
      </main>

      {/* Help & Troubleshooting Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        isInIframe={isInIframe}
      />
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Usb,
  Cpu,
  Zap,
  Sliders,
  Layers,
  Terminal,
  HelpCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Clock,
  Download,
  Bot,
  RefreshCw,
  Eye,
  Github,
} from 'lucide-react';

import { Header } from './components/Header';
import { DeviceSelector } from './components/DeviceSelector';
import { DeviceInfoCard } from './components/DeviceInfoCard';
import { DataTransceiver } from './components/DataTransceiver';
import { ControlTransfer } from './components/ControlTransfer';
import { ScriptRunner } from './components/ScriptRunner';
import { UrbSnifferView } from './components/UrbSnifferView';
import { HidParserView } from './components/HidParserView';
import { DfuFlasherView } from './components/DfuFlasherView';
import { ConsoleLog } from './components/ConsoleLog';
import { HelpModal } from './components/HelpModal';

import {
  LogEntry,
  DeviceStats,
  FilterConfig,
  UrbPacket,
  AutoResponderRule,
} from './types';
import {
  bytesToHexString,
  bytesToAsciiString,
  hexToUint8Array,
  toHex4,
  toHex2,
  getVendorName,
} from './utils/usbUtils';

export default function App() {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<USBDevice[]>([]);
  const [claimedInterfaceNumber, setClaimedInterfaceNumber] = useState<number | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'transceiver' | 'control' | 'sniffer' | 'hid' | 'dfu' | 'script'
  >('transceiver');

  // Logs & Stats
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      timestampMs: Date.now(),
      type: 'SYS',
      message: '系统初始化就绪。支持设备枚举、端点解析、URB抓包、PCAP导出、HID分析与DFU固件升级...',
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

  // Sniffer Packets array
  const [packets, setPackets] = useState<UrbPacket[]>([]);
  const lastPacketTimeRef = useRef<number>(Date.now());
  const urbSeqCounterRef = useRef<number>(0);

  // Polling state
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingEp, setPollingEp] = useState<number>(2);
  const [pollingInterval, setPollingInterval] = useState<number>(20);
  const isPollingRef = useRef<boolean>(false);

  // Periodic send state
  const [isPeriodicSending, setIsPeriodicSending] = useState<boolean>(false);
  const [periodicSentCount, setPeriodicSentCount] = useState<number>(0);
  const periodicTimerRef = useRef<any>(null);

  // Auto-responder rules state
  const [autoResponderRules, setAutoResponderRules] = useState<AutoResponderRule[]>([
    {
      id: 'rule-ping',
      name: 'Ping 心跳自动应答',
      enabled: false,
      matchType: 'contains_hex',
      matchValue: 'AA 55',
      replyHex: '55 AA 01 00',
      delayMs: 20,
      replyEndpoint: 2,
      hitCount: 0,
    },
    {
      id: 'rule-status',
      name: '状态查询 0x01 自动回复就绪',
      enabled: false,
      matchType: 'exact_hex',
      matchValue: '01 00 00 00',
      replyHex: '01 00 00 00 00 00 00 00',
      delayMs: 10,
      replyEndpoint: 2,
      hitCount: 0,
    },
  ]);
  const autoResponderRulesRef = useRef<AutoResponderRule[]>(autoResponderRules);
  useEffect(() => {
    autoResponderRulesRef.current = autoResponderRules;
  }, [autoResponderRules]);

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

  // Record a captured URB packet
  const recordUrbPacket = useCallback(
    (
      transferType: 'CONTROL' | 'BULK' | 'INTERRUPT',
      direction: 'IN' | 'OUT',
      endpoint: number,
      data?: Uint8Array,
      status: 'OK' | 'STALL' | 'ERROR' = 'OK',
      setup?: {
        requestType: string;
        recipient: string;
        request: number;
        value: number;
        index: number;
        length?: number;
      },
      summary?: string
    ) => {
      const now = Date.now();
      const delta = Math.max(0, now - lastPacketTimeRef.current);
      lastPacketTimeRef.current = now;
      urbSeqCounterRef.current += 1;

      const newPacket: UrbPacket = {
        id: Math.random().toString(36).substring(2, 9),
        urbSeq: urbSeqCounterRef.current,
        timestamp: new Date().toLocaleTimeString() + '.' + String(now % 1000).padStart(3, '0'),
        timestampMs: now,
        deltaMs: delta,
        transferType,
        direction,
        endpoint,
        length: data ? data.length : 0,
        status,
        data,
        hexString: data && data.length > 0 ? bytesToHexString(data) : undefined,
        asciiString: data && data.length > 0 ? bytesToAsciiString(data) : undefined,
        setup,
        summary,
      };

      setPackets((prev) => {
        const next = [...prev, newPacket];
        return next.length > 1000 ? next.slice(next.length - 1000) : next;
      });
    },
    []
  );

  // Helper log function
  const addLog = useCallback(
    (
      msg: string,
      type: 'TX' | 'RX' | 'SYS' | 'ERR' | 'CTRL' = 'SYS',
      data?: Uint8Array,
      direction?: 'OUT' | 'IN',
      endpoint?: number
    ) => {
      const now = Date.now();
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString() + '.' + String(now % 1000).padStart(3, '0'),
        timestampMs: now,
        type,
        direction,
        endpoint,
        data,
        hexString: data ? bytesToHexString(data) : undefined,
        asciiString: data ? bytesToAsciiString(data) : undefined,
        message: msg,
      };

      setLogs((prev) => {
        const next = [...prev, newEntry];
        return next.length > 500 ? next.slice(next.length - 500) : next;
      });
    },
    []
  );

  // Check incoming RX bytes against auto-responder rules
  const checkAutoResponder = useCallback(
    async (rxBytes: Uint8Array) => {
      const currentRules = autoResponderRulesRef.current;
      if (!currentRules || currentRules.length === 0) return;

      const rxHex = bytesToHexString(rxBytes).toUpperCase();
      const rxAscii = bytesToAsciiString(rxBytes);

      for (const rule of currentRules) {
        if (!rule.enabled) continue;

        let isMatch = false;
        const targetMatch = rule.matchValue.replace(/\s+/g, '').toUpperCase();
        const rxHexCompact = rxHex.replace(/\s+/g, '');

        if (rule.matchType === 'contains_hex') {
          isMatch = rxHexCompact.includes(targetMatch);
        } else if (rule.matchType === 'exact_hex') {
          isMatch = rxHexCompact === targetMatch;
        } else if (rule.matchType === 'ascii_prefix') {
          isMatch = rxAscii.startsWith(rule.matchValue);
        } else if (rule.matchType === 'always') {
          isMatch = true;
        }

        if (isMatch) {
          // Increment hit count
          setAutoResponderRules((prev) =>
            prev.map((r) => (r.id === rule.id ? { ...r, hitCount: r.hitCount + 1 } : r))
          );

          addLog(`[自动应答命中] 触发规则: ${rule.name}`, 'SYS');

          const replyBytes = hexToUint8Array(rule.replyHex);

          if (rule.delayMs > 0) {
            setTimeout(async () => {
              await handleSendBulk(rule.replyEndpoint, replyBytes);
            }, rule.delayMs);
          } else {
            await handleSendBulk(rule.replyEndpoint, replyBytes);
          }
        }
      }
    },
    [addLog]
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
    if (isPeriodicSending) {
      stopPeriodicSend();
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
        recordUrbPacket(
          'BULK',
          'OUT',
          endpointNumber,
          data,
          'OK',
          undefined,
          `Bulk OUT -> EP ${endpointNumber} (${data.length}B)`
        );
        setStats((s) => ({
          ...s,
          txBytes: s.txBytes + data.length,
          txPackets: s.txPackets + 1,
        }));
      } else {
        addLog(`TX Bulk 状态异常: ${result.status}`, 'ERR');
        recordUrbPacket(
          'BULK',
          'OUT',
          endpointNumber,
          data,
          'ERROR',
          undefined,
          `Bulk OUT 异常: ${result.status}`
        );
      }
    } catch (err: any) {
      addLog(`TX Bulk 发送失败: ${err.message || err}`, 'ERR');
      recordUrbPacket(
        'BULK',
        'OUT',
        endpointNumber,
        data,
        'ERROR',
        undefined,
        `Bulk OUT 发送失败: ${err.message}`
      );
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
        recordUrbPacket(
          'BULK',
          'IN',
          endpointNumber,
          bytes,
          'OK',
          undefined,
          `Bulk IN <- EP ${endpointNumber} (${bytes.length}B)`
        );
        setStats((s) => ({
          ...s,
          rxBytes: s.rxBytes + bytes.length,
          rxPackets: s.rxPackets + 1,
        }));

        // Check Auto-Responder
        checkAutoResponder(bytes);
      }
    } catch (err: any) {
      addLog(`RX Bulk 读取错误: ${err.message || err}`, 'ERR');
      recordUrbPacket('BULK', 'IN', endpointNumber, undefined, 'ERROR', undefined, `Bulk IN 错误`);
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
          recordUrbPacket(
            'BULK',
            'IN',
            pollingEp,
            bytes,
            'OK',
            undefined,
            `Polling IN <- EP ${pollingEp} (${bytes.length}B)`
          );
          setStats((s) => ({
            ...s,
            rxBytes: s.rxBytes + bytes.length,
            rxPackets: s.rxPackets + 1,
          }));

          // Trigger Auto-Responder
          checkAutoResponder(bytes);
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
  }, [isPolling, device, pollingEp, pollingInterval, addLog, recordUrbPacket, checkAutoResponder]);

  // Periodic send management
  const stopPeriodicSend = () => {
    if (periodicTimerRef.current) {
      clearInterval(periodicTimerRef.current);
      periodicTimerRef.current = null;
    }
    setIsPeriodicSending(false);
  };

  const handleTogglePeriodicSend = (
    endpoint: number,
    baseData: Uint8Array,
    intervalMs: number,
    countLimit: number,
    autoIncrement: boolean
  ) => {
    if (isPeriodicSending) {
      stopPeriodicSend();
      addLog(`已停止定时循环发送 (累计发送: ${periodicSentCount} 次)`, 'SYS');
    } else {
      setIsPeriodicSending(true);
      setPeriodicSentCount(0);
      let count = 0;
      const dataCopy = new Uint8Array(baseData);

      addLog(
        `启动定时循环发送 -> EP ${endpoint} (周期: ${intervalMs}ms, 上限: ${
          countLimit === 0 ? '无限' : countLimit
        }次)...`,
        'SYS'
      );

      periodicTimerRef.current = setInterval(async () => {
        if (countLimit > 0 && count >= countLimit) {
          stopPeriodicSend();
          addLog(`定时发送已达到指定上限 (${countLimit} 次)，自动停止。`, 'SYS');
          return;
        }

        if (autoIncrement && dataCopy.length > 0) {
          dataCopy[0] = (dataCopy[0] + 1) & 0xff;
        }

        await handleSendBulk(endpoint, dataCopy);
        count += 1;
        setPeriodicSentCount(count);
      }, intervalMs);
    }
  };

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
      recordUrbPacket(
        'CONTROL',
        'OUT',
        0,
        data,
        'OK',
        {
          requestType: setup.requestType,
          recipient: setup.recipient,
          request: setup.request,
          value: setup.value,
          index: setup.index,
          length: data ? data.length : 0,
        },
        `CTRL OUT Req:0x${setup.request.toString(16)}`
      );

      const result = await device.controlTransferOut(setup, data);
      addLog(`CTRL OUT 响应状态: ${result.status}`, 'SYS');
      return result;
    } catch (err: any) {
      addLog(`CTRL OUT 错误: ${err.message}`, 'ERR');
      recordUrbPacket('CONTROL', 'OUT', 0, data, 'ERROR', undefined, `CTRL OUT 失败: ${err.message}`);
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
        recordUrbPacket(
          'CONTROL',
          'IN',
          0,
          bytes,
          'OK',
          {
            requestType: setup.requestType,
            recipient: setup.recipient,
            request: setup.request,
            value: setup.value,
            index: setup.index,
            length,
          },
          `CTRL IN 收到 ${bytes.length} 字节`
        );
      }
      return result;
    } catch (err: any) {
      addLog(`CTRL IN 错误: ${err.message}`, 'ERR');
      recordUrbPacket('CONTROL', 'IN', 0, undefined, 'ERROR', undefined, `CTRL IN 失败: ${err.message}`);
      setStats((s) => ({ ...s, errors: s.errors + 1 }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      {/* Header Bar */}
      <Header
        device={device}
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
            onClick={() => setActiveTab('sniffer')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sniffer'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Activity className={`w-4 h-4 ${activeTab === 'sniffer' ? 'text-sky-300' : 'text-sky-400'}`} />
            <span>URB 协议抓包 & Wireshark PCAP 导出</span>
            {packets.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-sky-950 text-sky-300 rounded-full font-mono font-bold border border-sky-800">
                {packets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('hid')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'hid'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <FileCode2 className={`w-4 h-4 ${activeTab === 'hid' ? 'text-emerald-300' : 'text-emerald-400'}`} />
            <span>HID 报告描述符解析 (HID Parser)</span>
          </button>

          <button
            onClick={() => setActiveTab('dfu')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dfu'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Cpu className={`w-4 h-4 ${activeTab === 'dfu' ? 'text-purple-300' : 'text-purple-400'}`} />
            <span>DFU 固件升级与烧录</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'script'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === 'script' ? 'text-amber-300' : 'text-amber-400'}`} />
            <span>自动化指令测试脚本</span>
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
              isPeriodicSending={isPeriodicSending}
              periodicSentCount={periodicSentCount}
              onTogglePeriodicSend={handleTogglePeriodicSend}
              autoResponderRules={autoResponderRules}
              onUpdateAutoResponderRules={setAutoResponderRules}
            />
          )}

          {activeTab === 'control' && (
            <ControlTransfer
              device={device}
              onControlTransferOut={handleControlTransferOut}
              onControlTransferIn={handleControlTransferIn}
            />
          )}

          {activeTab === 'sniffer' && (
            <UrbSnifferView
              packets={packets}
              onClearPackets={() => setPackets([])}
              onReplayPacket={(ep, data) => handleSendBulk(ep, data)}
            />
          )}

          {activeTab === 'hid' && (
            <HidParserView
              device={device}
              claimedInterfaceNumber={claimedInterfaceNumber}
              onLog={(m, t) => addLog(m, t || 'SYS')}
            />
          )}

          {activeTab === 'dfu' && (
            <DfuFlasherView
              device={device}
              claimedInterfaceNumber={claimedInterfaceNumber}
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
          packets={packets}
        />
      </main>

      {/* Footer with GitHub Link */}
      <footer className="mt-12 border-t border-slate-800 bg-slate-950/70 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Usb className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">USBee</span>
            <span className="text-slate-600">—</span>
            <span className="text-slate-400">WebUSB 通用硬件调试上位机</span>
          </div>

          <div className="flex items-center space-x-6">
            <a
              href="https://github.com/etfrommars/USBee"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors group"
            >
              <Github className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span className="font-mono text-[11px] group-hover:underline">github.com/etfrommars/USBee</span>
            </a>
            <span className="text-slate-700">|</span>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              排错与开发指南
            </button>
          </div>
        </div>
      </footer>

      {/* Help & Troubleshooting Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        isInIframe={isInIframe}
      />
    </div>
  );
}

import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  FileCode2,
  Activity,
  Download,
  Bot,
  Clock,
  Zap,
  Sliders,
  BookOpen,
  Github,
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
  const [activeDocTab, setActiveDocTab] = useState<
    | 'overview'
    | 'transfers'
    | 'hid'
    | 'urb_pcap'
    | 'dfu'
    | 'auto_periodic'
    | 'drivers'
  >('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                USB 专精调试上位机全功能说明与技术开发手册
              </h2>
              <p className="text-[11px] text-slate-400">
                涵盖设备枚举、描述符解构、URB抓包、PCAP导出、HID分析、DFU固件升级与驱动配置
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Doc Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          {[
            { id: 'overview', label: '1. 设备枚举与描述符' },
            { id: 'transfers', label: '2. 端点与控制/批量/中断传输' },
            { id: 'auto_periodic', label: '3. 定时发送与自动应答' },
            { id: 'hid', label: '4. HID 报告解析' },
            { id: 'urb_pcap', label: '5. URB 抓包与 PCAP 导出' },
            { id: 'dfu', label: '6. DFU 固件升级' },
            { id: 'drivers', label: '7. 跨平台驱动 (Win/Linux)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDocTab(tab.id as any)}
              className={`px-3 py-2 border-b-2 font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeDocTab === tab.id
                  ? 'border-indigo-500 text-indigo-400 font-bold bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed flex-1">
          {isInIframe && (
            <div className="bg-amber-950/70 border border-amber-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-200 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>浏览器安全沙箱提示：当前应用处于嵌合预览窗口中</span>
              </div>
              <p className="text-amber-300/90 pl-6">
                WebUSB 属于浏览器硬件级安全 API，规范禁止第三方 iFrame
                直接唤起系统底层硬件设备授权窗口。
              </p>
              <div className="pl-6 pt-1">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>点击在新标签页 (独立窗口) 中打开运行</span>
                </a>
              </div>
            </div>
          )}

          {/* Section 1: Overview & Enumeration */}
          {activeDocTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>设备枚举与描述符层次模型 (Device Enumeration & Descriptors)</span>
                </h3>
                <p className="text-slate-400">
                  本工具基于 W3C 标准 WebUSB API 构建。当用户点击「连接/搜索设备」时，浏览器底层执行 USB 设备枚举总线握手：
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1 font-mono">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                    <span className="text-indigo-400 font-bold block">1. 设备描述符 (Device Descriptor)</span>
                    <p className="text-slate-400">
                      包含 bDeviceClass、bDeviceSubClass、bMaxPacketSize0、idVendor (VID)、idProduct (PID)、bcdDevice 与制造厂商/产品序列号索引。
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                    <span className="text-indigo-400 font-bold block">2. 配置描述符 (Configuration)</span>
                    <p className="text-slate-400">
                      包含 wTotalLength、bNumInterfaces、bConfigurationValue、bmAttributes（供电模式/自供电/远程唤醒）与 MaxPower（总线最大功耗）。
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                    <span className="text-indigo-400 font-bold block">3. 接口描述符 (Interface Descriptor)</span>
                    <p className="text-slate-400">
                      包含 bInterfaceNumber、bAlternateSetting、bNumEndpoints、bInterfaceClass（例如 HID、Vendor Specific、CDC Data）。
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                    <span className="text-indigo-400 font-bold block">4. 端点描述符 (Endpoint Descriptor)</span>
                    <p className="text-slate-400">
                      包含 bEndpointAddress（端点号与 IN/OUT 方向）、bmAttributes（传输类型：Bulk/Interrupt/Control/Isochronous）与 wMaxPacketSize。
                    </p>
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300">
                  <strong className="text-indigo-300">多设备协同支持：</strong>
                  系统会自动记忆已配对的设备列表，并在插入或拔出物理 USB 设备时通过 <code className="text-indigo-400">connect</code> / <code className="text-indigo-400">disconnect</code> 原生事件进行实时动态更新。您可以在顶部或设备卡片中一键无缝切换当前活跃的操作设备。
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Transfers */}
          {activeDocTab === 'transfers' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>控制传输 (Control) / 批量传输 (Bulk) / 中断传输 (Interrupt)</span>
                </h3>
                <div className="space-y-2 text-slate-400">
                  <p>
                    USB 规范定义了四种基本的底层数据传输机制，本调试工具全面支持以下主流收发：
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-purple-300">控制传输 (Control Transfers)：</strong>
                      始终经由默认端点 EP0 进行，具备严格的 Setup 事务（包含 8 字节设置包：bmRequestType, bRequest, wValue, wIndex, wLength）。用于枚举、接口配置及厂商指令。在「USB 控制传输」选项卡中可直观配置标准请求、类请求与厂商请求。
                    </li>
                    <li>
                      <strong className="text-sky-300">批量传输 (Bulk Transfers)：</strong>
                      提供大吞吐量、非周期性且带硬件 CRC 校验与重发保证的数据通信。在「EP 端点收发器」中，通过指定 OUT 端点发送硬件载荷，IN 端点读取设备返回。
                    </li>
                    <li>
                      <strong className="text-emerald-300">中断传输 (Interrupt Transfers)：</strong>
                      保证特定时延间隔（bInterval）的小批量数据传输，广泛用于键盘、鼠标、游戏手柄及传感器数据上报。本工具的收发器自动识别端点类型，并提供连续高速轮询管理器。
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-indigo-300">
                  注意：在向特定 USB 接口发送或读取数据之前，必须先调用 <code className="text-white">claimInterface(interfaceNumber)</code> 获得该接口独占所有权。调试完毕后可点击「释放接口」释放总线。
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Auto-Responder & Periodic */}
          {activeDocTab === 'auto_periodic' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>定时自动发送与智能自动应答引擎 (Periodic Send & Auto-Responder)</span>
                </h3>
                <div className="space-y-3 text-slate-400">
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs mb-1">1. 定时发送管理器 (Periodic Transmitter)</h4>
                    <p>
                      支持设定周期毫秒数（最低 20ms），支持指定发送循环次数（设定为 0 表示无限循环）。此外，勾选「首字节累加」功能可在每次发送时自动将报文首字节数值递增（0x00 ~ 0xFF），便于硬件端测试丢包率与帧序号同步。
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs mb-1">2. 智能自动应答规则引擎 (Auto-Responder Engine)</h4>
                    <p>
                      在下位机固件开发或双向通信联调中，上位机常需对特定握手指令进行回包响应。例如收到下位机发送的心跳包 <code className="text-amber-300 font-mono">0xAA 0x55</code>，上位机需要立即或延时指定毫秒回送确认包 <code className="text-emerald-300 font-mono">0x55 0xAA 0x01</code>。
                    </p>
                    <p className="mt-1">
                      只需在收发器底部的「添加应答规则」中定义匹配 HEX 与应答 HEX，系统在后台监听收到匹配数据时将自动即时触发应答，并记录累计命中触发次数。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: HID */}
          {activeDocTab === 'hid' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-400" />
                  <span>HID 报告描述符解析器 (HID 1.11 Report Descriptor Parser)</span>
                </h3>
                <p className="text-slate-400">
                  人机接口设备 (Human Interface Device) 通过高度结构化的二进制报告描述符向主机声明其按键、旋钮、摇杆及报文格式。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] pt-1">
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <span className="text-sky-400 font-bold block mb-1">Global 项 (全局标签)</span>
                    <p className="text-slate-400">
                      Usage Page（用途页，如通用桌面 0x01、键盘 0x07、按键 0x09）、Logical Min/Max、Report Size（单字段位宽）、Report Count（字段数量）、Report ID。
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <span className="text-amber-400 font-bold block mb-1">Local 项 (局部标签)</span>
                    <p className="text-slate-400">
                      Usage（特定用途，如指针 Pointer 0x01、鼠标 0x02、X/Y 坐标 0x30/0x31、滚轮 0x38）、Usage Min/Max。
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <span className="text-emerald-400 font-bold block mb-1">Main 项 (主项标签)</span>
                    <p className="text-slate-400">
                      Input、Output、Feature、Collection（集合：Physical / Application / Logical）、End Collection。
                    </p>
                  </div>
                </div>
                <p className="text-slate-400">
                  您可以在「HID 报告解析器」中一键载入标准鼠标、键盘、游戏手柄或自定义 Vendor 固件的预设，也可以粘贴任意十六进制流，或直接点击「从当前连接设备读取」通过控制传输获取物理设备的实际描述符。
                </p>
              </div>
            </div>
          )}

          {/* Section 5: URB & PCAP */}
          {activeDocTab === 'urb_pcap' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>URB 报文抓包与 Wireshark PCAP 联动分析</span>
                </h3>
                <p className="text-slate-400">
                  URB (USB Request Block) 是主机控制器驱动与 USB 核心层交互的异步请求单元。
                </p>
                <div className="space-y-2 text-slate-300">
                  <p>
                    本工具内置实时抓包嗅探引擎（URB Packet Sniffer），记录每一笔传输的：
                  </p>
                  <ul className="list-disc pl-5 text-slate-400 space-y-1">
                    <li>毫秒/微秒高精度时间戳与相对前帧时延 (Δt)</li>
                    <li>传输类型（CONTROL、BULK、INTERRUPT）与方向（IN / OUT）</li>
                    <li>端点编号、数据载荷长度与状态码（OK、STALL、ERROR）</li>
                    <li>针对控制传输，自动深度拆解 8 字节 Setup 报文结构</li>
                  </ul>
                  <div className="pt-2">
                    <div className="p-3 bg-indigo-950/70 border border-indigo-800 rounded-xl space-y-1">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <Download className="w-4 h-4" />
                        <span>导出 Wireshark 兼容 .pcap 二进制文件：</span>
                      </span>
                      <p className="text-[11px] text-slate-400">
                        点击抓包视图中的「导出 Wireshark (.pcap)」按钮，即可生成符合官方 Libpcap 规范（Magic: 0xa1b2c3d4，LINKTYPE_USB_2_0 / 288）的标准抓包文件，无需安装外部硬件抓包仪即可直接在 Wireshark 中打开进行协议树重放。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: DFU */}
          {activeDocTab === 'dfu' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>USB DFU 1.1 固件升级与在线烧录协议</span>
                </h3>
                <p className="text-slate-400">
                  设备固件升级 (Device Firmware Upgrade, DFU) 是 USB-IF 制定的官方标准更新协议。
                </p>
                <div className="space-y-2 text-slate-300">
                  <h4 className="font-bold text-xs text-purple-300">DFU 状态机演进流程：</h4>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-indigo-300">
                    appIDLE ➔ DFU_DETACH ➔ dfuIDLE ➔ DFU_DNLOAD (Block #2..n) ➔ dfuDNBUSY (擦写中) ➔ dfuDNLOAD_IDLE ➔ DFU_DNLOAD (0 字节结束帧) ➔ dfuMANIFEST (校验) ➔ 设备软重启
                  </div>
                  <ul className="list-disc pl-5 text-slate-400 space-y-1 mt-2">
                    <li><code className="text-slate-200">DFU_GETSTATUS (0x03)</code>：读取当前设备状态机、擦写耗时推荐轮询等待周期 (bwPollTimeout) 及错误码。</li>
                    <li><code className="text-slate-200">DFU_CLRSTATUS (0x04)</code>：清除设备上报的 Flash 校验或超时错误状态。</li>
                    <li><code className="text-slate-200">DFU_DNLOAD (0x01)</code>：将固件数据按指定分块大小（如 64 / 512 / 1024 / 2048 字节）分批写入设备引导区。</li>
                  </ul>
                  <p className="text-[11px] text-slate-400 pt-1">
                    系统内置仿真演示模式，即使您手头暂无处于 Bootloader 状态的设备，也可勾选「仿真测试演示模式」预览体验完整的固件擦除、分块烧录与校验进度。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Drivers */}
          {activeDocTab === 'drivers' && (
            <div className="space-y-4">
              {/* Windows Zadig instruction */}
              <section className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Windows 系统驱动配置 (WinUSB / Zadig)</span>
                </div>
                <p className="text-slate-400">
                  Windows 操作系统出于内核保护机制，默认的 USB 驱动不支持浏览器免驱底层访问。针对自定义 Vendor Bulk / DFU 设备：
                </p>
                <ol className="list-decimal pl-5 text-slate-400 space-y-1">
                  <li>访问官网下载免费工具 Zadig (zadig.akeo.ie)。</li>
                  <li>在菜单中勾选 <strong className="text-slate-200">Options → List All Devices</strong>。</li>
                  <li>在下拉列表中选择您的目标 USB 设备。</li>
                  <li>将目标驱动替换选择为 <strong className="text-slate-200">WinUSB (v6.1.7600.16385)</strong>。</li>
                  <li>点击「Replace Driver」安装完成，即可被 Chrome/Edge 浏览器原生识别与收发！</li>
                </ol>
              </section>

              {/* Linux udev rules */}
              <section className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>Linux / Ubuntu 系统 udev 权限配置</span>
                </div>
                <p className="text-slate-400">
                  Linux 默认仅允许 root 访问原始 USB 节点。若遇 <code className="text-rose-400">Access Denied</code>，可在 <code className="text-slate-200">/etc/udev/rules.d/99-usb.rules</code> 中配置规则：
                </p>
                <pre className="bg-slate-900 border border-slate-700 rounded p-2.5 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                  {'SUBSYSTEM=="usb", ATTR{idVendor}=="[你的VID]", MODE="0666", GROUP="plugdev"'}
                </pre>
                <p className="text-slate-400 text-[11px]">
                  配置完成后执行 <code className="text-slate-200">sudo udevadm control --reload-rules && sudo udevadm trigger</code> 即可生效。
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>USBee • WebUSB Debugger</span>
            <span className="text-slate-700">|</span>
            <a
              href="https://github.com/etfrommars/USBee"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>github.com/etfrommars/USBee</span>
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm transition-colors"
          >
            我已知晓，进入操作
          </button>
        </div>
      </div>
    </div>
  );
};

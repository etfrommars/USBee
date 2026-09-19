import React, { useState } from 'react';
import { Play, Square, Plus, Trash2, Clock, Send, Layers, Sparkles } from 'lucide-react';
import { ScriptStep } from '../types';
import { hexToUint8Array } from '../utils/usbUtils';

interface ScriptRunnerProps {
  device: USBDevice | null;
  claimedInterfaceNumber: number | null;
  onSendBulk: (endpointNumber: number, data: Uint8Array) => Promise<void>;
  onReadBulk: (endpointNumber: number, length: number) => Promise<void>;
  onLog: (msg: string, type?: 'SYS' | 'ERR') => void;
}

export const ScriptRunner: React.FC<ScriptRunnerProps> = ({
  device,
  claimedInterfaceNumber,
  onSendBulk,
  onReadBulk,
  onLog,
}) => {
  const [steps, setSteps] = useState<ScriptStep[]>([
    { id: '1', type: 'send_bulk', endpoint: 2, hexData: '01 00 00 00' },
    { id: '2', type: 'delay', delayMs: 100 },
    { id: '3', type: 'read_bulk', endpoint: 2, expectedLength: 64 },
    { id: '4', type: 'send_bulk', endpoint: 2, hexData: '02 00 00 00' },
  ]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [loopCount, setLoopCount] = useState<number>(1);

  const addStep = (type: ScriptStep['type']) => {
    const newStep: ScriptStep = {
      id: Date.now().toString(),
      type,
      endpoint: 2,
      hexData: type === 'send_bulk' ? '01 00 00 00' : undefined,
      delayMs: type === 'delay' ? 200 : undefined,
      expectedLength: type === 'read_bulk' ? 64 : undefined,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, fields: Partial<ScriptStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  };

  const handleRunScript = async () => {
    if (!device || !device.opened || claimedInterfaceNumber === null) {
      onLog('测试脚本停止：需先选择 USB 设备并占用声明接口', 'ERR');
      return;
    }

    setIsRunning(true);
    onLog(`开始执行自动化测试脚本 (循环次数: ${loopCount})...`, 'SYS');

    try {
      for (let l = 0; l < loopCount; l++) {
        if (loopCount > 1) {
          onLog(`--- 执行第 ${l + 1} / ${loopCount} 次循环 ---`, 'SYS');
        }

        for (let i = 0; i < steps.length; i++) {
          setCurrentStepIdx(i);
          const step = steps[i];

          if (step.type === 'send_bulk') {
            const bytes = hexToUint8Array(step.hexData || '');
            await onSendBulk(step.endpoint || 2, bytes);
          } else if (step.type === 'read_bulk') {
            await onReadBulk(step.endpoint || 2, step.expectedLength || 64);
          } else if (step.type === 'delay') {
            await new Promise((r) => setTimeout(r, step.delayMs || 100));
          }
        }
      }
      onLog('自动化测试脚本流程顺利完成！', 'SYS');
    } catch (err: any) {
      onLog(`脚本中断错误: ${err.message || err}`, 'ERR');
    } finally {
      setIsRunning(false);
      setCurrentStepIdx(-1);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-950/80 text-amber-400 border border-amber-800 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              自动化硬件测试序列 (Script Runner)
            </h2>
            <p className="text-xs text-slate-400">
              按设定步骤自动顺序发送 Packet 指令、延迟定时与读取响应
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <span>重复循环:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={loopCount}
              onChange={(e) => setLoopCount(Number(e.target.value))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-center font-bold"
            />
            <span>次</span>
          </div>

          <button
            type="button"
            disabled={isRunning || !device || claimedInterfaceNumber === null}
            onClick={handleRunScript}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isRunning
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-sm'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>脚本运行中...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>启动自动化测试脚本</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step Sequence List */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isCurrent = currentStepIdx === idx;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                isCurrent
                  ? 'bg-amber-950/50 border-amber-700 text-slate-100 shadow-xs'
                  : 'bg-slate-950/80 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  #{idx + 1}
                </span>

                {step.type === 'send_bulk' && (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 items-center text-xs">
                    <span className="font-bold text-sky-400 flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" /> 发送 Bulk (EP {step.endpoint})
                    </span>
                    <input
                      type="text"
                      value={step.hexData || ''}
                      onChange={(e) => updateStep(step.id, { hexData: e.target.value })}
                      placeholder="Hex 字节例如 01 00 00 00"
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 font-mono text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {step.type === 'delay' && (
                  <div className="flex-1 flex items-center gap-3 text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 等待延时 (Delay)
                    </span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        value={step.delayMs || 100}
                        onChange={(e) =>
                          updateStep(step.id, { delayMs: Number(e.target.value) })
                        }
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs text-center focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-400">ms</span>
                    </div>
                  </div>
                )}

                {step.type === 'read_bulk' && (
                  <div className="flex-1 flex items-center gap-3 text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> 读取 EP IN 响应 (Read)
                    </span>
                    <span className="font-mono text-slate-400">
                      端点 EP {step.endpoint} / 64B
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => removeStep(step.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                title="删除步骤"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Step Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={() => addStep('send_bulk')}
          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-sky-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-800 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ 发送 Bulk 步骤</span>
        </button>
        <button
          onClick={() => addStep('delay')}
          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-800 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ 延时等待步骤</span>
        </button>
        <button
          onClick={() => addStep('read_bulk')}
          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-800 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ 读取 IN 响应步骤</span>
        </button>
      </div>
    </div>
  );
};

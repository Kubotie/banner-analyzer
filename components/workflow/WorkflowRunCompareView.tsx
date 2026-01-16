'use client';

import { KBItem, WorkflowRunPayload } from '@/kb/types';
import { X } from 'lucide-react';

interface WorkflowRunCompareViewProps {
  runA: { item: KBItem; payload: WorkflowRunPayload };
  runB: { item: KBItem; payload: WorkflowRunPayload };
}

/**
 * ワークフロー実行結果の比較表示（最短版：JSON diff）
 */
export default function WorkflowRunCompareView({ runA, runB }: WorkflowRunCompareViewProps) {
  // JSON diff（簡易版：行単位）
  const getJsonDiff = (objA: any, objB: any): { left: string[]; right: string[]; common: string[] } => {
    const jsonA = JSON.stringify(objA, null, 2).split('\n');
    const jsonB = JSON.stringify(objB, null, 2).split('\n');
    
    // 簡易diff（行単位）
    const maxLen = Math.max(jsonA.length, jsonB.length);
    const left: string[] = [];
    const right: string[] = [];
    const common: string[] = [];
    
    for (let i = 0; i < maxLen; i++) {
      const lineA = jsonA[i] || '';
      const lineB = jsonB[i] || '';
      
      if (lineA === lineB) {
        common.push(lineA);
        left.push(lineA);
        right.push(lineB);
      } else {
        left.push(lineA || '');
        right.push(lineB || '');
      }
    }
    
    return { left, right, common };
  };

  const outputA = runA.payload.finalOutput || runA.payload.output || {};
  const outputB = runB.payload.finalOutput || runB.payload.output || {};
  const diff = getJsonDiff(outputA, outputB);

  return (
    <div className="border rounded bg-white">
      <div className="grid grid-cols-2 gap-4 p-4">
        {/* Run A */}
        <div className="border rounded p-3">
          <div className="font-semibold text-sm mb-2">
            {runA.item.title}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {new Date(runA.payload.executedAt || runA.payload.startedAt).toLocaleString('ja-JP')}
          </div>
          <div className="text-xs overflow-auto max-h-96 bg-gray-50 p-2 rounded font-mono">
            {diff.left.map((line, i) => {
              const isDiff = line !== diff.right[i];
              return (
                <div
                  key={i}
                  className={isDiff ? 'bg-red-100 text-red-800' : ''}
                >
                  {line || '\u00A0'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Run B */}
        <div className="border rounded p-3">
          <div className="font-semibold text-sm mb-2">
            {runB.item.title}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {new Date(runB.payload.executedAt || runB.payload.startedAt).toLocaleString('ja-JP')}
          </div>
          <div className="text-xs overflow-auto max-h-96 bg-gray-50 p-2 rounded font-mono">
            {diff.right.map((line, i) => {
              const isDiff = line !== diff.left[i];
              return (
                <div
                  key={i}
                  className={isDiff ? 'bg-green-100 text-green-800' : ''}
                >
                  {line || '\u00A0'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-gray-50 border-t text-xs text-gray-600">
        💡 差分が赤（左）と緑（右）で表示されます。同じ行は通常表示です。
      </div>
    </div>
  );
}

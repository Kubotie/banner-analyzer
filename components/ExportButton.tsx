'use client';

import { useRef } from 'react';

interface ExportButtonProps {
  onExportPDF?: () => void;
  onExportPNG?: () => void;
}

export default function ExportButton({ onExportPDF, onExportPNG }: ExportButtonProps) {
  return (
    <div className="flex items-center gap-2">
      {onExportPNG && (
        <button
          onClick={onExportPNG}
          className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          PNGエクスポート
        </button>
      )}
      {onExportPDF && (
        <button
          onClick={onExportPDF}
          className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          PDFエクスポート
        </button>
      )}
    </div>
  );
}

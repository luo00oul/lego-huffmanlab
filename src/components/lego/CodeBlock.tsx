import React, {useState} from 'react';
import {Check, Copy, Download} from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: 'cpp' | 'ts' | 'text';
  filename: string;
  title?: string;
}

const KEYWORDS_CPP = new Set([
  'include',
  'using',
  'static',
  'const',
  'return',
  'if',
  'else',
  'for',
  'while',
  'int',
  'long',
  'bool',
  'char',
  'void',
  'true',
  'false',
  'std',
  'size_t',
  'i128',
  'vector',
  'string',
  'priority_queue',
  'ifstream',
  'ofstream',
]);

const KEYWORDS_TS = new Set([
  'export',
  'function',
  'const',
  'let',
  'return',
  'if',
  'else',
  'for',
  'while',
  'new',
  'class',
  'private',
  'readonly',
  'number',
  'bigint',
  'string',
  'boolean',
  'true',
  'false',
  'interface',
  'type',
  'import',
  'from',
]);

function highlightLine(line: string, lang: 'cpp' | 'ts' | 'text'): React.ReactNode {
  if (lang === 'text') return line;
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return <span className="text-[#6a8759]">{line}</span>;
  }
  if (lang === 'cpp' && trimmed.startsWith('#')) {
    return <span className="text-[#c97e2f]">{line}</span>;
  }

  const kwSet = lang === 'cpp' ? KEYWORDS_CPP : KEYWORDS_TS;
  const tokens = line.split(/(\b[A-Za-z_][A-Za-z0-9_]*\b|"[^"]*"|'[^']*'|\b\d+n?\b)/g);

  return tokens.map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith('"') || tok.startsWith("'")) {
      return (
        <span key={i} className="text-[#a5c261]">
          {tok}
        </span>
      );
    }
    if (/^\d+n?$/.test(tok)) {
      return (
        <span key={i} className="text-[#6897bb]">
          {tok}
        </span>
      );
    }
    if (kwSet.has(tok)) {
      return (
        <span key={i} className="font-semibold text-[#e78a4e]">
          {tok}
        </span>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  filename,
  title,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback copy via textarea
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lines = code.replace(/\n$/, '').split('\n');

  return (
    <div className="overflow-hidden rounded-lg border-2 border-[#25262a] bg-[#1e1f24] text-[#ebe8df]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-[#2a2b32] px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-xs text-[#d6d2c7]">
          <span className="font-semibold text-white">{filename}</span>
          {title && (
            <>
              <span aria-hidden="true">·</span>
              <span>{title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#5ad08a]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制代码'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            下载文件
          </button>
        </div>
      </div>
      <div className="max-h-[480px] overflow-auto p-4 font-mono text-xs leading-6 tabular-nums">
        <pre className="m-0">
          {lines.map((line, idx) => (
            <div key={idx} className="flex">
              <span className="mr-4 inline-block w-8 shrink-0 select-none text-right text-white/35">
                {idx + 1}
              </span>
              <span className="whitespace-pre">{highlightLine(line, language)}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

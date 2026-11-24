import React, {useMemo} from 'react';
import katex from 'katex';

interface MathFormulaProps {
  tex: string;
  display?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  tex,
  display = false,
  className = '',
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return tex;
    }
  }, [tex, display]);

  if (display) {
    return (
      <div
        className={`my-2 overflow-x-auto py-1 text-center ${className}`}
        dangerouslySetInnerHTML={{__html: html}}
      />
    );
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
};

import React, {useEffect, useRef} from 'react';
import * as echarts from 'echarts';
import type {EChartsOption} from 'echarts';

interface LegoChartProps {
  option: EChartsOption;
  height?: number;
  ariaLabel: string;
}

export const LegoChart: React.FC<LegoChartProps> = ({
  option,
  height = 300,
  ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = echarts.init(containerRef.current);
    chartRef.current = instance;

    const ro = new ResizeObserver(() => {
      instance.resize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      instance.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(option, true);
  }, [option]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      style={{height: `${height}px`, width: '100%'}}
    />
  );
};

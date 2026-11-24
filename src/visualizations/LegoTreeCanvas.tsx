import React, {useMemo, useRef, useState} from 'react';
import {Maximize, ZoomIn, ZoomOut} from 'lucide-react';
import {formatBigIntBrick, formatBigIntFull} from '../algorithms/parser';
import type {SimulationTrace, TreeNodeData} from '../types/algorithm';

interface LegoTreeCanvasProps {
  trace: SimulationTrace;
  visibleStep: number;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  collapseVirtualThreshold?: number;
}

interface PositionedNode {
  id: string;
  x: number;
  y: number;
  node: TreeNodeData;
  collapsedVirtualCount?: number;
}

interface TreeEdge {
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  isActiveStep: boolean;
}

const BRICK_COLORS: Record<number, {face: string; edge: string; ink: string}> = {
  0: {face: '#e74636', edge: '#a62824', ink: '#ffffff'},
  1: {face: '#f6c823', edge: '#b2820d', ink: '#2b271e'},
  2: {face: '#2f79c3', edge: '#1c508d', ink: '#ffffff'},
  3: {face: '#35925b', edge: '#1e613d', ink: '#ffffff'},
};

const NODE_W = 86;
const NODE_H = 44;
const LEVEL_Y = 104;
const LEAF_X_GAP = 108;

export const LegoTreeCanvas: React.FC<LegoTreeCanvasProps> = ({
  trace,
  visibleStep,
  selectedNodeId,
  onSelectNode,
  collapseVirtualThreshold = 6,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x: 0, y: 0});
  const [expandVirtuals, setExpandVirtuals] = useState(false);
  const draggingRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({active: false, startX: 0, startY: 0, origX: 0, origY: 0});

  const virtualTotal = trace.virtualZeroCount;
  const shouldCollapseVirtuals =
    trace.usedVirtualPadding &&
    !expandVirtuals &&
    virtualTotal > collapseVirtualThreshold;

  // Build visible forest roots at `visibleStep`
  const {positioned, edges, canvasWidth, canvasHeight} = useMemo(() => {
    if (trace.truncatedForVisual || Object.keys(trace.nodes).length === 0) {
      return {positioned: [], edges: [], canvasWidth: 680, canvasHeight: 300};
    }

    const visibleNodeIds = new Set<string>();
    for (const node of Object.values(trace.nodes)) {
      if (node.createdAtStep <= visibleStep) {
        visibleNodeIds.add(node.id);
      }
    }

    // Roots of the forest at `visibleStep`: visible nodes whose parent is not yet created
    const roots: TreeNodeData[] = [];
    for (const id of visibleNodeIds) {
      const node = trace.nodes[id];
      if (!node.parentId || !visibleNodeIds.has(node.parentId)) {
        roots.push(node);
      }
    }
    roots.sort((a, b) => {
      if (a.isVirtual !== b.isVirtual) return a.isVirtual ? -1 : 1;
      if (a.createdAtStep !== b.createdAtStep) return b.createdAtStep - a.createdAtStep;
      return a.id.localeCompare(b.id);
    });

    // Helper: filter children when collapsing large groups of virtual zeros
    const getDisplayChildren = (
      node: TreeNodeData,
    ): Array<{id: string; collapsedCount?: number; edgeLabel: string}> => {
      const rawChildren = node.childrenIds.filter((cid) => visibleNodeIds.has(cid));
      if (!shouldCollapseVirtuals) {
        return rawChildren.map((cid, idx) => ({
          id: cid,
          edgeLabel: String(idx),
        }));
      }
      const virtualChildren = rawChildren.filter((cid) => trace.nodes[cid]?.isVirtual);
      if (virtualChildren.length <= collapseVirtualThreshold) {
        return rawChildren.map((cid, idx) => ({
          id: cid,
          edgeLabel: String(idx),
        }));
      }
      const result: Array<{id: string; collapsedCount?: number; edgeLabel: string}> = [];
      let collapsedEmitted = false;
      rawChildren.forEach((cid, idx) => {
        if (trace.nodes[cid]?.isVirtual) {
          if (!collapsedEmitted) {
            collapsedEmitted = true;
            result.push({
              id: cid,
              collapsedCount: virtualChildren.length,
              edgeLabel: `0..${virtualChildren.length - 1}`,
            });
          }
        } else {
          result.push({id: cid, edgeLabel: String(idx)});
        }
      });
      return result;
    };

    // Collapse top-level virtual zero roots if visibleStep === 0 and many virtuals exist
    const displayRoots: Array<{node: TreeNodeData; collapsedCount?: number}> = [];
    if (shouldCollapseVirtuals) {
      const vRoots = roots.filter((r) => r.isVirtual);
      if (vRoots.length > collapseVirtualThreshold) {
        displayRoots.push({node: vRoots[0], collapsedCount: vRoots.length});
        roots
          .filter((r) => !r.isVirtual)
          .forEach((r) => displayRoots.push({node: r}));
      } else {
        roots.forEach((r) => displayRoots.push({node: r}));
      }
    } else {
      roots.forEach((r) => displayRoots.push({node: r}));
    }

    const posMap = new Map<string, PositionedNode>();
    const edgeList: TreeEdge[] = [];
    let leafCursor = 0;
    let maxDepthSeen = 0;

    const layoutSubtree = (
      node: TreeNodeData,
      depth: number,
      collapsedCount?: number,
    ): number => {
      maxDepthSeen = Math.max(maxDepthSeen, depth);
      const children = collapsedCount ? [] : getDisplayChildren(node);
      let cx: number;

      if (children.length === 0) {
        cx = 70 + leafCursor * LEAF_X_GAP;
        leafCursor++;
      } else {
        const childXs = children.map((c) =>
          layoutSubtree(trace.nodes[c.id], depth + 1, c.collapsedCount),
        );
        cx = (childXs[0] + childXs[childXs.length - 1]) / 2;
      }

      const cy = 54 + depth * LEVEL_Y;
      posMap.set(node.id, {
        id: node.id,
        x: cx,
        y: cy,
        node,
        collapsedVirtualCount: collapsedCount,
      });

      for (const c of children) {
        const childPos = posMap.get(c.id);
        if (childPos) {
          edgeList.push({
            fromId: node.id,
            toId: c.id,
            x1: cx,
            y1: cy + NODE_H / 2 + 4,
            x2: childPos.x,
            y2: childPos.y - NODE_H / 2 - 8,
            label: c.edgeLabel,
            isActiveStep: node.createdAtStep === visibleStep && visibleStep > 0,
          });
        }
      }
      return cx;
    };

    displayRoots.forEach((r) => {
      layoutSubtree(r.node, 0, r.collapsedCount);
      leafCursor += 0.35; // gentle gap between separate forest trees
    });

    const width = Math.max(640, Math.round(leafCursor * LEAF_X_GAP + 100));
    const height = Math.max(300, (maxDepthSeen + 1) * LEVEL_Y + 90);
    return {
      positioned: Array.from(posMap.values()),
      edges: edgeList,
      canvasWidth: width,
      canvasHeight: height,
    };
  }, [trace, visibleStep, shouldCollapseVirtuals, collapseVirtualThreshold]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).closest('[data-tree-node="true"]')) return;
    draggingRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current.active) return;
    setPan({
      x: draggingRef.current.origX + (e.clientX - draggingRef.current.startX),
      y: draggingRef.current.origY + (e.clientY - draggingRef.current.startY),
    });
  };

  const handlePointerUp = () => {
    draggingRef.current.active = false;
  };

  const resetView = () => {
    setZoom(1);
    setPan({x: 0, y: 0});
  };

  const activeStepMergedId =
    visibleStep > 0 ? trace.steps[visibleStep - 1]?.mergedItem.id : null;

  return (
    <div className="lego-baseplate relative overflow-hidden">
      {/* Canvas Controls Overlay */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#25262a] bg-[#fffdf8] px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#53535a]">
          <span>拖动空白处平移 · 点击积木节点查看详情</span>
          {trace.usedVirtualPadding && virtualTotal > collapseVirtualThreshold && (
            <button
              type="button"
              onClick={() => setExpandVirtuals((v) => !v)}
              className="rounded border border-[#25262a] bg-[#ffe899] px-2 py-0.5 text-[11px] font-bold text-[#2b271e] cursor-pointer"
            >
              {expandVirtuals
                ? `折叠 ${virtualTotal} 个虚拟零节点`
                : `已折叠 ${virtualTotal} 个虚拟零节点（点此展开）`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            aria-label="缩小树画布"
            className="flex h-9 w-9 items-center justify-center rounded border-2 border-[#25262a] bg-[#fffdf8] hover:bg-[#f4f1e9] cursor-pointer"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center font-mono text-xs font-bold tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            aria-label="放大树画布"
            className="flex h-9 w-9 items-center justify-center rounded border-2 border-[#25262a] bg-[#fffdf8] hover:bg-[#f4f1e9] cursor-pointer"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="重置视图"
            className="inline-flex h-9 items-center gap-1 rounded border-2 border-[#25262a] bg-[#fffdf8] px-2.5 text-xs font-bold hover:bg-[#f4f1e9] cursor-pointer"
          >
            <Maximize className="h-3.5 w-3.5" />
            重置
          </button>
        </div>
      </div>

      {/* Interactive SVG Viewport */}
      <div className="h-[420px] w-full cursor-grab active:cursor-grabbing sm:h-[470px]">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setZoom((z) =>
                Math.max(0.4, Math.min(2.2, Number((z - e.deltaY * 0.0015).toFixed(2)))),
              );
            }
          }}
          className="touch-none select-none"
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Tree Edges */}
            {edges.map((edge) => {
              const mx = (edge.x1 + edge.x2) / 2;
              const my = (edge.y1 + edge.y2) / 2;
              return (
                <g key={`${edge.fromId}-${edge.toId}`}>
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={edge.isActiveStep ? '#e74636' : '#25262a'}
                    strokeWidth={edge.isActiveStep ? 3.2 : 2.2}
                    strokeLinecap="round"
                  />
                  {/* Edge code digit plate */}
                  <rect
                    x={mx - 12}
                    y={my - 9}
                    width={24}
                    height={18}
                    rx={4}
                    fill={edge.isActiveStep ? '#f6c823' : '#fffdf8'}
                    stroke="#25262a"
                    strokeWidth={1.6}
                  />
                  <text
                    x={mx}
                    y={my + 4}
                    textAnchor="middle"
                    fill="#25262a"
                    fontSize="11"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="700"
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* LEGO Brick Nodes */}
            {positioned.map((p) => {
              const {node} = p;
              const isSelected = selectedNodeId === node.id;
              const isNewMerge = node.id === activeStepMergedId;
              const palette = BRICK_COLORS[node.colorIndex] ?? BRICK_COLORS[2];
              const left = p.x - NODE_W / 2;
              const top = p.y - NODE_H / 2;
              const label = p.collapsedVirtualCount
                ? `0 ×${p.collapsedVirtualCount}`
                : node.isVirtual
                  ? '0 (虚)'
                  : formatBigIntBrick(node.weight);

              return (
                <g
                  key={node.id}
                  data-tree-node="true"
                  onClick={() => onSelectNode(node.id)}
                  className="cursor-pointer"
                >
                  <title>
                    {node.isVirtual
                      ? '虚拟零权值节点'
                      : `权值 ${formatBigIntFull(node.weight)} · 深度 ${node.depth}`}
                  </title>

                  {/* Selection or current merge halo */}
                  {(isSelected || isNewMerge) && (
                    <rect
                      x={left - 5}
                      y={top - 13}
                      width={NODE_W + 10}
                      height={NODE_H + 23}
                      rx={9}
                      fill="none"
                      stroke={isSelected ? '#2f79c3' : '#f6c823'}
                      strokeWidth={3.5}
                    />
                  )}

                  {/* Top 3 LEGO Studs */}
                  {[0, 1, 2].map((s) => (
                    <rect
                      key={s}
                      x={left + 11 + s * 24}
                      y={top - 7}
                      width={16}
                      height={8}
                      rx={3}
                      fill={node.isVirtual ? '#f4f1e9' : palette.face}
                      stroke="#25262a"
                      strokeWidth={2}
                      strokeDasharray={node.isVirtual ? '3 2' : undefined}
                    />
                  ))}

                  {/* Bottom 3D Edge Lip */}
                  <rect
                    x={left}
                    y={top + 5}
                    width={NODE_W}
                    height={NODE_H}
                    rx={5}
                    fill={node.isVirtual ? '#d5cfc0' : palette.edge}
                    stroke="#25262a"
                    strokeWidth={2}
                  />

                  {/* Main Brick Face */}
                  <rect
                    x={left}
                    y={top}
                    width={NODE_W}
                    height={NODE_H}
                    rx={5}
                    fill={node.isVirtual ? '#fffdf8' : palette.face}
                    stroke="#25262a"
                    strokeWidth={2}
                    strokeDasharray={node.isVirtual ? '4 2' : undefined}
                  />

                  {/* Weight Text */}
                  <text
                    x={p.x}
                    y={p.y + 4}
                    textAnchor="middle"
                    fill={node.isVirtual ? '#53535a' : palette.ink}
                    fontSize={label.length > 6 ? '11' : '15'}
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="800"
                  >
                    {label}
                  </text>

                  {/* Leaf code & depth caption below final leaf */}
                  {node.isLeaf && !node.isVirtual && visibleStep === trace.steps.length && (
                    <text
                      x={p.x}
                      y={p.y + NODE_H / 2 + 20}
                      textAnchor="middle"
                      fill="#25262a"
                      fontSize="11"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="700"
                    >
                      d={node.depth} · {node.code || '0'}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

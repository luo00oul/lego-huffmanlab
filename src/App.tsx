import React, {useEffect, useState} from 'react';
import {Presentation} from 'lucide-react';
import {DatasetProvider, useDataset} from './hooks/useDataset';
import {useHashRoute} from './hooks/useHashRoute';
import {PresentationBar} from './components/PresentationBar';
import {WorkshopPage} from './pages/WorkshopPage';
import {AlgorithmLabPage} from './pages/AlgorithmLabPage';
import {HuffmanTreePage} from './pages/HuffmanTreePage';
import {ChallengePage} from './pages/ChallengePage';
import {StrategyLabPage} from './pages/StrategyLabPage';
import {BenchmarkPage} from './pages/BenchmarkPage';
import {DocumentationPage} from './pages/DocumentationPage';
import type {PageRoute} from './types/algorithm';

const NAV_ITEMS: Array<{id: PageRoute; label: string}> = [
  {id: 'workshop', label: '积木工坊'},
  {id: 'lab', label: '算法实验室'},
  {id: 'tree', label: '积木树'},
  {id: 'challenge', label: '积木挑战'},
  {id: 'strategy', label: '策略研究'},
  {id: 'benchmark', label: '性能分析'},
  {id: 'docs', label: '算法百科'},
];

const AppShell: React.FC = () => {
  const [route, navigate] = useHashRoute();
  const [presentationMode, setPresentationMode] = useState(false);
  const {loadClassic} = useDataset();

  // Presentation Mode global keyboard shortcuts (all mirrored by visible touch buttons)
  useEffect(() => {
    if (!presentationMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        setPresentationMode(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        loadClassic();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [presentationMode, loadClassic]);

  return (
    <div className={`min-h-screen flex flex-col ${presentationMode ? 'presentation-mode' : ''}`}>
      {/* Presentation Mode Bar OR Standard 3-Zone Top Bar Contract */}
      {presentationMode ? (
        <PresentationBar
          activeRoute={route}
          onNavigate={navigate}
          onExit={() => {
            setPresentationMode(false);
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
          }}
          onLoadClassic={loadClassic}
        />
      ) : (
        <header className="sticky top-0 z-30 border-b-2 border-[#25262a] bg-[#f4f1e9]/95 backdrop-blur-xs">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-8 px-4 py-3 md:px-6">
            {/* Zone 1: Single-line Brand Wordmark */}
            <a
              href="#/workshop"
              onClick={(e) => {
                e.preventDefault();
                navigate('workshop');
              }}
              className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#25262a] whitespace-nowrap shrink-0"
            >
              <span
                aria-hidden="true"
                className="relative flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#25262a] bg-[#e74636] text-xs font-extrabold text-white shadow-[2px_2px_0_#25262a]"
              >
                H
              </span>
              <span>
                LEGO <span className="text-[#e74636]">HuffmanLab</span>
              </span>
            </a>

            {/* Zone 2: Clean Single-Line Text Navigation */}
            <nav
              aria-label="主导航"
              className="hidden lg:flex items-center gap-6 text-sm font-bold text-[#53535a]"
            >
              {NAV_ITEMS.map((item) => {
                const active = route === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#/${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.id);
                    }}
                    className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'text-[#25262a] after:absolute after:inset-x-0 after:-bottom-1 after:h-[3px] after:rounded-full after:bg-[#e74636]'
                        : 'hover:text-[#25262a]'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* Zone 3: Single Primary Action */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setPresentationMode(true)}
                className="lego-btn lego-btn-yellow text-xs md:text-sm"
              >
                <Presentation className="h-4 w-4" />
                演示模式
              </button>
            </div>
          </div>

          {/* Mobile / Tablet Single-Line Scrollable Nav Strip */}
          <nav
            aria-label="移动端导航"
            className="flex items-center gap-4 overflow-x-auto border-t border-[#25262a]/15 px-4 py-2 text-xs font-bold text-[#53535a] lg:hidden"
          >
            {NAV_ITEMS.map((item) => {
              const active = route === item.id;
              return (
                <a
                  key={item.id}
                  href={`#/${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.id);
                  }}
                  className={`min-h-[34px] inline-flex items-center whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-[#e74636] text-[#25262a]'
                      : 'border-transparent hover:text-[#25262a]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </header>
      )}

      {/* Main Content Workspace */}
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 md:px-6 md:py-7">
        {route === 'workshop' && <WorkshopPage onNavigate={navigate} />}
        {route === 'lab' && (
          <AlgorithmLabPage
            onNavigate={navigate}
            presentationMode={presentationMode}
          />
        )}
        {route === 'tree' && (
          <HuffmanTreePage presentationMode={presentationMode} />
        )}
        {route === 'challenge' && (
          <ChallengePage presentationMode={presentationMode} />
        )}
        {route === 'strategy' && (
          <StrategyLabPage
            onNavigate={navigate}
            presentationMode={presentationMode}
          />
        )}
        {route === 'benchmark' && <BenchmarkPage />}
        {route === 'docs' && <DocumentationPage />}
      </main>

      {/* Clean Minimal Footer */}
      {!presentationMode && (
        <footer className="mt-10 border-t-2 border-[#25262a]/20 bg-[#f4f1e9]/90 px-4 py-5 text-xs text-[#53535a]">
          <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3">
            <span>
              LEGO HuffmanLab · 湖南大学《算法设计与分析》实现题 4-14 课程作品
            </span>
            <span>
              积木造型为原创几何绘制，未使用第三方官方标志，全部算法均在本地浏览器运行。
            </span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default function App() {
  return (
    <DatasetProvider>
      <AppShell />
    </DatasetProvider>
  );
}

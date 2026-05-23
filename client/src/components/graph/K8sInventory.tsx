import { useMemo, useState } from 'react';
import { ChevronRight, Box } from 'lucide-react';
import { getK8sResourceConfig } from '../../config/k8s-resources';
import { K8sNodeDetailPanel } from './K8sNodeDetailPanel';
import type { GraphData } from '../../hooks/useGraph';

interface Props {
  graphData: GraphData;
  namespace: string;
  searchQuery: string;
}

type Node = GraphData['nodes'][number];

const READY_STATUSES = ['Running', 'Active', 'Bound', 'Ready', 'Available', 'Complete', 'Succeeded'];

function matchesSearch(node: Node, query: string): boolean {
  const vals = [node.label, node.id, ...Object.values(node.metadata || {}).filter(v => typeof v === 'string')]
    .map(v => String(v).toLowerCase());
  return vals.some(v => v.includes(query));
}

export function K8sInventory({ graphData, namespace, searchQuery }: Props) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const query = searchQuery.trim().toLowerCase();

  const { typeOrder, groups } = useMemo(() => {
    const groups: Record<string, Node[]> = {};
    for (const node of graphData.nodes) {
      if (query && !matchesSearch(node, query)) continue;
      (groups[node.type] ||= []).push(node);
    }
    const typeOrder = Object.keys(groups).sort((a, b) => {
      const ca = getK8sResourceConfig(a);
      const cb = getK8sResourceConfig(b);
      return (ca?.groupOrder ?? 99) - (cb?.groupOrder ?? 99);
    });
    return { typeOrder, groups };
  }, [graphData, query]);

  const allFiltered = typeOrder.flatMap(t => groups[t]);
  const seenGroups = new Set<string>();

  return (
    <div className="relative flex h-full min-w-0">
      <div className="flex-1 min-w-0 overflow-y-auto">
        {allFiltered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">{query ? 'No resources match your search.' : 'No resources found.'}</p>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-5 max-w-5xl mx-auto">
            {/* Overall summary */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 rounded-lg border border-surface-600 bg-surface-900 px-4 py-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-100">{allFiltered.length}</span>
                <span className="text-[11px] text-gray-500 uppercase tracking-wider">resources</span>
              </div>
              <div className="w-px h-8 bg-surface-600 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">namespace</span>
                <span className="text-[11px] font-mono text-neon-purple">{namespace}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:ml-auto">
                <span className="text-sm font-semibold text-gray-300">{typeOrder.length}</span>
                <span className="text-[11px] text-gray-500">resource types</span>
              </div>
            </div>

            {typeOrder.map(type => {
              const config = getK8sResourceConfig(type);
              const nodes = groups[type];
              const Icon = config?.icon || Box;
              const iconColor = config?.iconColor || 'text-gray-400';
              const groupName = config?.group || 'Other';
              const isOpen = query ? true : !collapsed[type];
              const readyCount = nodes.filter(n => READY_STATUSES.includes(n.status)).length;

              const showCategory = !seenGroups.has(groupName);
              if (showCategory) seenGroups.add(groupName);

              return (
                <div key={type}>
                  {showCategory && (
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2 mt-1">
                      {groupName}
                    </div>
                  )}
                  <div className="rounded-lg border border-surface-600 bg-surface-900 overflow-hidden mb-2.5">
                    <button
                      onClick={() => setCollapsed(c => ({ ...c, [type]: !c[type] }))}
                      className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-surface-800/60 transition-colors text-left"
                    >
                      <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
                      <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                      <span className="text-sm font-semibold text-gray-200">{config?.label || type}</span>
                      <span className="text-xs font-bold text-gray-400 px-1.5 py-0.5 rounded bg-surface-700">{nodes.length}</span>
                      {readyCount > 0 && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-neon-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />{readyCount} ready
                        </span>
                      )}
                    </button>

                    {isOpen && (
                      <div className="border-t border-surface-700 divide-y divide-surface-800">
                        {nodes.map(node => {
                          const isReady = READY_STATUSES.includes(node.status);
                          return (
                            <button
                              key={node.id}
                              onClick={() => setSelectedNode(node)}
                              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-left hover:bg-surface-800/60 transition-colors ${
                                selectedNode?.id === node.id ? 'bg-surface-800' : ''
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isReady ? 'bg-neon-green' : 'bg-gray-600'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-200 truncate font-mono">{node.label}</div>
                              </div>
                              {node.status && (
                                <span className="text-[10px] text-gray-500 shrink-0">{node.status}</span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedNode && (
        <>
          <button
            type="button"
            aria-label="Close resource details"
            onClick={() => setSelectedNode(null)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
          <K8sNodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </>
      )}
    </div>
  );
}

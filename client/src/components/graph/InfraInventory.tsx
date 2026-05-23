import { useMemo, useState } from 'react';
import { ChevronRight, Shield, AlertTriangle, Server } from 'lucide-react';
import { getCloudResourceConfig, RESOURCE_GROUPS_ORDER, type CloudProvider } from '../../config/cloud-resources';
import { NodeDetailPanel } from './NodeDetailPanel';
import type { GraphData } from '../../hooks/useGraph';

interface Props {
  graphData: GraphData;
  cloud?: CloudProvider;
  searchQuery: string;
}

type Node = GraphData['nodes'][number];

function matchesSearch(node: Node, query: string): boolean {
  const vals = [node.label, node.id, ...Object.values(node.metadata || {}).filter(v => typeof v === 'string')]
    .map(v => String(v).toLowerCase());
  return vals.some(v => v.includes(query));
}

export function InfraInventory({ graphData, cloud = 'aws', searchQuery }: Props) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const query = searchQuery.trim().toLowerCase();

  // Group nodes by type, filtered by search
  const { typeOrder, groups } = useMemo(() => {
    const groups: Record<string, Node[]> = {};
    for (const node of graphData.nodes) {
      if (query && !matchesSearch(node, query)) continue;
      (groups[node.type] ||= []).push(node);
    }
    const typeOrder = Object.keys(groups).sort((a, b) => {
      const ca = getCloudResourceConfig(a, cloud);
      const cb = getCloudResourceConfig(b, cloud);
      const order = [...RESOURCE_GROUPS_ORDER];
      const ga = ca ? order.indexOf(ca.group as any) : 99;
      const gb = cb ? order.indexOf(cb.group as any) : 99;
      if (ga !== gb) return ga - gb;
      return (ca?.label || a).localeCompare(cb?.label || b);
    });
    return { typeOrder, groups };
  }, [graphData, cloud, query]);

  // Top-level summary numbers (over filtered set)
  const allFiltered = typeOrder.flatMap(t => groups[t]);
  const totalManaged = allFiltered.filter(n => !n.isManual).length;
  const totalManual = allFiltered.filter(n => n.isManual).length;

  // Category headers (resource group) – emitted once before its first type
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
                <Shield className="w-4 h-4 text-neon-green" />
                <span className="text-sm font-semibold text-neon-green">{totalManaged}</span>
                <span className="text-[11px] text-gray-500">IaC Managed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-neon-red" />
                <span className="text-sm font-semibold text-neon-red">{totalManual}</span>
                <span className="text-[11px] text-gray-500">Manual</span>
              </div>
              <div className="flex items-center gap-1.5 sm:ml-auto">
                <span className="text-sm font-semibold text-gray-300">{typeOrder.length}</span>
                <span className="text-[11px] text-gray-500">resource types</span>
              </div>
            </div>

            {/* Per-type sections, grouped by category */}
            {typeOrder.map(type => {
              const config = getCloudResourceConfig(type, cloud);
              const nodes = groups[type];
              const Icon = config?.icon || Server;
              const iconColor = config?.iconColor || 'text-gray-400';
              const activeStatuses = config?.activeStatuses || [];
              const activeCount = nodes.filter(n => activeStatuses.includes(n.status)).length;
              const iacCount = nodes.filter(n => !n.isManual).length;
              const manualCount = nodes.filter(n => n.isManual).length;
              const groupName = (config?.group as string) || 'Other';
              // search forces expanded; otherwise honor collapsed state (default expanded)
              const isOpen = query ? true : !collapsed[type];

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
                    {/* Type header */}
                    <button
                      onClick={() => setCollapsed(c => ({ ...c, [type]: !c[type] }))}
                      className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-surface-800/60 transition-colors text-left"
                    >
                      <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
                      <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                      <span className="text-sm font-semibold text-gray-200">{config?.label || type.toUpperCase()}</span>
                      <span className="text-xs font-bold text-gray-400 px-1.5 py-0.5 rounded bg-surface-700">{nodes.length}</span>
                      <div className="ml-auto flex items-center gap-3 text-[10px]">
                        {activeCount > 0 && (
                          <span className="flex items-center gap-1 text-neon-green">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />{activeCount} active
                          </span>
                        )}
                        {iacCount > 0 && <span className="text-neon-green/70 hidden sm:inline">{iacCount} IaC</span>}
                        {manualCount > 0 && <span className="text-neon-red/70 hidden sm:inline">{manualCount} manual</span>}
                      </div>
                    </button>

                    {/* Resource rows */}
                    {isOpen && (
                      <div className="border-t border-surface-700 divide-y divide-surface-800">
                        {nodes.map(node => {
                          const isActive = activeStatuses.includes(node.status);
                          const subtitle = typeof node.metadata?.subtitle === 'string' ? node.metadata.subtitle : null;
                          return (
                            <button
                              key={node.id}
                              onClick={() => setSelectedNode(node)}
                              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-left hover:bg-surface-800/60 transition-colors ${
                                selectedNode?.id === node.id ? 'bg-surface-800' : ''
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-neon-green' : 'bg-gray-600'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-200 truncate">{node.label}</div>
                                {subtitle && <div className="text-[10px] text-gray-500 truncate">{subtitle}</div>}
                              </div>
                              <span className="text-[10px] text-gray-500 hidden sm:block shrink-0">{node.status}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                                node.isManual ? 'bg-neon-red/10 text-neon-red' : 'bg-neon-green/10 text-neon-green'
                              }`}>
                                {node.isManual ? 'Manual' : 'IaC'}
                              </span>
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
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </>
      )}
    </div>
  );
}

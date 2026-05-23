import type { GraphData, InfraNode } from '../aws/types.js';

export interface ContextOptions {
  /** Resource types that were actually scanned (from the cached graph row). */
  scannedTypes?: string[];
  /** Whether tags/labels were fetched during the scan. */
  fetchTags?: boolean;
  /** ISO timestamp of the scan that produced this graph. */
  scannedAt?: string | null;
  /** Label used for tags vs labels in the prose ("Tags" for AWS/Azure, "Labels" for GCP). */
  tagWord?: string;
}

const MAX_ARRAY_ITEMS = 12;

function flattenMetadataValue(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    const items = val.slice(0, MAX_ARRAY_ITEMS).map(v =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
    );
    return items.join(', ') + (val.length > MAX_ARRAY_ITEMS ? `, …(+${val.length - MAX_ARRAY_ITEMS} more)` : '');
  }
  if (typeof val === 'object') {
    try {
      const str = JSON.stringify(val);
      return str.length > 400 ? str.slice(0, 400) + '…' : str;
    } catch {
      return null;
    }
  }
  const str = String(val);
  return str.length === 0 ? null : str;
}

/**
 * Builds a comprehensive, reasoning-friendly snapshot of the entire scanned
 * environment. Unlike the old intent-filtered builder, this surfaces EVERY
 * resource with ALL of its metadata and tags plus aggregate indexes (counts,
 * a tag index, relationships) so the LLM can answer cross-resource questions
 * — e.g. "which resources are tagged Environment=production" — without us
 * having to pre-guess the resource type.
 */
export function buildInfraContext(graphData: GraphData, opts: ContextOptions = {}): string {
  const tagWord = opts.tagWord || 'Tags';
  const nodes = graphData.nodes || [];
  if (nodes.length === 0) {
    return 'The scanned environment currently contains no resources.';
  }

  const byType = new Map<string, InfraNode[]>();
  for (const node of nodes) {
    if (!byType.has(node.type)) byType.set(node.type, []);
    byType.get(node.type)!.push(node);
  }

  const managed = nodes.filter(n => !n.isManual).length;
  const manual = nodes.length - managed;
  const tagged = nodes.filter(n => n.tags && Object.keys(n.tags).length > 0).length;

  const parts: string[] = [];

  // ── Snapshot header ──────────────────────────────────────────────────────
  parts.push('=== ENVIRONMENT SNAPSHOT ===');
  parts.push(`Total resources: ${nodes.length}`);
  if (opts.scannedAt) parts.push(`Data captured at: ${opts.scannedAt}`);
  if (opts.scannedTypes?.length) parts.push(`Resource types included in this scan: ${opts.scannedTypes.join(', ')}`);
  parts.push(`${tagWord} fetched during scan: ${opts.fetchTags ? 'yes' : 'no'}`);
  parts.push(`IaC-managed: ${managed} | Manual/unmanaged: ${manual}`);
  parts.push(`With ${tagWord.toLowerCase()}: ${tagged} | Without ${tagWord.toLowerCase()}: ${nodes.length - tagged}`);
  parts.push('');

  // ── Counts by type ───────────────────────────────────────────────────────
  parts.push('=== RESOURCE COUNTS BY TYPE ===');
  for (const [type, list] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
    parts.push(`- ${type}: ${list.length}`);
  }
  parts.push('');

  // ── Tag index (key -> value -> resources) ────────────────────────────────
  const tagIndex = new Map<string, Map<string, string[]>>();
  for (const node of nodes) {
    const tags = node.tags || {};
    for (const [k, v] of Object.entries(tags)) {
      if (!tagIndex.has(k)) tagIndex.set(k, new Map());
      const valMap = tagIndex.get(k)!;
      const val = String(v ?? '');
      if (!valMap.has(val)) valMap.set(val, []);
      valMap.get(val)!.push(node.label || node.id);
    }
  }
  if (tagIndex.size > 0) {
    parts.push(`=== ${tagWord.toUpperCase()} INDEX (key = value → resources) ===`);
    for (const [key, valMap] of tagIndex.entries()) {
      for (const [val, names] of valMap.entries()) {
        const shown = names.slice(0, MAX_ARRAY_ITEMS).join(', ');
        const more = names.length > MAX_ARRAY_ITEMS ? `, …(+${names.length - MAX_ARRAY_ITEMS} more)` : '';
        parts.push(`- ${key} = ${val || '(empty)'} → ${names.length} resource(s): ${shown}${more}`);
      }
    }
    parts.push('');
  }

  // ── Full resource detail ─────────────────────────────────────────────────
  parts.push('=== RESOURCES (full detail) ===');
  for (const [type, list] of byType.entries()) {
    parts.push(`${type.toUpperCase()} (${list.length}):`);
    for (const node of list) {
      const lines: string[] = [];
      lines.push(`  - ${node.label} [${node.id}]`);
      lines.push(`    status: ${node.status}`);
      lines.push(`    managed: ${node.isManual ? 'Manual / unmanaged' : 'IaC-managed'}`);

      const metadata = node.metadata || {};
      for (const [key, val] of Object.entries(metadata)) {
        if (key === 'subtitle') continue;
        const display = flattenMetadataValue(val);
        if (display) lines.push(`    ${key}: ${display}`);
      }

      const tags = node.tags || {};
      const tagKeys = Object.keys(tags);
      if (tagKeys.length > 0) {
        const tagStr = tagKeys.map(k => `${k}=${tags[k]}`).join(', ');
        lines.push(`    ${tagWord.toLowerCase()}: ${tagStr}`);
      } else {
        lines.push(`    ${tagWord.toLowerCase()}: none`);
      }

      parts.push(lines.join('\n'));
    }
    parts.push('');
  }

  // ── Relationships ────────────────────────────────────────────────────────
  const edges = graphData.edges || [];
  if (edges.length > 0) {
    parts.push('=== RELATIONSHIPS ===');
    const nameById = new Map(nodes.map(n => [n.id, n.label || n.id]));
    for (const edge of edges.slice(0, 200)) {
      const s = nameById.get(edge.source) || edge.source;
      const t = nameById.get(edge.target) || edge.target;
      parts.push(`- ${s} ${edge.label || '→'} ${t}`);
    }
    if (edges.length > 200) parts.push(`…(+${edges.length - 200} more relationships)`);
    parts.push('');
  }

  return parts.join('\n');
}

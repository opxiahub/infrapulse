import { useState, useCallback } from 'react';
import { api } from '../lib/api';

interface InfraNode {
  id: string;
  type: string;
  label: string;
  status: string;
  isManual: boolean;
  metadata: Record<string, any>;
  metrics?: Record<string, number>;
  tags?: Record<string, string>;
}

interface InfraEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface GraphData {
  nodes: InfraNode[];
  edges: InfraEdge[];
}

export function useGraph() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [fetchTags, setFetchTags] = useState(false);

  // Load persisted result from DB (no live cloud call)
  const loadCached = useCallback(async (providerId: number) => {
    try {
      const data = await api.get<{
        cached: GraphData | null;
        resourceTypes?: string[];
        scannedAt?: string;
        fetchTags?: boolean;
      }>(`/graph/${providerId}/cached`);

      if (data.cached) {
        setGraphData(data.cached);
        setScannedAt(data.scannedAt || null);
        setActiveTypes(data.resourceTypes || []);
        setFetchTags(data.fetchTags ?? false);
      } else {
        setGraphData(null);
        setScannedAt(null);
        setActiveTypes([]);
        setFetchTags(false);
      }
    } catch {
      // No cached data is fine, silently ignore
    }
  }, []);

  // Live scan (calls the selected cloud provider, then saves to DB)
  const fetchGraph = useCallback(async (providerId: number, types?: string[], withTags?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (types?.length) params.set('types', types.join(','));
      if (withTags) params.set('fetchTags', 'true');
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get<GraphData>(`/graph/${providerId}${query}`);
      setGraphData(data);
      setScannedAt(new Date().toISOString());
      setActiveTypes(types || []);
      setFetchTags(withTags ?? false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { graphData, loading, error, scannedAt, activeTypes, fetchTags, fetchGraph, loadCached, setGraphData };
}

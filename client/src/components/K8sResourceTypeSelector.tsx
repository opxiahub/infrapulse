import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Minus } from 'lucide-react';
import { getK8sResourcesByGroup, K8S_RESOURCE_GROUPS, K8S_RESOURCES, type K8sResourceGroup } from '../config/k8s-resources';

interface Props {
  selected: string[];
  onChange: (types: string[]) => void;
}

export function K8sResourceTypeSelector({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const grouped = getK8sResourcesByGroup();
  const total = K8S_RESOURCES.length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleType = (type: string) => {
    onChange(selected.includes(type) ? selected.filter(t => t !== type) : [...selected, type]);
  };

  const toggleGroup = (group: K8sResourceGroup) => {
    const groupTypes = grouped[group].map(r => r.type);
    const allSelected = groupTypes.every(t => selected.includes(t));
    if (allSelected) {
      onChange(selected.filter(t => !groupTypes.includes(t)));
    } else {
      onChange([...new Set([...selected, ...groupTypes])]);
    }
  };

  const selectAll = () => onChange(K8S_RESOURCES.map(r => r.type));
  const clearAll = () => onChange([]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="input-field flex items-center gap-2 w-auto pr-8 text-xs cursor-pointer"
      >
        <span className="text-gray-300">Resources</span>
        <span className="px-1.5 py-0.5 bg-neon-purple/15 text-neon-purple rounded text-[10px] font-medium">
          {selected.length}/{total}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 absolute right-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface-800 border border-surface-600 rounded-lg shadow-lg z-50 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-600 sticky top-0 bg-surface-800 z-10">
            <span className="text-xs text-gray-400">K8s Resources</span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] text-neon-purple hover:underline">All</button>
              <button onClick={clearAll} className="text-[10px] text-gray-500 hover:underline">None</button>
            </div>
          </div>

          {K8S_RESOURCE_GROUPS.map(group => {
            const resources = grouped[group];
            if (!resources || resources.length === 0) return null;
            const groupTypes = resources.map(r => r.type);
            const selectedInGroup = groupTypes.filter(t => selected.includes(t)).length;
            const allSelected = selectedInGroup === groupTypes.length;
            const someSelected = selectedInGroup > 0 && !allSelected;

            return (
              <div key={group} className="border-b border-surface-700 last:border-0">
                <button
                  onClick={() => toggleGroup(group)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-700 transition-colors"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    allSelected ? 'bg-neon-purple border-neon-purple' : someSelected ? 'bg-surface-600 border-neon-purple/50' : 'border-surface-500'
                  }`}>
                    {allSelected && <Check className="w-2.5 h-2.5 text-surface-900" />}
                    {someSelected && <Minus className="w-2.5 h-2.5 text-neon-purple" />}
                  </div>
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex-1 text-left">{group}</span>
                  <span className="text-[10px] text-gray-600">{selectedInGroup}/{groupTypes.length}</span>
                </button>
                <div className="pl-4">
                  {resources.map(r => {
                    const Icon = r.icon;
                    const isSelected = selected.includes(r.type);
                    return (
                      <label key={r.type} className="flex items-center gap-2 px-3 py-1 hover:bg-surface-700 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleType(r.type)}
                          className="accent-neon-purple w-3 h-3"
                        />
                        <Icon className={`w-3 h-3 ${r.iconColor}`} />
                        <span className={`text-xs ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>{r.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  data: {
    label: string;
    color: string;
    count: number;
  };
}

export function GroupNode({ data }: Props) {
  return (
    <div
      className="w-full h-full rounded-xl border border-dashed"
      style={{
        borderColor: `${data.color}30`,
        background: `${data.color}06`,
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-xl"
        style={{ borderBottom: `1px solid ${data.color}15` }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: `${data.color}AA` }}
        >
          {data.label}
        </span>
        <span
          className="text-[10px] ml-auto px-1.5 py-0.5 rounded"
          style={{
            color: data.color,
            backgroundColor: `${data.color}15`,
          }}
        >
          {data.count}
        </span>
      </div>
    </div>
  );
}

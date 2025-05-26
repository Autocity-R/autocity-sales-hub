
import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedTableProps<T> {
  data: T[];
  height: number;
  itemHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualizedTable<T>({
  data,
  height,
  itemHeight,
  renderRow,
  className = ""
}: VirtualizedTableProps<T>) {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderRow(data[index], index)}
    </div>
  ), [data, renderRow]);

  const itemCount = data.length;

  return (
    <div className={className}>
      <List
        height={height}
        itemCount={itemCount}
        itemSize={itemHeight}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
}

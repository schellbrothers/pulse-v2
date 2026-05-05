import React from 'react';
import { Key, ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T;
  key?: string;
}

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface DataTableProps<T> {
  data: Array<T>;
  columns: Column<T>[];
  onRowClick: (row: T) => void;
}

const DataTable = <T extends object>({ data, columns, onRowClick }: DataTableProps<T>) => {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col, index) => (
            <th key={index}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index} onClick={() => onRowClick(row)}>
            {columns.map((col, index) => (
              <td key={index}>{row[col.accessor] || '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export { DataTable, Column, StatItem };

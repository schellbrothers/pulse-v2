"use client";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder: string;
}

interface Props {
  filters: FilterConfig[];
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  right?: React.ReactNode;
}

const selectStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #1f1f1f",
  borderRadius: 6,
  color: "#ededed",
  fontSize: 12,
  padding: "4px 8px",
  cursor: "pointer",
  outline: "none",
  minWidth: 130,
};

const inputStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #1f1f1f",
  borderRadius: 6,
  color: "#ededed",
  fontSize: 12,
  padding: "4px 10px",
  outline: "none",
  minWidth: 180,
};

export default function FiltersBar({
  filters,
  search,
  onSearch,
  searchPlaceholder = "Search…",
  right,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 24px",
        borderBottom: "1px solid #1f1f1f",
        background: "#0a0a0a",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {filters.map((filter, i) => (
        <select
          key={i}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">{filter.placeholder}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {onSearch !== undefined && (
        <input
          type="text"
          value={search ?? ""}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          style={inputStyle}
        />
      )}

      {right && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {right}
        </div>
      )}
    </div>
  );
}

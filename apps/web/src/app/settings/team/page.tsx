"use client";

import React, { useState } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import DetailPanel from "@/components/DetailPanel";

interface IntegrationStatus {
  zoomPhone: boolean;
  outlook: boolean;
  [key: string]: boolean;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  division: string;
  phone: string;
  active: boolean;
  integrations: IntegrationStatus;
}

const TeamSettingsPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Static roster for now — compile-and-render only; no data fetching.
  const users: User[] = [
    {
      id: 1,
      fullName: "Grace Hoinowski",
      email: "grace@schellbrothers.com",
      role: "OSC",
      division: "Delaware Beaches",
      phone: "+13025699468",
      active: true,
      integrations: { zoomPhone: true, outlook: false },
    },
  ];

  const columns: Column<User>[] = [
    { key: "fullName", label: "Name", render: (_v, row) => row.fullName },
    { key: "email", label: "Email", render: (_v, row) => row.email },
    { key: "role", label: "Role", render: (_v, row) => row.role },
    { key: "division", label: "Division", render: (_v, row) => row.division },
    { key: "phone", label: "Phone", render: (_v, row) => row.phone },
    {
      key: "active",
      label: "Status",
      render: (_v, row) => (row.active ? "Active" : "Inactive"),
    },
    {
      key: "integrations",
      label: "Integrations",
      render: (_v, row) =>
        Object.entries(row.integrations)
          .filter(([, connected]) => connected)
          .map(([name]) => name)
          .join(", ") || "—",
    },
  ];

  return (
    <div
      style={{
        padding: "32px 40px",
        maxWidth: 1000,
        backgroundColor: "#09090b",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>
        Team Settings
      </h1>
      <p style={{ fontSize: 14, color: "#71717a", marginBottom: 32 }}>
        Manage team members and their API integrations.
      </p>

      <DataTable<User>
        columns={columns}
        rows={users}
        onRowClick={(row) => setSelectedUser(row)}
        emptyMessage="No team members yet"
      />

      {selectedUser && (
        <DetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};

export default TeamSettingsPage;

import React, { useState } from 'react';
import Link from 'next/link';
import { DataTable, IntegrationBadge, DetailPanel } from '@/components';

import DataTable from '@/components/DataTable';
import IntegrationBadge from '@/components/IntegrationBadge';
import DetailPanel from '@/components/DetailPanel';
import IntegrationBadge from '@/components/IntegrationBadge';
import DetailPanel from '@/components/DetailPanel';

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

interface IntegrationStatus {
  zoomPhone: boolean;
  outlook: boolean;
  [key: string]: boolean;
}

const TeamSettingsPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const users: User[] = [
    // Fetch this data from the API
    { id: 1, fullName: 'Grace Hoinowski', email: 'grace@schellbrothers.com', role: 'OSC', division: 'Delaware Beaches', phone: '+13025699468', active: true, integrations: { zoomPhone: true, outlook: false } },
    // more users...
  ];

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, backgroundColor: '#09090b', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#fafafa', marginBottom: 8 }}>Team Settings</h1>
      <p style={{ fontSize: 14, color: '#71717a', marginBottom: 32 }}>
        Manage team members and their API integrations.
      </p>

      <DataTable 
        data={users} 
        columns={['Name', 'Email', 'Role', 'Division', 'Phone', 'Status', 'Integrations']} 
        onRowClick={handleUserClick} 
      />

      {selectedUser && 
        <DetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} />
      }
    </div>
  );
};

export default TeamSettingsPage;
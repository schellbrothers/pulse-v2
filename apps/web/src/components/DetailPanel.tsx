import React, { useState } from 'react';

interface DetailPanelProps {
  user: any; // Define a more specific type based on the user model
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <div>Profile Content</div>;
      case 'integrations':
        return <div>Integrations Content</div>;
      case 'activity':
        return <div>Activity Content</div>;
      default:
        return null;
    }
  };

  return (
    <div style={{ position: 'fixed', right: 0, width: '400px', backgroundColor: '#18181b', color: '#fafafa', padding: '20px', height: '100vh' }}>
      <button onClick={onClose} style={{ marginBottom: '20px', backgroundColor: '#27272a' }}>Close</button>
      <h2>{user.fullName}</h2>
      <div>
        <button onClick={() => setActiveTab('profile')}>Profile</button>
        <button onClick={() => setActiveTab('integrations')}>Integrations</button>
        <button onClick={() => setActiveTab('activity')}>Activity</button>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default DetailPanel;

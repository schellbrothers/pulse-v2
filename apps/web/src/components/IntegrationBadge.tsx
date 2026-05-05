import React from 'react';

interface IntegrationBadgeProps {
  type: string;
  connected: boolean;
}

const colorMap: Record<string, string> = {
  zoomPhone: 'blue',
  zoomSms: 'green',
  zoomMeeting: 'purple',
  outlook: 'orange',
  rilla: 'red',
};

const IntegrationBadge: React.FC<IntegrationBadgeProps> = ({ type, connected }) => {
  const color = connected ? colorMap[type] : 'gray';

  return (
    <div style={{ display: 'inline-block', margin: '0 4px', padding: '4px', backgroundColor: color, borderRadius: '50%' }}>
      {type}
    </div>
  );
};

export default IntegrationBadge;

const StatusIndicator = ({ status, className = '' }) => {
  const getStatusColor = () => {
    switch (status?.toUpperCase()) {
      case 'ONLINE':
        return 'bg-green-500';
      case 'OFFLINE':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <span 
      className={`block h-2.5 w-2.5 rounded-full ${getStatusColor()} ${className}`}
      title={status?.toLowerCase() || 'offline'}
    />
  );
};

export default StatusIndicator; 
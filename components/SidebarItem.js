  // components/SidebarItem.js
  import Link from 'next/link';
  import { FaLock } from 'react-icons/fa';
  import StatusIndicator from './StatusIndicator';

  const SidebarItem = ({ channel, isActiveChannel, user, userStatus }) => {
    const isDirect = channel.is_direct;
    // Get the display name for direct messages, remove the extra # for channels
    const displayName = isDirect
      ? user
      : channel.slug || 'Unnamed Channel';

    // Get first letter of username for DM avatar
    const avatarLetter = isDirect 
      ? displayName.charAt(0).toUpperCase()
      : '#';

    return (
      <li className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-slack-hover">
        <Link href={`/channels/${channel.id}`}>
          <a className={`flex items-center gap-2 w-full ${isActiveChannel ? 'font-bold' : ''}`}>
            <div className="relative">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center 
                ${isDirect ? 'bg-gray-400 text-white text-xs' : 'text-sm'}`}>
                {avatarLetter}
              </div>
              {isDirect && (
                <StatusIndicator 
                  status={userStatus} 
                  className="absolute -bottom-0.5 -right-0.5 ring-1 ring-white h-2 w-2"
                />
              )}
            </div>
            <span className="text-sm truncate">{displayName}</span>
          </a>
        </Link>
      </li>
    );
  };

  export default SidebarItem;
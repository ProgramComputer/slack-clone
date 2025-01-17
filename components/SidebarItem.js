  // components/SidebarItem.js
  import { useRouter } from 'next/router';
  import { FaLock } from 'react-icons/fa';
  import StatusIndicator from './StatusIndicator';
  import { useRAGMessages } from '~/lib/hooks/useRAGMessages';
  import ProfilePicture from './ProfilePicture';

  const SidebarItem = ({ channel, isActiveChannel, user, userStatus, otherParticipantID }) => {
    const isDirect = channel.is_direct;
    const { clearAgentMessages } = useRAGMessages();
    const router = useRouter();

    const displayName = isDirect
      ? user
      : channel.slug || 'Unnamed Channel';

    const handleClick = (e) => {
      e.preventDefault();
      clearAgentMessages();
      const path = otherParticipantID 
        ? `/channels/${channel.id}?recipient=${otherParticipantID}`
        : `/channels/${channel.id}`;
      router.push(path);
    };

    return (
      <li className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-slack-hover">
        <a 
          onClick={handleClick} 
          className={`flex items-center gap-2 w-full ${isActiveChannel ? 'font-bold' : ''} cursor-pointer`}
        >
          <div className="relative">
            {isDirect ? (
              <div className="relative">
                <ProfilePicture userId={otherParticipantID} size={24} />
                <StatusIndicator 
                  status={userStatus} 
                  className="absolute -bottom-0.5 -right-0.5 ring-1 ring-white h-2 w-2"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm">
                #
              </div>
            )}
          </div>
          <span className="text-sm truncate">{displayName}</span>
        </a>
      </li>
    );
  };

  export default SidebarItem;
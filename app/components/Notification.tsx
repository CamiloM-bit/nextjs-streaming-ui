import React from  'react';

type NotificationProps = React.SVGProps<SVGSVGElement>;

const Notification = ({ className, ...props }: NotificationProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 19v-9a6 6 0 0 1 6-6 6 6 0 0 1 6 6v9M6 19h12M6 19H4m14 0h2m-9 3h2"
      />
      <circle cx="12" cy="3" r="1" />
    </svg>
  );
};

export default Notification;
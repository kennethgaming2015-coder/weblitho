import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DeviceType = 'desktop' | 'laptop' | 'tablet' | 'mobile';

interface DeviceFrameProps {
  device: DeviceType;
  children: ReactNode;
  className?: string;
}

const deviceConfigs = {
  desktop: {
    width: '100%',
    height: '100%',
    frameClass: '',
    screenClass: '',
    hasNotch: false,
    hasHomeButton: false,
  },
  laptop: {
    width: '1024px',
    height: '640px',
    frameClass: 'bg-[#1a1a1a] rounded-t-xl p-[6px] pb-0',
    screenClass: 'rounded-t-lg',
    hasNotch: false,
    hasHomeButton: false,
  },
  tablet: {
    width: '768px',
    height: '1024px',
    frameClass: 'bg-[#1a1a1a] rounded-[2.5rem] p-3',
    screenClass: 'rounded-[2rem]',
    hasNotch: false,
    hasHomeButton: true,
  },
  mobile: {
    width: '375px',
    height: '812px',
    frameClass: 'bg-[#1a1a1a] rounded-[3rem] p-3',
    screenClass: 'rounded-[2.5rem]',
    hasNotch: true,
    hasHomeButton: false,
  },
};

export const DeviceFrame = ({ device, children, className }: DeviceFrameProps) => {
  const config = deviceConfigs[device];

  if (device === 'desktop') {
    return (
      <div className={cn('w-full h-full', className)}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'relative shadow-2xl',
        config.frameClass,
        className
      )}
      style={{ 
        width: config.width, 
        maxHeight: config.height,
      }}
    >
      {/* Camera / Speaker bar for laptop */}
      {device === 'laptop' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#0a0a0a] rounded-b-lg flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2a2a2a]" />
        </div>
      )}

      {/* Notch for mobile */}
      {config.hasNotch && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-32 h-7 bg-[#1a1a1a] rounded-b-2xl flex items-center justify-center gap-2">
          <div className="w-12 h-1.5 rounded-full bg-[#0a0a0a]" />
        </div>
      )}

      {/* Screen content */}
      <div 
        className={cn(
          'relative bg-white overflow-hidden',
          config.screenClass
        )}
        style={{ height: `calc(${config.height} - 24px)` }}
      >
        {children}
      </div>

      {/* Home button for tablet */}
      {config.hasHomeButton && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 border-[#2a2a2a]" />
      )}

      {/* Laptop base */}
      {device === 'laptop' && (
        <div className="w-[110%] h-4 bg-[#2a2a2a] rounded-b-xl -ml-[5%] flex items-center justify-center">
          <div className="w-24 h-1.5 bg-[#1a1a1a] rounded-full" />
        </div>
      )}
    </div>
  );
};

// Viewport selector component
interface ViewportSelectorProps {
  current: DeviceType;
  onChange: (device: DeviceType) => void;
}

export const ViewportSelector = ({ current, onChange }: ViewportSelectorProps) => {
  const devices: { type: DeviceType; icon: string; label: string }[] = [
    { type: 'desktop', icon: '🖥️', label: 'Desktop' },
    { type: 'laptop', icon: '💻', label: 'Laptop' },
    { type: 'tablet', icon: '📱', label: 'Tablet' },
    { type: 'mobile', icon: '📲', label: 'Mobile' },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
      {devices.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            current === type 
              ? 'bg-background shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={label}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

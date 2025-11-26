import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect wallet',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: 'Disconnected',
      description: 'Wallet disconnected successfully',
    });
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="px-3 py-2 bg-primary/10 rounded-md text-sm font-mono text-foreground">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect}>
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isPending}>
      <Wallet className="h-4 w-4" />
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
};

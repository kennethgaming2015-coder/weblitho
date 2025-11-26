import { useState } from 'react';
import { Abi, AbiFunction, Address, parseEther } from 'viem';
import { useContractWrite } from '@/hooks/useContractWrite';
import { useAccount, useEstimateGas } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContractWriteFunctionProps {
  address: Address;
  abi: Abi;
  func: AbiFunction;
}

export const ContractWriteFunction = ({ address, abi, func }: ContractWriteFunctionProps) => {
  const [args, setArgs] = useState<any[]>([]);
  const [ethValue, setEthValue] = useState('');
  const { isConnected } = useAccount();
  const { write, isPending, isConfirming, isSuccess, hash, error } = useContractWrite({ address, abi });
  const { toast } = useToast();

  const handleInputChange = (index: number, value: string) => {
    const newArgs = [...args];
    newArgs[index] = value;
    setArgs(newArgs);
  };

  const handleWrite = async () => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const value = ethValue ? parseEther(ethValue) : undefined;
      await write(func.name, args, value);
    } catch (err) {
      console.error('Write error:', err);
    }
  };

  const hasInputs = func.inputs && func.inputs.length > 0;
  const isPayable = func.stateMutability === 'payable';

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-mono flex items-center gap-2">
          {func.name}
          {isPayable && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              payable
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {func.stateMutability === 'payable' ? 'Payable transaction' : 'State-changing transaction'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasInputs && (
          <div className="space-y-2">
            {func.inputs?.map((input: any, index: number) => (
              <div key={index}>
                <Label className="text-xs font-mono">
                  {input.name || `arg${index}`} ({input.type})
                </Label>
                <Input
                  placeholder={input.type}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  className="font-mono text-sm"
                  disabled={isPending || isConfirming}
                />
              </div>
            ))}
          </div>
        )}

        {isPayable && (
          <div>
            <Label className="text-xs font-mono">Value (TICS)</Label>
            <Input
              type="number"
              step="0.000001"
              placeholder="0.0"
              value={ethValue}
              onChange={(e) => setEthValue(e.target.value)}
              className="font-mono text-sm"
              disabled={isPending || isConfirming}
            />
          </div>
        )}
        
        <Button 
          onClick={handleWrite}
          disabled={!isConnected || isPending || isConfirming}
          className="w-full"
          size="sm"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {isPending ? 'Confirming...' : 'Processing...'}
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle className="h-3 w-3" />
              Success
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              Execute
            </>
          )}
        </Button>

        {error && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}

        {hash && (
          <div className="p-3 bg-primary/5 border border-primary/10 rounded space-y-1">
            <div className="text-xs text-muted-foreground">Transaction Hash:</div>
            <a 
              href={`https://explorer.qubetics.com/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline break-all"
            >
              {hash}
            </a>
          </div>
        )}

        {isSuccess && (
          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Transaction confirmed successfully
          </div>
        )}
      </CardContent>
    </Card>
  );
};

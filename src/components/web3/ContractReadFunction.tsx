import { useState } from 'react';
import { Abi, AbiFunction, Address } from 'viem';
import { useContractRead } from '@/hooks/useContractRead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, Loader2 } from 'lucide-react';

interface ContractReadFunctionProps {
  address: Address;
  abi: Abi;
  func: AbiFunction;
}

export const ContractReadFunction = ({ address, abi, func }: ContractReadFunctionProps) => {
  const [args, setArgs] = useState<any[]>([]);
  const [shouldRead, setShouldRead] = useState(false);
  
  const { data, isLoading, error, refetch } = useContractRead({
    address,
    abi,
    functionName: func.name,
    args: shouldRead ? args : undefined,
  });

  const handleInputChange = (index: number, value: string) => {
    const newArgs = [...args];
    newArgs[index] = value;
    setArgs(newArgs);
  };

  const handleRead = () => {
    setShouldRead(true);
    setTimeout(() => refetch(), 0);
  };

  const hasInputs = func.inputs && func.inputs.length > 0;

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-mono">{func.name}</CardTitle>
        {func.outputs && func.outputs.length > 0 && (
          <CardDescription className="font-mono text-xs">
            Returns: {func.outputs.map((o: any) => o.type).join(', ')}
          </CardDescription>
        )}
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
                />
              </div>
            ))}
          </div>
        )}
        
        <Button 
          onClick={handleRead} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Reading...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Read
            </>
          )}
        </Button>

        {error && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            {error.message}
          </div>
        )}

        {data !== undefined && (
          <div className="p-3 bg-primary/5 border border-primary/10 rounded">
            <div className="text-xs text-muted-foreground mb-1">Result:</div>
            <div className="font-mono text-sm text-foreground break-all">
              {typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

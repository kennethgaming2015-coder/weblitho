import { useState, useEffect } from 'react';
import { Abi, AbiFunction, Address, parseAbi } from 'viem';
import { WalletConnect } from './WalletConnect';
import { ContractReadFunction } from './ContractReadFunction';
import { ContractWriteFunction } from './ContractWriteFunction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Pencil } from 'lucide-react';

interface ContractInteractionProps {
  initialAbi?: string;
  initialAddress?: string;
}

export const ContractInteraction = ({ initialAbi = '', initialAddress = '' }: ContractInteractionProps) => {
  const [abiInput, setAbiInput] = useState(initialAbi);
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [parsedAbi, setParsedAbi] = useState<Abi | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [readFunctions, setReadFunctions] = useState<AbiFunction[]>([]);
  const [writeFunctions, setWriteFunctions] = useState<AbiFunction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (initialAbi && initialAddress) {
      handleLoadContract();
    }
  }, [initialAbi, initialAddress]);

  const handleLoadContract = () => {
    try {
      // Parse ABI
      let abi: Abi;
      if (typeof abiInput === 'string') {
        abi = JSON.parse(abiInput) as Abi;
      } else {
        abi = abiInput as Abi;
      }

      // Validate address
      if (!addressInput.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid contract address');
      }

      setParsedAbi(abi);
      setAddress(addressInput as Address);

      // Separate read and write functions
      const reads: AbiFunction[] = [];
      const writes: AbiFunction[] = [];

      abi.forEach((item) => {
        if (item.type === 'function') {
          const func = item as AbiFunction;
          if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
            reads.push(func);
          } else {
            writes.push(func);
          }
        }
      });

      setReadFunctions(reads);
      setWriteFunctions(writes);

      toast({
        title: 'Contract Loaded',
        description: `Found ${reads.length} read and ${writes.length} write functions`,
      });
    } catch (error) {
      toast({
        title: 'Error Loading Contract',
        description: error instanceof Error ? error.message : 'Invalid ABI or address',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Connection */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Wallet Connection</CardTitle>
          <CardDescription>Connect your wallet to interact with the contract</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletConnect />
        </CardContent>
      </Card>

      {/* Contract Setup */}
      {!parsedAbi && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Contract Setup</CardTitle>
            <CardDescription>Enter contract ABI and address to begin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Contract Address</Label>
              <Input
                id="address"
                placeholder="0x..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="abi">Contract ABI (JSON)</Label>
              <textarea
                id="abi"
                placeholder='[{"inputs":[],"name":"totalSupply","outputs":[{"type":"uint256"}],"stateMutability":"view","type":"function"}]'
                value={abiInput}
                onChange={(e) => setAbiInput(e.target.value)}
                className="w-full min-h-[150px] px-3 py-2 bg-background border border-input rounded-md font-mono text-sm"
              />
            </div>
            <Button onClick={handleLoadContract} className="w-full">
              Load Contract
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contract Functions */}
      {parsedAbi && address && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>Contract Functions</CardTitle>
            <CardDescription>
              Interact with contract at {address.slice(0, 6)}...{address.slice(-4)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="read">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="read" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Read ({readFunctions.length})
                </TabsTrigger>
                <TabsTrigger value="write" className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Write ({writeFunctions.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="read" className="space-y-4 mt-4">
                {readFunctions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No read functions found
                  </p>
                ) : (
                  readFunctions.map((func, index) => (
                    <ContractReadFunction
                      key={`${func.name}-${index}`}
                      address={address}
                      abi={parsedAbi}
                      func={func}
                    />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="write" className="space-y-4 mt-4">
                {writeFunctions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No write functions found
                  </p>
                ) : (
                  writeFunctions.map((func, index) => (
                    <ContractWriteFunction
                      key={`${func.name}-${index}`}
                      address={address}
                      abi={parsedAbi}
                      func={func}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

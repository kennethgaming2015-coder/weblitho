import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Abi, Address } from 'viem';
import { useToast } from '@/hooks/use-toast';

interface UseContractWriteProps {
  address: Address;
  abi: Abi;
}

export const useContractWrite = ({ address, abi }: UseContractWriteProps) => {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { toast } = useToast();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const write = async (functionName: string, args: any[] = [], value?: bigint) => {
    try {
      writeContract({
        address,
        abi,
        functionName,
        args,
        ...(value && { value }),
      } as any);
    } catch (err) {
      toast({
        title: 'Transaction Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return {
    write,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
};

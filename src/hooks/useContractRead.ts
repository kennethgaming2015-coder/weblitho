import { useReadContract } from 'wagmi';
import { Abi, Address } from 'viem';

interface UseContractReadProps {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: any[];
}

export const useContractRead = ({ address, abi, functionName, args = [] }: UseContractReadProps) => {
  const { data, isError, isLoading, error, refetch } = useReadContract({
    address,
    abi,
    functionName,
    args,
  });

  return {
    data,
    isError,
    isLoading,
    error,
    refetch,
  };
};

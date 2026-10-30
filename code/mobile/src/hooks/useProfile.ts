import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, updateMe } from '../api/user';

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: getMe,
    staleTime: 60_000,
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

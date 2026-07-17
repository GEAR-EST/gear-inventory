import { useAuthContext } from '../contexts/AuthContext';
import { AppPermission, PERMISSION_MAP } from '../types/auth';

/**
 * Retorna true se o usuário autenticado possui a permissão solicitada.
 * Quando authUser é null (não autenticado), retorna false sem exceção.
 */
export function usePermission(action: AppPermission): boolean {
  const { authUser } = useAuthContext();
  if (!authUser) return false;
  return PERMISSION_MAP[authUser.cargo].includes(action);
}

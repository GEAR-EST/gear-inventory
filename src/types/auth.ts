export type UserCargo = 'admin' | 'operador';

export interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  nome: string;
  cargo: UserCargo;
}

export type AppPermission =
  | 'movimentar_estoque'
  | 'cadastrar_item'
  | 'cadastrar_area'
  | 'deletar_item'
  | 'deletar_area';

export const PERMISSION_MAP: Record<UserCargo, AppPermission[]> = {
  admin: [
    'movimentar_estoque',
    'cadastrar_item',
    'cadastrar_area',
    'deletar_item',
    'deletar_area',
  ],
  operador: [
    'movimentar_estoque',
    'cadastrar_item',
    'cadastrar_area',
  ],
};

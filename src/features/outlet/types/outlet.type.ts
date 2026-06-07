export type OutletStatus = 'active' | 'inactive';

export interface Outlet {
  id: string;
  name: string;
  address: string;
  city: string;
  status: OutletStatus;
}

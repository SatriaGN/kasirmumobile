import type { Rupiah } from '@shared/types/common';
import type { ActionResult } from '@shared/types/common';

export type MemberStatus = 'active' | 'inactive';

export interface MemberType {
  id: string;
  name: string;
  canCredit: boolean;
  /** Credit term in days (0 = no credit). */
  tenorDays: number;
}

export interface Member {
  id: string;
  clientMemberId?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  memberTypeId: string;
  memberTypeName: string;
  canCredit: boolean;
  status: MemberStatus;
  totalDebt: Rupiah;
}

/** Shape submitted by the add/edit member form. */
export interface MemberForm {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  memberTypeId: string;
  status?: MemberStatus;
}

export interface MembersContextValue {
  members: Member[];
  memberTypes: MemberType[];
  addMember: (form: MemberForm) => Member;
  updateMember: (id: string, form: MemberForm) => void;
  deleteMember: (id: string) => ActionResult;
}

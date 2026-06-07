import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { uuid } from '@shared/utils/format';
import type { MembersContextValue, Member } from '@features/members/types/members.type';
import { MEMBERS, MEMBER_TYPES } from '@data/mockData';

interface MembersInternalValue extends MembersContextValue {
  /** Exposed for cross-domain coordination (debt payments, credit sales). */
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
}

const MembersContext = createContext<MembersInternalValue | null>(null);

export const MembersProvider = ({ children }: { children: React.ReactNode }) => {
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [memberTypes] = useState(MEMBER_TYPES);

  const addMember = useCallback<MembersContextValue['addMember']>(
    (form) => {
      const type = memberTypes.find((mt) => mt.id === form.memberTypeId);
      const member: Member = {
        id: `m-${Date.now()}`,
        clientMemberId: uuid(),
        name: form.name,
        phone: form.phone,
        email: form.email || '',
        address: form.address || '',
        memberTypeId: form.memberTypeId,
        memberTypeName: type?.name || 'Reguler',
        canCredit: !!type?.canCredit,
        status: form.status || 'active',
        totalDebt: 0,
      };
      setMembers((prev) => [...prev, member]);
      return member;
    },
    [memberTypes]
  );

  const updateMember = useCallback<MembersContextValue['updateMember']>(
    (id, form) => {
      const type = memberTypes.find((mt) => mt.id === form.memberTypeId);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, ...form, memberTypeName: type?.name || m.memberTypeName, canCredit: !!type?.canCredit }
            : m
        )
      );
    },
    [memberTypes]
  );

  const deleteMember = useCallback<MembersContextValue['deleteMember']>(
    (id) => {
      const m = members.find((x) => x.id === id);
      if (m && m.totalDebt > 0) return { ok: false, error: 'Member masih memiliki piutang aktif' };
      setMembers((prev) => prev.filter((x) => x.id !== id));
      return { ok: true };
    },
    [members]
  );

  const value = useMemo<MembersInternalValue>(
    () => ({ members, memberTypes, addMember, updateMember, deleteMember, setMembers }),
    [members, memberTypes, addMember, updateMember, deleteMember]
  );

  return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>;
};

const useMembersInternal = (): MembersInternalValue => {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error('useMembers must be used within MembersProvider');
  return ctx;
};

export const useMembers = (): MembersContextValue => useMembersInternal();

/** Internal hook for sibling domains (debt, pos) that must mutate member state. */
export const useMembersStore = (): Pick<MembersInternalValue, 'members' | 'memberTypes' | 'setMembers'> => {
  const { members, memberTypes, setMembers } = useMembersInternal();
  return { members, memberTypes, setMembers };
};

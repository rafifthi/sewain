"use client";

import { createContext, useContext } from "react";
import { Member, ModuleId, PermissionAction, Role } from "@/lib/access-control";

type AccessCtx = {
  roles: Role[]; members: Member[]; currentUserId: string;
  currentMember: Member | undefined; currentRole: Role | undefined;
  setRoles: (roles: Role[]) => void; setMembers: (members: Member[]) => void; setCurrentUserId: (id: string) => void;
  can: (module: ModuleId, action: PermissionAction) => boolean;
};
const AccessContext = createContext<AccessCtx>({
  roles: [], members: [], currentUserId: "", currentMember: undefined, currentRole: undefined,
  setRoles: () => {}, setMembers: () => {}, setCurrentUserId: () => {}, can: () => true,
});
const useAccess = () => useContext(AccessContext);

export { AccessContext, useAccess };
export type { AccessCtx };

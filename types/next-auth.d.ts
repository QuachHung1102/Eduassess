import type { Role, StaffPosition } from "@/lib/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      staffPosition: StaffPosition | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    staffPosition: StaffPosition | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    staffPosition: StaffPosition | null;
  }
}

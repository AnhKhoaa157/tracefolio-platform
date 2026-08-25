import { cache } from "react";

import { getAuthenticatedUser } from "@/server/auth/session";

export const getCurrentUser = cache(getAuthenticatedUser);

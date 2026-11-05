// Deployment owns only these tables in the companion schema.
// Legacy public chat tables are intentionally excluded from automatic db:push.
export { companionSchema, savedLoadouts, sessions, aiUsage, userPremium } from "./schema";

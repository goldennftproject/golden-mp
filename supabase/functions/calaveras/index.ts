import {createClient} from "https://esm.sh/@supabase/supabase-js@2.118.0";
import {createHandler} from "./handler.ts";
import {planSharedGraveClaim} from "./claim-plan.mjs";
import {planSharedGraveDeath} from "./death-plan.mjs";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {auth: {persistSession: false, autoRefreshToken: false}});
Deno.serve(createHandler({
  async authenticate(jwt) {
    const {data, error} = await admin.auth.getUser(jwt);
    return error || !data?.user ? null : {id: data.user.id};
  },
  rpc: async (name, params) => await admin.rpc(name, params),
  planClaim: planSharedGraveClaim,
  planDeath: planSharedGraveDeath,
}));

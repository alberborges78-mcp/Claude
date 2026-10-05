select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'pix_scheduler_secret')
where not exists (select 1 from vault.secrets where name = 'pix_scheduler_secret');

create or replace function public.rpc_validate_pix_scheduler_secret(p_secret text)
returns boolean
language sql
security definer
set search_path = public, vault, pg_temp
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'pix_scheduler_secret'
      and decrypted_secret = p_secret
  );
$$;

revoke all on function public.rpc_validate_pix_scheduler_secret(text) from public, anon, authenticated;
grant execute on function public.rpc_validate_pix_scheduler_secret(text) to service_role;

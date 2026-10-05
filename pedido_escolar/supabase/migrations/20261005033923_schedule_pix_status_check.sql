do $$
begin
  if not exists (select 1 from cron.job where jobname = 'seven-pix-status-check') then
    perform cron.schedule(
      'seven-pix-status-check',
      '*/2 * * * *',
      $cron$
      select net.http_post(
        url := 'https://ncuapllzomjqorfimtie.supabase.co/functions/v1/pix-check-status',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-scheduler-secret',(select decrypted_secret from vault.decrypted_secrets where name='pix_scheduler_secret')
        ),
        body := '{"mode":"expire_check"}'::jsonb,
        timeout_milliseconds := 30000
      ) as request_id;
      $cron$
    );
  end if;
end $$;

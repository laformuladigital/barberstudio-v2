alter table public.appointments replica identity full;
alter table public.schedule_blocks replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.appointments;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.schedule_blocks;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

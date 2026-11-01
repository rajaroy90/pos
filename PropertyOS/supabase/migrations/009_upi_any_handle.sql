-- 009: accept every real-world UPI ID (name@ybl, 9876543210@paytm, name.surname@okaxis, x_y-z@ok-bank ...). Safe to re-run.
do $$declare c text;begin
 for c in select conname from pg_constraint where conrelid='public.organizations'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%upi_id%' loop
  execute format('alter table public.organizations drop constraint %I',c);
 end loop;
end$$;
alter table public.organizations add constraint organizations_upi_id_check check(upi_id='' or upi_id ~* '^[a-z0-9][a-z0-9._-]{1,255}@[a-z][a-z0-9._-]{1,63}$');
create or replace function public.set_upi_id(p_org uuid,p_upi text) returns void language plpgsql security definer set search_path=public as $$begin
 if member_role(p_org) is distinct from 'owner' then raise exception 'Only the workspace owner can change the UPI ID';end if;
 update organizations set upi_id=lower(regexp_replace(coalesce(p_upi,''),'\s','','g')) where id=p_org;end$$;
revoke all on function public.set_upi_id(uuid,text) from public;
grant execute on function public.set_upi_id(uuid,text) to authenticated;

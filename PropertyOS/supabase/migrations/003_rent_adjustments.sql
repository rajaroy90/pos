create table public.charge_adjustments (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),charge_id uuid not null,
 previous_amount bigint not null,new_amount bigint not null check(new_amount>0 and new_amount<=10000000000),reason text not null,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),foreign key(org_id,charge_id) references public.charges(org_id,id)
);
alter table public.charge_adjustments enable row level security;
revoke all on public.charge_adjustments from anon,authenticated;
grant select on public.charge_adjustments to authenticated;
grant all on public.charge_adjustments to service_role;
create policy adjustments_read on public.charge_adjustments for select to authenticated using(read_charge(org_id,charge_id));
create function public.adjust_charge(p_charge uuid,p_amount bigint,p_reason text) returns void language plpgsql security definer set search_path=public as $$declare c charges;paid bigint;begin
 select * into c from charges where id=p_charge for update;if not found or not is_manager(c.org_id) then raise exception 'Permission denied';end if;
 select coalesce(sum(amount),0) into paid from payments where charge_id=c.id and reversed_at is null;
 if p_amount<=0 or p_amount<paid or p_amount>10000000000 or length(trim(p_reason))<3 then raise exception 'Provide a reason and a positive total no lower than payments received';end if;
 if exists(select 1 from payment_orders where charge_id=c.id and status='created') then raise exception 'Reconcile the pending online payment before adjusting this charge';end if;
 insert into charge_adjustments(org_id,charge_id,previous_amount,new_amount,reason,created_by) values(c.org_id,c.id,c.amount,p_amount,p_reason,auth.uid());
 update charges set amount=p_amount where id=c.id;
 insert into activity(org_id,title,detail,kind) values(c.org_id,'Rent adjusted',p_reason,'payment');end$$;
revoke all on function public.adjust_charge(uuid,bigint,text) from public;
grant execute on function public.adjust_charge(uuid,bigint,text) to authenticated;

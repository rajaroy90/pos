-- One shared checkout per charge. A charge lock serializes manual payments and reservation creation.
create unique index one_pending_checkout on payment_orders(charge_id) where status='created';
create function public.reserve_order(p_charge uuid) returns jsonb language plpgsql security definer set search_path=public as $$declare c charges;o payment_orders;paid bigint;reservation_id text;begin
 select * into c from charges where id=p_charge for update;if not found or not read_charge(c.org_id,c.id) then raise exception 'Permission denied';end if;
 select * into o from payment_orders where charge_id=c.id and status='created';if found then return jsonb_build_object('id',o.id,'amount',o.amount,'currency',o.currency);end if;
 select coalesce(sum(amount),0) into paid from payments where charge_id=c.id and reversed_at is null;if c.amount-paid<=0 then raise exception 'This rent charge is already paid';end if;
 reservation_id:='pending_'||replace(gen_random_uuid()::text,'-','');insert into payment_orders(id,org_id,charge_id,amount) values(reservation_id,c.org_id,c.id,c.amount-paid);
 return jsonb_build_object('id','new_'||reservation_id,'amount',c.amount-paid,'currency','INR');end$$;
revoke all on function public.reserve_order(uuid) from public;
grant execute on function public.reserve_order(uuid) to authenticated;
grant all on all tables in schema public to service_role;

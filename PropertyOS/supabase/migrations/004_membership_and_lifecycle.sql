create function public.update_organization(p_org uuid,p_name text,p_slug text) returns void language plpgsql security definer set search_path=public as $$begin
 if member_role(p_org) is distinct from 'owner' then raise exception 'Permission denied';end if;
 update organizations set name=p_name,slug=p_slug where id=p_org;end$$;
create function public.organization_members(p_org uuid) returns table(user_id uuid,email text,role text) language plpgsql stable security definer set search_path=public as $$begin
 if member_role(p_org) is distinct from 'owner' then raise exception 'Permission denied';end if;
 return query select m.user_id,u.email::text,m.role from memberships m join auth.users u on u.id=m.user_id where m.org_id=p_org order by m.created_at;end$$;
create function public.revoke_membership(p_org uuid,p_user uuid) returns void language plpgsql security definer set search_path=public as $$begin
 if member_role(p_org) is distinct from 'owner' then raise exception 'Permission denied';end if;
 if exists(select 1 from memberships where org_id=p_org and user_id=p_user and role='owner') then raise exception 'The workspace owner cannot be removed';end if;
 update invitations set expires_at=now() where org_id=p_org and accepted_at is null and lower(email)=(select lower(email) from auth.users where id=p_user);
 delete from memberships where org_id=p_org and user_id=p_user;update tenants set user_id=null where org_id=p_org and user_id=p_user;
 insert into activity(org_id,title,detail,kind) values(p_org,'Workspace access revoked',p_user::text,'tenant');end$$;
revoke all on function public.update_organization(uuid,text,text),public.organization_members(uuid),public.revoke_membership(uuid,uuid) from public;
grant execute on function public.update_organization(uuid,text,text),public.organization_members(uuid),public.revoke_membership(uuid,uuid) to authenticated;
create function public.guard_archive() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.archived and not old.archived and exists(select 1 from leases l join units u on u.id=l.unit_id where l.org_id=new.org_id and l.status='active' and l.ends_on>=(now() at time zone 'Asia/Kolkata')::date and (case TG_TABLE_NAME when 'properties' then u.property_id=new.id when 'units' then u.id=new.id else l.tenant_id=new.id end)) then raise exception 'End active leases before archiving this record';end if;return new;end$$;
create trigger guard_property_archive before update of archived on properties for each row execute function public.guard_archive();
create trigger guard_unit_archive before update of archived on units for each row execute function public.guard_archive();
create trigger guard_tenant_archive before update of archived on tenants for each row execute function public.guard_archive();
create function public.guard_new_lease() returns trigger language plpgsql security definer set search_path=public as $$begin
 if not exists(select 1 from units u join properties p on p.id=u.property_id join tenants t on t.id=new.tenant_id and t.org_id=u.org_id where u.id=new.unit_id and u.org_id=new.org_id and not u.archived and not p.archived and not t.archived) then raise exception 'Choose an available, unarchived unit and tenant from this workspace';end if;return new;end$$;
create trigger guard_new_lease before insert on leases for each row execute function public.guard_new_lease();
revoke all on function public.guard_archive(),public.guard_new_lease() from public;

create function public.guard_tenant_identity() returns trigger language plpgsql set search_path=public as $$begin
 if old.user_id is not null and lower(new.email)<>lower(old.email) then raise exception 'Revoke portal access before changing a linked tenant email';end if;return new;end$$;
create trigger guard_tenant_identity before update of email on tenants for each row execute function public.guard_tenant_identity();
revoke all on function public.guard_tenant_identity() from public;

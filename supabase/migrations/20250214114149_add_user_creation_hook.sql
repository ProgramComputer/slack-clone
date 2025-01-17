-- Function to handle new user creation
create or replace function public.handle_new_user_creation()
returns trigger as $$
begin
  insert into public.users (id, username, status)
  values (new.id, new.email, 'OFFLINE');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function after insert on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_creation();

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on public.users to authenticated, anon;
grant usage, select on all sequences in schema public to authenticated, anon; 
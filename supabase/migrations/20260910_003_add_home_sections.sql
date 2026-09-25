alter table public.content
  add column if not exists home_section text not null default 'DestiVerse Reels',
  add column if not exists section_order integer not null default 10,
  add column if not exists display_order integer not null default 0;

create index if not exists content_home_section_order_idx
  on public.content (published, section_order, display_order, updated_at desc);

update public.content
set home_section = case
  when id = 'river-goddess-gift' then 'DestiVerse Reels'
  when id in ('river-goddess-part-1', 'river-goddess-part-3', 'iron-pharaoh-part-3') then 'Trending Now'
  else home_section
end,
section_order = case
  when id in ('river-goddess-part-1', 'river-goddess-part-3', 'iron-pharaoh-part-3') then 0
  else 10
end,
display_order = case
  when id = 'river-goddess-part-1' then 0
  when id = 'river-goddess-part-3' then 1
  when id = 'iron-pharaoh-part-3' then 2
  else display_order
end;

alter table public.content
  drop constraint if exists content_type_check;

alter table public.content
  add constraint content_type_check check (
    type in (
      'Movie',
      'Series',
      'Short Film',
      'Documentary',
      'AI Video',
      'Dancing AI Video',
      'Podcast',
      'CEO & Business',
      'AI UGC',
      'Interview',
      'Music Video',
      'Tutorial',
      'Live Stream'
    )
  );
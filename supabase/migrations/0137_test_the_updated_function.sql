SELECT * FROM public.get_all_users_details(
  search_text := NULL,
  kyc_status_filter := NULL,
  account_status_filter := NULL,
  page_limit := 20,
  page_offset := 0
);
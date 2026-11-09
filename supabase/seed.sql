insert into public.categories (name, slug) values
('کپڑے اور ٹیکسٹائل','clothing-textiles'),
('موبائل اور الیکٹرانکس','mobile-electronics'),
('گھریلو سامان','home-goods'),
('کریانہ اور فوڈ','grocery-food'),
('اسٹیشنری','stationery'),
('بیوٹی اور پرسنل کیئر','beauty-personal-care'),
('الیکٹریکل','electrical'),
('جوتے اور فیشن','shoes-fashion'),
('آٹو پارٹس','auto-parts'),
('زرعی سامان','agriculture'),
('ہارڈویئر اور تعمیراتی سامان','hardware-construction'),
('کھلونے اور بچوں کا سامان','toys-baby'),
('صنعتی اور کاروباری سپلائیز','industrial-supplies')
on conflict (slug) do nothing;

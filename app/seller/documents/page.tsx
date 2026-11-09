import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { uploadVerificationDocumentAction } from '@/app/auth/actions';

export default async function SellerDocumentsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'seller') redirect('/dashboard');
  const { data: documents } = await supabase.from('verification_documents').select('id,document_type,review_status,created_at').eq('seller_id', user.id).order('created_at', { ascending: false });
  const labels: Record<string, string> = { identity: 'شناختی دستاویز', business_registration: 'کاروباری رجسٹریشن', shop_photo: 'دکان یا گودام کی تصویر', address_proof: 'پتے کا ثبوت', other: 'دیگر' };
  return <main className="wrap" style={{ maxWidth: 720, padding: '35px 0 70px' }}>
    <Link href="/dashboard" className="textbutton">← ڈیش بورڈ</Link>
    <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 24, marginTop: 12 }}>
      <span className="eyebrow">سیلر ویریفکیشن</span><h1 style={{ fontSize: 26 }}>کاروباری دستاویزات جمع کریں</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.9 }}>صرف متعلقہ دستاویزات اپ لوڈ کریں۔ فائلیں نجی اسٹوریج میں رکھی جائیں گی اور عوامی طور پر دستیاب نہیں ہوں گی۔ زیادہ سے زیادہ 5MB؛ JPG، PNG یا PDF۔</p>
      {message && <p role="status" style={{ background: '#eaf5ed', padding: 12, borderRadius: 8 }}>{message}</p>}
      {error && <p role="alert" style={{ background: '#fff0ed', padding: 12, borderRadius: 8 }}>{error}</p>}
      <form action={uploadVerificationDocumentAction} encType="multipart/form-data" style={{ display: 'grid', gap: 14 }}>
        <label>دستاویز کی قسم<select name="document_type" required defaultValue="identity"><option value="identity">شناختی دستاویز</option><option value="business_registration">کاروباری رجسٹریشن</option><option value="shop_photo">دکان یا گودام کی تصویر</option><option value="address_proof">پتے کا ثبوت</option><option value="other">دیگر</option></select></label>
        <label>فائل منتخب کریں<input name="document" type="file" accept="image/jpeg,image/png,application/pdf" required /></label>
        <button className="primary" type="submit">دستاویز محفوظ کریں</button>
      </form>
      <h2 style={{ fontSize: 18, marginTop: 28 }}>آپ کی جمع کردہ دستاویزات</h2>
      {!documents?.length && <p style={{ color: 'var(--muted)' }}>ابھی کوئی دستاویز جمع نہیں ہوئی۔</p>}
      <div style={{ display: 'grid', gap: 8 }}>{documents?.map(doc => <div key={doc.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{labels[doc.document_type] || doc.document_type}</span><strong>{doc.review_status === 'pending' ? 'زیرِ التوا' : doc.review_status}</strong></div>)}</div>
    </section>
  </main>;
}

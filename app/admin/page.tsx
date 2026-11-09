import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reviewSellerAction, signOutAction } from '@/app/auth/actions';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/dashboard');
  const admin = createAdminClient();
  const { data: sellers, error: listError } = await admin.from('seller_profiles')
    .select('user_id,business_name,business_type,city,address,tax_number,verification_status,created_at')
    .in('verification_status', ['pending', 'under_review']).order('created_at', { ascending: true });
  const sellerIds = (sellers ?? []).map((seller) => seller.user_id);
  const { data: docs } = sellerIds.length ? await admin.from('verification_documents')
    .select('id,seller_id,document_type,storage_path,review_status,created_at').in('seller_id', sellerIds).order('created_at', { ascending: false }) : { data: [] as any[] };
  const docsWithLinks = await Promise.all((docs ?? []).map(async (doc) => {
    const { data } = await admin.storage.from('seller-verification').createSignedUrl(doc.storage_path, 60);
    return { ...doc, signedUrl: data?.signedUrl ?? null };
  }));
  const documentLabels: Record<string, string> = { identity: 'شناختی دستاویز', business_registration: 'کاروباری رجسٹریشن', shop_photo: 'دکان / گودام کی تصویر', address_proof: 'پتے کا ثبوت', other: 'دیگر' };
  return <main className="wrap" style={{ padding: '35px 0 70px' }}>
    <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
      <span className="eyebrow">صرف مجاز ایڈمن</span><h1 style={{ fontSize: 28 }}>سیلر ویریفکیشن پینل</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.9 }}>دستاویزات کی اصل جانچ مکمل ہونے کے بعد ہی منظوری دیں۔ دستاویزات نجی Storage میں محفوظ ہیں؛ ہر فائل کا لنک صرف 60 سیکنڈ کے لیے بنایا جاتا ہے۔ اصل CNIC/کاروباری تفصیلات خود چیک کرکے فیصلہ کریں۔</p>
      {message && <p role="status" style={{ background: '#eaf5ed', padding: 12, borderRadius: 8 }}>{message}</p>}
      {error && <p role="alert" style={{ background: '#fff0ed', padding: 12, borderRadius: 8 }}>{error}</p>}
      {listError && <p role="alert">سیلرز لوڈ نہیں ہوسکے۔ Supabase کنفیگریشن چیک کریں۔</p>}
      {!sellers?.length && <p>اس وقت کوئی زیرِ التوا سیلر درخواست نہیں۔</p>}
      <div style={{ display: 'grid', gap: 14 }}>
        {sellers?.map((seller) => <article key={seller.user_id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>{seller.business_name}</h2>
          <p style={{ margin: '5px 0' }}>شہر: {seller.city} · قسم: {seller.business_type || 'درج نہیں'}</p>
          <p style={{ margin: '5px 0', color: 'var(--muted)' }}>پتہ: {seller.address}</p>
          <p style={{ margin: '5px 0', fontSize: 11, color: 'var(--muted)' }}>Seller ID: {seller.user_id}</p>
          <div style={{ marginTop: 12, display: 'grid', gap: 7 }}><b>جمع کردہ دستاویزات</b>{docsWithLinks.filter(doc => doc.seller_id === seller.user_id).map(doc => <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid var(--line)', padding: 9, borderRadius: 8 }}><span>{documentLabels[doc.document_type] || doc.document_type} · {doc.review_status}</span>{doc.signedUrl ? <a href={doc.signedUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontWeight: 700 }}>فائل دیکھیں (60 سیکنڈ)</a> : <span>فائل دستیاب نہیں</span>}</div>)}{!docsWithLinks.some(doc => doc.seller_id === seller.user_id) && <span style={{ color: 'var(--muted)' }}>ابھی دستاویز جمع نہیں ہوئی۔</span>}</div>
          <form action={reviewSellerAction} style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            <input type="hidden" name="seller_id" value={seller.user_id} />
            <label>ایڈمن نوٹ<textarea name="note" rows={2} placeholder="تصدیق کا حوالہ یا مسترد کرنے کی وجہ" /></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="primary" name="decision" value="verified">ویریفائی کریں</button>
              <button className="outline" name="decision" value="under_review">مزید جانچ</button>
              <button className="outline" name="decision" value="rejected">مسترد کریں</button>
            </div>
          </form>
        </article>)}
      </div>
      <form action={signOutAction} style={{ marginTop: 24 }}><button className="outline">لاگ آؤٹ</button></form>
    </section>
  </main>;
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '@/app/auth/actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('full_name,role,city').eq('id', user.id).maybeSingle();
  if (!profile) return <main className="wrap" style={{ padding: 40 }}>آپ کا پروفائل تیار نہیں ہوا۔ براہ کرم دوبارہ لاگ اِن کریں یا سپورٹ سے رابطہ کریں۔</main>;
  const { data: seller } = profile.role === 'seller'
    ? await supabase.from('seller_profiles').select('business_name,verification_status,city').eq('user_id', user.id).maybeSingle()
    : { data: null };
  return <main className="wrap" style={{ padding: '35px 0 70px' }}>
    <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
      <span className="eyebrow">صارف ڈیش بورڈ</span><h1 style={{ fontSize: 28 }}>السلام علیکم، {profile.full_name || 'صارف'}!</h1>
      <p style={{ color: 'var(--muted)' }}>اکاؤنٹ: {profile.role === 'seller' ? 'سیلر' : profile.role === 'admin' ? 'ایڈمن' : 'بائر'} · شہر: {profile.city || 'درج نہیں'}</p>
      {profile.role === 'seller' && <div style={{ padding: 16, background: '#f3f8f4', borderRadius: 12, margin: '18px 0' }}><b>{seller?.business_name || 'کاروباری پروفائل'}</b><p>ویریفکیشن اسٹیٹس: <strong>{seller?.verification_status || 'زیرِ التوا'}</strong></p><p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>منظوری سے پہلے مصنوعات عوامی کیٹلاگ میں نظر نہیں آئیں گی۔ ایڈمن ضرورت کے مطابق مزید دستاویزات مانگ سکتا ہے۔</p><Link className="primary" href="/seller/documents">ویریفکیشن دستاویزات جمع کریں</Link></div>}
      {profile.role === 'admin' && <p><Link className="primary" href="/admin">ایڈمن ویریفکیشن پینل کھولیں</Link></p>}
      {profile.role === 'buyer' && <p><Link className="primary" href="/">ہول سیل مصنوعات دیکھیں</Link></p>}
      <form action={signOutAction} style={{ marginTop: 20 }}><button className="outline" type="submit">لاگ آؤٹ</button></form>
    </section>
  </main>;
}

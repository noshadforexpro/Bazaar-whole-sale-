import Link from 'next/link';
import { signUpAction } from '@/app/auth/actions';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="wrap" style={{ maxWidth: 680, padding: '34px 0 60px' }}>
    <Link href="/" className="textbutton">← ہوم پیج</Link>
    <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 24, marginTop: 16 }}>
      <span className="eyebrow">نیا اکاؤنٹ</span><h1 style={{ fontSize: 28, marginBottom: 6 }}>بازار میں شامل ہوں</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.9 }}>بائر یا سیلر اکاؤنٹ بنائیں۔ سیلر اکاؤنٹ مصنوعات لسٹ کرنے سے پہلے ایڈمن کی تصدیق سے گزرے گا۔</p>
      {error && <p role="alert" style={{ background: '#fff0ed', color: '#9a3020', padding: 12, borderRadius: 8 }}>{error}</p>}
      <form action={signUpAction} style={{ display: 'grid', gap: 13 }}>
        <label>پورا نام *<input name="full_name" required autoComplete="name" /></label>
        <label>موبائل نمبر<input name="phone" type="tel" placeholder="03XXXXXXXXX" autoComplete="tel" /></label>
        <label>ای میل *<input name="email" type="email" required autoComplete="email" dir="ltr" /></label>
        <label>پاس ورڈ (کم از کم 8 حروف) *<input name="password" type="password" minLength={8} required autoComplete="new-password" dir="ltr" /></label>
        <label>اکاؤنٹ کی قسم *<select name="role" required defaultValue="buyer"><option value="buyer">بائر — ہول سیل مال خریدنا ہے</option><option value="seller">سیلر — ہول سیل مال فروخت کرنا ہے</option></select></label>
        <label>شہر<select name="city" defaultValue=""><option value="">شہر منتخب کریں</option>{['کراچی','لاہور','اسلام آباد','راولپنڈی','پشاور','کوئٹہ','فیصل آباد','ملتان','حیدرآباد','دیگر'].map(city => <option key={city}>{city}</option>)}</select></label>
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, display: 'grid', gap: 12 }}>
          <legend style={{ fontWeight: 700, padding: '0 8px' }}>سیلر کی معلومات (سیلر کے لیے ضروری)</legend>
          <label>کاروبار / دکان کا نام<input name="business_name" /></label>
          <label>کاروبار کی قسم<input name="business_type" placeholder="مثلاً گارمنٹس، کریانہ، الیکٹرانکس" /></label>
          <label>کاروبار کا مکمل پتہ<textarea name="address" rows={3} /></label>
        </fieldset>
        <button className="primary" type="submit" style={{ width: '100%', padding: 14 }}>اکاؤنٹ بنائیں</button>
      </form>
      <p style={{ marginTop: 18 }}>پہلے سے اکاؤنٹ ہے؟ <Link href="/login" style={{ color: 'var(--green)', fontWeight: 700 }}>لاگ اِن کریں</Link></p>
    </section>
  </main>;
}

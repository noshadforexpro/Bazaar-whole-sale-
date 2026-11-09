import Link from 'next/link';
import { signInAction } from '@/app/auth/actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const { error, message } = await searchParams;
  return <main className="wrap" style={{ maxWidth: 520, padding: '45px 0 70px' }}>
    <Link href="/" className="textbutton">← ہوم پیج</Link>
    <section style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 26, marginTop: 16 }}>
      <span className="eyebrow">خوش آمدید</span><h1 style={{ fontSize: 28 }}>اپنے اکاؤنٹ میں لاگ اِن کریں</h1>
      {message && <p role="status" style={{ background: '#eaf5ed', color: '#176b4d', padding: 12, borderRadius: 8 }}>{message}</p>}
      {error && <p role="alert" style={{ background: '#fff0ed', color: '#9a3020', padding: 12, borderRadius: 8 }}>{error}</p>}
      <form action={signInAction} style={{ display: 'grid', gap: 14 }}>
        <label>ای میل<input name="email" type="email" required autoComplete="email" dir="ltr" /></label>
        <label>پاس ورڈ<input name="password" type="password" required autoComplete="current-password" dir="ltr" /></label>
        <button className="primary" type="submit" style={{ width: '100%', padding: 14 }}>لاگ اِن</button>
      </form>
      <p style={{ marginTop: 18 }}>نئے صارف ہیں؟ <Link href="/signup" style={{ color: 'var(--green)', fontWeight: 700 }}>اکاؤنٹ بنائیں</Link></p>
    </section>
  </main>;
}

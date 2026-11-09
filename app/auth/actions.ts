'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

export async function signUpAction(formData: FormData) {
  const fullName = field(formData, 'full_name');
  const phone = field(formData, 'phone');
  const email = field(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const role = field(formData, 'role');
  const city = field(formData, 'city');
  const businessName = field(formData, 'business_name');
  const businessType = field(formData, 'business_type');
  const address = field(formData, 'address');

  if (!fullName || !email || password.length < 8 || !['buyer', 'seller'].includes(role)) {
    redirect('/signup?error=براہ کرم تمام لازمی معلومات درست درج کریں؛ پاس ورڈ کم از کم 8 حروف کا ہو۔');
  }
  if (role === 'seller' && (!businessName || !city || !address)) {
    redirect('/signup?error=سیلر کے لیے کاروباری نام، شہر اور مکمل پتہ ضروری ہے۔');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.APP_URL ?? 'http://localhost:3000'}/auth/callback?next=/dashboard`,
      data: { full_name: fullName, phone: phone || null, role, city, business_name: businessName, business_type: businessType, address },
    },
  });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  // With email confirmation enabled, user must confirm before signing in.
  redirect('/login?message=اکاؤنٹ کی تصدیق کے لیے اپنی ای میل چیک کریں۔');
}

export async function signInAction(formData: FormData) {
  const email = field(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent('ای میل یا پاس ورڈ درست نہیں۔')}`);
  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login?message=آپ کامیابی سے لاگ آؤٹ ہوگئے۔');
}

export async function reviewSellerAction(formData: FormData) {
  const sellerId = field(formData, 'seller_id');
  const decision = field(formData, 'decision');
  const note = field(formData, 'note');
  if (!sellerId || !['verified', 'rejected', 'under_review', 'suspended'].includes(decision)) {
    redirect('/admin?error=درخواست درست نہیں۔');
  }

  // Check the signed-in user's role using the normal session client before using the service key.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/dashboard?error=آپ کو ایڈمن کی اجازت حاصل نہیں۔');

  const admin = createAdminClient();
  const { error } = await admin.from('seller_profiles').update({
    verification_status: decision,
    verified_at: decision === 'verified' ? new Date().toISOString() : null,
    verified_by: user.id,
  }).eq('user_id', sellerId);
  if (error) redirect(`/admin?error=${encodeURIComponent('اسٹیٹس اپ ڈیٹ نہیں ہوسکا۔')}`);
  await admin.from('verification_documents').update({ review_status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString(), reviewer_note: note || null }).eq('seller_id', sellerId);
  await admin.from('audit_logs').insert({ actor_id: user.id, action: `seller_${decision}`, entity_type: 'seller_profile', entity_id: sellerId, details: { note } });
  redirect('/admin?message=سیلر کی درخواست اپ ڈیٹ ہوگئی۔');
}

export async function uploadVerificationDocumentAction(formData: FormData) {
  const documentType = field(formData, 'document_type');
  const file = formData.get('document');
  if (!['identity', 'business_registration', 'shop_photo', 'address_proof', 'other'].includes(documentType) || !(file instanceof File) || file.size === 0) {
    redirect('/seller/documents?error=دستاویز کی قسم اور فائل منتخب کریں۔');
  }
  if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
    redirect('/seller/documents?error=صرف JPG، PNG یا PDF فائل، زیادہ سے زیادہ 5MB، اپ لوڈ کریں۔');
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'seller') redirect('/dashboard?error=یہ سہولت صرف سیلر کے لیے ہے۔');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90) || 'document';
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('seller-verification').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) redirect('/seller/documents?error=فائل اپ لوڈ نہیں ہوسکی۔ دوبارہ کوشش کریں۔');
  const { error: recordError } = await supabase.from('verification_documents').insert({ seller_id: user.id, document_type: documentType, storage_path: path });
  if (recordError) {
    // Keep the bucket private. If record creation fails, remove the uploaded orphan file.
    await supabase.storage.from('seller-verification').remove([path]);
    redirect('/seller/documents?error=دستاویز کا ریکارڈ محفوظ نہیں ہوسکا۔');
  }
  redirect('/seller/documents?message=دستاویز محفوظ ہوگئی؛ ایڈمن جائزہ لے گا۔');
}

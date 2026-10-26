'use server';

export type NewsletterResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Stub de inscrição na newsletter.
 * TODO: persistir em provedor de e-mail / CRM quando a integração existir.
 */
export async function subscribeNewsletter(formData: FormData): Promise<NewsletterResult> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }

  // TODO: integrar provedor (Resend, Mailchimp, etc.) — hoje só valida e retorna sucesso.
  return { ok: true };
}

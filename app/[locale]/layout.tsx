import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { LocaleProviders } from '@/components/LocaleProviders';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as 'de' | 'en' | 'sl')) {
    notFound();
  }

  // Get messages for the current locale
  const messages = await getMessages();

  return (
    <LocaleProviders messages={messages} locale={locale}>
      {children}
    </LocaleProviders>
  );
}

"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { Header } from "./Header";

interface LocaleProvidersProps {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale: string;
}

export function LocaleProviders({ children, messages, locale }: LocaleProvidersProps) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <Header />
      {children}
    </NextIntlClientProvider>
  );
}

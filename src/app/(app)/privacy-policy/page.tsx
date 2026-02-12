import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { getLocale, getTranslations } from "@/i18n/server";

type PolicySection = {
  title: string;
  intro?: string;
  bullets?: string[];
  paragraphs?: string[];
};

const POLICY_CONTENT: Record<
  "pl" | "en",
  {
    intro: string;
    sections: PolicySection[];
    contactIntro: string;
    githubLabel: string;
    linkedinLabel: string;
  }
> = {
  en: {
    intro:
      'Go Girl Workout App ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our fitness and workout tracking application.',
    sections: [
      {
        title: "1. Information We Collect",
        intro:
          "We may collect information that you provide directly to us, including:",
        bullets: [
          "Account information: email address, display name, and password (stored securely and hashed).",
          "Workout data: exercises, sets, reps, weights, workout plans, and session history that you create or log.",
          "Personal records: best performances and metrics you choose to record.",
          "Device and usage data: device type, browser, approximate location (if permitted), and how you interact with the app (e.g., features used, errors) to improve our services.",
        ],
      },
      {
        title: "2. How We Use Your Information",
        intro: "We use the information we collect to:",
        bullets: [
          "Provide, maintain, and improve the app and your experience.",
          "Authenticate your account and keep it secure.",
          "Store and sync your workout data across your devices.",
          "Respond to your requests, comments, or support inquiries.",
          "Send you service-related notices (e.g., security or policy updates) where permitted by law.",
          "Analyze usage patterns to fix bugs and develop new features.",
        ],
      },
      {
        title: "3. Data Storage and Security",
        paragraphs: [
          "Your data is stored using industry-standard infrastructure (e.g., Supabase and related services). We use encryption in transit (TLS) and at rest where supported. We do not sell your personal information or workout data to third parties.",
        ],
      },
      {
        title: "4. Cookies and Similar Technologies",
        paragraphs: [
          "We may use cookies, local storage, and similar technologies to maintain your session, remember your preferences, and understand how the app is used. You can control cookies through your browser settings; disabling them may affect some features of the app.",
        ],
      },
      {
        title: "5. Third-Party Services",
        paragraphs: [
          "The app may use third-party services (e.g., authentication, hosting, analytics). These providers have their own privacy policies and may process data on our behalf. We encourage you to review their policies when relevant.",
        ],
      },
      {
        title: "6. Your Rights",
        intro: "Depending on your location, you may have the right to:",
        bullets: [
          "Access and receive a copy of your personal data.",
          "Correct or update inaccurate data.",
          "Request deletion of your data.",
          "Object to or restrict certain processing.",
          "Data portability (receive your data in a structured format).",
        ],
        paragraphs: [
          "To exercise these rights, contact us using the details below. You may also have the right to lodge a complaint with a supervisory authority in your country.",
        ],
      },
      {
        title: "7. Data Retention",
        paragraphs: [
          "We retain your account and workout data for as long as your account is active. If you delete your account, we will delete or anonymize your personal data in accordance with our retention policy and applicable law, except where we must retain it for legal or security purposes.",
        ],
      },
      {
        title: "8. Children's Privacy",
        paragraphs: [
          "The app is not intended for users under 16. We do not knowingly collect personal information from children under 16. If you believe we have collected such information, please contact us so we can delete it.",
        ],
      },
      {
        title: "9. Changes to This Policy",
        paragraphs: [
          'We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the app and updating the "Last updated" date. Your continued use of the app after changes constitutes acceptance of the revised policy.',
        ],
      },
      {
        title: "10. Contact Us",
      },
    ],
    contactIntro:
      "If you have questions about this Privacy Policy or your personal data, please contact us at:",
    githubLabel: "GitHub - anitabaron",
    linkedinLabel: "LinkedIn - Anita Baron",
  },
  pl: {
    intro:
      "Go Girl Workout App (\"my\", \"nas\" lub \"aplikacja\") zobowiązuje się do ochrony Twojej prywatności. Niniejsza Polityka prywatności wyjaśnia, w jaki sposób zbieramy, wykorzystujemy, ujawniamy i chronimy informacje podczas korzystania z naszej aplikacji do śledzenia treningów.",
    sections: [
      {
        title: "1. Jakie dane zbieramy",
        intro: "Możemy zbierać dane, które przekazujesz nam bezpośrednio, w tym:",
        bullets: [
          "Informacje o koncie: adres e-mail, nazwa wyświetlana i hasło (przechowywane bezpiecznie i haszowane).",
          "Dane treningowe: ćwiczenia, serie, powtórzenia, ciężary, plany treningowe i historia sesji, które tworzysz lub zapisujesz.",
          "Rekordy osobiste: najlepsze wyniki i metryki, które chcesz zapisywać.",
          "Dane o urządzeniu i użyciu: typ urządzenia, przeglądarka, przybliżona lokalizacja (jeśli wyrazisz zgodę) oraz sposób korzystania z aplikacji (np. używane funkcje, błędy), aby ulepszać nasze usługi.",
        ],
      },
      {
        title: "2. Jak wykorzystujemy Twoje dane",
        intro: "Wykorzystujemy zebrane dane, aby:",
        bullets: [
          "Świadczyć, utrzymywać i ulepszać aplikację oraz Twoje doświadczenie.",
          "Uwierzytelniać konto i dbać o jego bezpieczeństwo.",
          "Przechowywać i synchronizować dane treningowe między urządzeniami.",
          "Odpowiadać na Twoje pytania, komentarze i zgłoszenia wsparcia.",
          "Wysyłać komunikaty związane z działaniem usługi (np. bezpieczeństwo lub aktualizacje polityk), jeśli pozwala na to prawo.",
          "Analizować wzorce użycia, naprawiać błędy i rozwijać nowe funkcje.",
        ],
      },
      {
        title: "3. Przechowywanie danych i bezpieczeństwo",
        paragraphs: [
          "Twoje dane są przechowywane z użyciem infrastruktury zgodnej ze standardami branżowymi (np. Supabase i powiązane usługi). Stosujemy szyfrowanie w transmisji (TLS) oraz szyfrowanie danych w spoczynku tam, gdzie jest wspierane. Nie sprzedajemy Twoich danych osobowych ani danych treningowych podmiotom trzecim.",
        ],
      },
      {
        title: "4. Pliki cookies i podobne technologie",
        paragraphs: [
          "Możemy używać cookies, local storage i podobnych technologii, aby utrzymać sesję, zapamiętać preferencje i zrozumieć sposób używania aplikacji. Możesz zarządzać cookies w ustawieniach przeglądarki; ich wyłączenie może wpłynąć na działanie części funkcji.",
        ],
      },
      {
        title: "5. Usługi podmiotów trzecich",
        paragraphs: [
          "Aplikacja może korzystać z usług podmiotów trzecich (np. uwierzytelnianie, hosting, analityka). Dostawcy ci mają własne polityki prywatności i mogą przetwarzać dane w naszym imieniu. Zachęcamy do zapoznania się z ich politykami, gdy jest to istotne.",
        ],
      },
      {
        title: "6. Twoje prawa",
        intro:
          "W zależności od miejsca zamieszkania możesz mieć prawo do:",
        bullets: [
          "Dostępu do swoich danych osobowych i otrzymania ich kopii.",
          "Sprostowania lub aktualizacji nieprawidłowych danych.",
          "Żądania usunięcia danych.",
          "Wniesienia sprzeciwu wobec określonego przetwarzania lub jego ograniczenia.",
          "Przenoszenia danych (otrzymania danych w ustrukturyzowanym formacie).",
        ],
        paragraphs: [
          "Aby skorzystać z tych praw, skontaktuj się z nami, korzystając z danych poniżej. Możesz także mieć prawo do złożenia skargi do właściwego organu nadzorczego.",
        ],
      },
      {
        title: "7. Okres przechowywania danych",
        paragraphs: [
          "Przechowujemy dane konta i treningów tak długo, jak Twoje konto jest aktywne. Jeśli usuniesz konto, usuniemy lub zanonimizujemy Twoje dane osobowe zgodnie z polityką retencji i obowiązującym prawem, z wyjątkiem przypadków, gdy musimy je zachować z przyczyn prawnych lub bezpieczeństwa.",
        ],
      },
      {
        title: "8. Prywatność dzieci",
        paragraphs: [
          "Aplikacja nie jest przeznaczona dla użytkowników poniżej 16. roku życia. Nie zbieramy świadomie danych osobowych dzieci poniżej 16 lat. Jeśli uważasz, że takie dane zostały zebrane, skontaktuj się z nami, abyśmy mogli je usunąć.",
        ],
      },
      {
        title: "9. Zmiany w niniejszej polityce",
        paragraphs: [
          "Możemy okresowo aktualizować niniejszą Politykę prywatności. O istotnych zmianach poinformujemy poprzez publikację zaktualizowanej wersji w aplikacji i aktualizację daty „Ostatnia aktualizacja”. Dalsze korzystanie z aplikacji po zmianach oznacza akceptację zaktualizowanej polityki.",
        ],
      },
      {
        title: "10. Kontakt",
      },
    ],
    contactIntro:
      "Jeśli masz pytania dotyczące Polityki prywatności lub Twoich danych osobowych, skontaktuj się z nami:",
    githubLabel: "GitHub - anitabaron",
    linkedinLabel: "LinkedIn - Anita Baron",
  },
};

export const metadata = {
  title: "Privacy Policy | Go Girl Workout App",
  description:
    "Privacy policy for Go Girl Workout App. Learn how we collect, use, and protect your data.",
};

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  const t = await getTranslations("privacyPolicyPage");
  const copy = POLICY_CONTENT[locale];
  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("lastUpdated")}
      />

      <article className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm">
        <p>{copy.intro}</p>

        {copy.sections.map((section) => (
          <section key={section.title}>
            <h2 className="m3-headline text-lg font-semibold mt-8 mb-3">
              {section.title}
            </h2>
            {section.intro ? <p>{section.intro}</p> : null}
            {section.bullets ? (
              <ul className="list-disc pl-6 space-y-1 my-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
            {section.paragraphs
              ? section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-2">
                    {paragraph}
                  </p>
                ))
              : null}
          </section>
        ))}

        <section>
          <p>{copy.contactIntro}</p>
          <p className="mt-2">
            <a
              href="https://github.com/anitabaron"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4"
            >
              {copy.githubLabel}
            </a>
            {" · "}
            <a
              href="https://linkedin.com/in/anita-baron"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-4"
            >
              {copy.linkedinLabel}
            </a>
          </p>
        </section>
      </article>

      <p className="text-sm text-muted-foreground pt-4">
        <Link
          href="/"
          className="text-primary hover:underline underline-offset-4"
        >
          ← {t("backToHome")}
        </Link>
      </p>
    </div>
  );
}

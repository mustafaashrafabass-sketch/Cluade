import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDictionary, href, resolveLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

// Describes what this website actually does with submitted data.
// Have it reviewed by Almanfz before launch (see docs/AUDIT.md).
const content: Record<Locale, { title: string; body: string[] }[]> = {
  en: [
    {
      title: "What we collect",
      body: [
        "When you submit a quotation request, a BOQ/RFQ or a contact message, we receive the details you enter: your name, company, email, phone number, city, project name, notes, the products and quantities in your list, and any file you attach.",
      ],
    },
    {
      title: "How we use it",
      body: [
        "We use these details only to respond to your request: to prepare quotations, clarify specifications, and arrange supply. Submissions are delivered to the Almanfz sales team through the systems configured for this website.",
      ],
    },
    {
      title: "Quote list in your browser",
      body: [
        "Your quote list is stored in your own browser (local storage) so it is kept while you browse. It is not sent to us until you submit it. You can clear it at any time from the quote list page.",
      ],
    },
    {
      title: "Analytics",
      body: [
        "If analytics is enabled on this website, analytics cookies are only used after you accept them. Analytics events contain page and product information only; form contents, names, emails, phone numbers and files are never sent to analytics providers.",
      ],
    },
    {
      title: "Your requests",
      body: [
        "To ask about, correct or delete information you have submitted, contact us through the contact page.",
      ],
    },
  ],
  ar: [
    {
      title: "البيانات التي نجمعها",
      body: [
        "عند إرسال طلب عرض سعر أو جدول كميات أو رسالة تواصل، نستلم البيانات التي تُدخلها: الاسم، والشركة، والبريد الإلكتروني، ورقم الجوال، والمدينة، واسم المشروع، والملاحظات، والمنتجات والكميات في قائمتك، وأي ملف ترفقه.",
      ],
    },
    {
      title: "كيف نستخدمها",
      body: [
        "نستخدم هذه البيانات فقط للرد على طلبك: لإعداد عروض الأسعار وتوضيح المواصفات وترتيب التوريد. تصل الطلبات إلى فريق مبيعات المنفذ عبر الأنظمة المعدّة لهذا الموقع.",
      ],
    },
    {
      title: "قائمة عرض السعر في متصفحك",
      body: [
        "تُحفظ قائمة عرض السعر في متصفحك (التخزين المحلي) لتبقى أثناء التصفح، ولا تُرسل إلينا إلا عند إرسالها. يمكنك مسحها في أي وقت من صفحة قائمة عرض السعر.",
      ],
    },
    {
      title: "التحليلات",
      body: [
        "إذا كانت التحليلات مفعّلة في هذا الموقع، فلا تُستخدم ملفات تعريف الارتباط التحليلية إلا بعد موافقتك. تتضمن أحداث التحليلات معلومات الصفحات والمنتجات فقط، ولا تُرسل محتويات النماذج أو الأسماء أو عناوين البريد أو أرقام الجوال أو الملفات إلى مزودي التحليلات.",
      ],
    },
    {
      title: "طلباتك",
      body: ["للاستفسار عن بياناتك المرسلة أو تصحيحها أو حذفها، تواصل معنا عبر صفحة التواصل."],
    },
  ],
};

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return pageMetadata({ locale, path: "/privacy", title: t.privacy.title, description: t.privacy.metaDescription });
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader
        title={t.privacy.title}
        breadcrumbs={[{ name: t.nav.home, href: href(locale) }, { name: t.privacy.title }]}
        breadcrumbLabel={t.a11y.breadcrumb}
      />
      <div className="container-page py-10">
        <div className="max-w-3xl space-y-8 rounded-[var(--radius-md)] border border-line bg-white p-6 sm:p-10">
          {content[locale].map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-navy">{s.title}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-2 text-[0.9375rem] leading-relaxed text-ink/80">{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

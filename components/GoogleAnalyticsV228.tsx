export function GoogleAnalyticsV228() {
  return (
    <>
      <script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-YNSJ2R2XQG"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-YNSJ2R2XQG');
`,
        }}
      />
    </>
  );
}

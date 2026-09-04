/** @type {import('next').NextConfig} */
const nextConfig = {
  // Byggeren linkes bevidst som /bygger/index.html og ikke som /bygger.
  // Dens stier er relative (js/app.js), og de opløses ud fra adresselinjen:
  // fra /bygger bliver de til /js/app.js og 404'er hele appen. Et redirect til
  // /bygger/ duer ikke — Next normaliserer skråstregen væk igen, og så løber
  // de to i ring. Filstien virker uden nogen omskrivning overhovedet.
  async headers() {
    return [
      {
        // Sider må aldrig serveres fra cache uden at spørge serveren først —
        // ellers arbejder en sælger videre i en gammel udgave efter et deploy.
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

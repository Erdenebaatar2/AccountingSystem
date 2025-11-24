import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslation from "./i18n/en.json";
import mnTranslation from "./i18n/mn.json";

i18n.use(initReactI18next).init({
  lng: "mn",
  fallbackLng: "en",
  resources: {
    en: { translation: enTranslation },
    mn: { translation: mnTranslation },
  },
});

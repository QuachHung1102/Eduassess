"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { translations, type Lang, type Translations } from "./translations";

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: Translations[Lang];
};

const LangContext = createContext<LangContextValue>({
  lang: "vi",
  setLang: () => {},
  tr: translations.vi,
});

const LANG_STORAGE_KEY = "edu-lang";
const LANG_STORE_EVENT = "edu-language-store-change";

function isValidLang(value: string | null): value is Lang {
  return value === "vi" || value === "en";
}

function subscribeLanguageStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(LANG_STORE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(LANG_STORE_EVENT, handleChange);
  };
}

function readLanguageSnapshot(): Lang {
  if (typeof window === "undefined") {
    return "vi";
  }

  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (isValidLang(stored)) {
    return stored;
  }

  const rootLang = document.documentElement.lang;
  return isValidLang(rootLang) ? rootLang : "vi";
}

function notifyLanguageStoreChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(LANG_STORE_EVENT));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore<Lang>(
    subscribeLanguageStore,
    readLanguageSnapshot,
    () => "vi",
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(l: Lang) {
    localStorage.setItem(LANG_STORAGE_KEY, l);
    document.documentElement.lang = l;
    notifyLanguageStoreChange();
  }

  return (
    <LangContext.Provider value={{ lang, setLang, tr: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LangContext);
}

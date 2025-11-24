import { useTranslation } from "react-i18next";
import { Globe, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdownmenu';
import { Button } from "./button";

interface LangSwitchProps {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LangSwitchProps[] = [
  { code: "mn", name: "Mongolian", nativeName: "Монгол", flag: "🇲🇳" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
];

export function LangSwitch() {
  const { i18n } = useTranslation();
  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];
  
  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>{language.flag}</span>
              <span>{language.nativeName}</span>
            </div>
            {i18n.language === language.code && (
              <Check className="w-4 h-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

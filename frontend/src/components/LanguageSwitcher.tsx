import { useLanguageStore, LANGUAGES } from '../store/languageStore';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          title={lang.label}
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-all
            ${language === lang.code
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
            }
          `}
        >
          <span>{lang.flag}</span>
          <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

import { memo } from "react";
import { useTranslation } from "react-i18next";
import "./Footer.css";

function Footer() {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "English" },
  ];

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="card text-center footer">
      &copy; 2024{" "}
      <a
        href="https://hoangnguyendong.dev"
        target="_blank"
        className="footer-link"
      >
        Hoàng Rio
      </a>
      <div className="footer-spacing" />
      {t("openSourceAt")}{" "}
      <a
        href="https://github.com/hoang-rio/lux-grid-watcher"
        target="_blank"
        className="footer-link"
      >
        Github
      </a>
      <div className="footer-spacing" />
      <div className="footer-lang-container">
        {languages.map((lang, index) => (
          <>
            <a
              href="#"
              key={lang.code}
              onClick={(e) => {
                e.preventDefault();
                handleLanguageChange(lang.code);
              }}
              className={`footer-lang-link ${
                i18n.language === lang.code ? "active" : ""
              }`}
            >
              {lang.name}
            </a>
            {index < languages.length - 1 && (
              <span className="footer-lang-separator">|</span>
            )}
          </>
        ))}
      </div>
    </div>
  );
}

export default memo(Footer);

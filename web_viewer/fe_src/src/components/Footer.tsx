import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./Footer.css";

function Footer() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "English" },
  ];

  const handleLanguageChange = (lang: string) => {
    if (i18n.language !== lang) { // only change if different
      i18n.changeLanguage(lang);
    }
  };

  return (
    <div className="card text-center footer">
      &copy; 2024 - {currentYear}{" "}
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
          <React.Fragment key={lang.code}>
            <a
              href="#"
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
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default memo(Footer);

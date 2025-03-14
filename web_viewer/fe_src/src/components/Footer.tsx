import { memo } from "react";
import { useTranslation } from "react-i18next";

function Footer() {
  const { t } = useTranslation();

  return (
    <div className="card text-center footer">
      &copy; 2024{" "}
      <a href="https://hoangnguyendong.dev" target="_blank">
        Hoàng Rio
      </a>
      <br />
      {t('openSourceAt')}{" "}
      <a href="https://github.com/hoang-rio/lux-grid-watcher" target="_blank">
        Github
      </a>
    </div>
  );
}

export default memo(Footer);

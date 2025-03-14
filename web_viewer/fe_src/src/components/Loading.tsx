import { useTranslation } from 'react-i18next';

export default function Loading() {
  const { t } = useTranslation();

  return (
    <div className="col flex-1 justify-center align-center">{t('loading')}</div>
  );
}

export const dynamic = 'force-dynamic';

export default function CalendarioPage() {
  return (
    <div>
      <div className="section-header">
        <h1>Calendário Econômico</h1>
        <p className="section-desc">Eventos e indicadores que movimentam WIN e WDO</p>
      </div>

      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <iframe
          src="https://sslecal2.investing.com/params.php?features=include;timezone;lang&columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=2,3&countries=26,72,5&calType=week&timeZone=12&lang=12&theme=dark"
          width="100%"
          height="700"
          frameBorder="0"
          allowTransparency={true}
          marginWidth={0}
          marginHeight={0}
          style={{ display: 'block' }}
        />
      </div>

      <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
        Fonte: Investing.com
      </p>
    </div>
  );
}

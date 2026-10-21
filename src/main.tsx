import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/roboto-mono/latin-400.css';
import './app/global.css';
async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const [{ startMocks }, { App }] = await Promise.all([
      import('./mocks/browser'),
      import('./app/app'),
    ]);
    await startMocks();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    return;
  }
  const { App } = await import('./app/app');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
bootstrap().catch((error) => {
  console.error(error);
  document.getElementById('root')!.textContent =
    'Não foi possível iniciar a aplicação. Recarregue a página e confira a configuração dos mocks.';
});

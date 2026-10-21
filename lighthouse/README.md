# Auditorias

Execute `npm run build:demo` e `npm run audit:lighthouse`. O runner inicia preview local quando AUDIT_BASE_URL não é informado. São três medições de início e detalhe, em mobile e desktop; resultados HTML/JSON e medianas ficam em `reports/`.

Variáveis opcionais:

- `CHROME_PATH`: caminho de um Chrome/Chromium instalado.
- `AUDIT_BASE_URL`: ambiente externo já servido (por exemplo, a URL final).
- `AUDIT_RUNS`: somente para diagnóstico; a entrega final deve usar o padrão 3.

Não alterar mocks, imagens ou funcionalidades para melhorar artificialmente a nota. As auditorias devem usar os mesmos assets e fluxos da demonstração publicada. Condições e versões ficam no `summary.json` de cada execução.

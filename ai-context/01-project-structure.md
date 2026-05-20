# Project Structure

ROOT:

- backend/
- frontend/
- ai-context/

BACKEND:

- config/
- constants/
- controllers/
- middleware/
- models/
- routes/
- services/
- utils/
- validations/
- jobs/
- queues/
- workers/
- app.js
- server.js

FRONTEND:

- public/
- src/components/
- src/context/
- src/hooks/
- src/pages/
- src/services/
- src/styles/
- src/utils/
- src/App.js
- src/index.js

Pravila:

- business logika ide u services
- controller ne sme da bude debeo
- validation ide pre controllera
- reusable frontend logika ide u hooks/utils
- API pozivi idu kroz services
- CSS ide u odvojene fajlove
- nema inline style osim ako baš mora

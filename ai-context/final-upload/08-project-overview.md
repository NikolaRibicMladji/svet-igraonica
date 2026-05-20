==================================================
project-structure
==================================================

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

==================================================
project-overview
==================================================

# Project Overview

Naziv projekta:
Svet igraonica

Tip projekta:
MERN platforma za rezervaciju dečijih igraonica u Srbiji.

Stack:

- MongoDB
- Express
- React
- Node.js

Frontend:

- React
- react-router-dom
- axios
- Context API
- odvojeni CSS fajlovi
- responsive design

Backend:

- Express
- MongoDB / Mongoose
- JWT auth
- refresh token sistem
- middleware validacije
- servisna arhitektura

Deploy:

- Frontend: Vercel
- Backend: Render

Glavni cilj:
Korisnik može da pronađe igraonicu, vidi slobodne i zauzete termine, izabere termin i napravi rezervaciju.

Owner može da upravlja igraonicom, terminima, rezervacijama i podacima igraonice.

Admin može da verifikuje igraonice i upravlja platformom.

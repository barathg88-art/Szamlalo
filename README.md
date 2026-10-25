# Számláló – szilveszteri visszaszámláló tűzijátékkal

Egy weboldal, ami visszaszámol a következő újévig (január 1. 00:00, a saját géped ideje szerint).
Amikor lejár az idő, valósághű tűzijáték indul hangeffektekkel.

## Gombok

- **Nullázás (teszt)** – azonnal 0-ra állítja a számlálót, és indul a tűzijáték. Így ki tudod próbálni.
- **10 mp-es teszt** – 10 másodpercre állítja a számlálót, így az utolsó másodperceket is látod.
- **Vissza a valódi számlálóhoz** – leállítja a tesztet.
- **Hang bekapcsolása** – a böngészők csak kattintás után engednek hangot, ezért ezzel kapcsold be.

Tipp: ha az égre kattintasz, oda is kilő egy rakétát.

## Hogyan nézd meg?

**A saját gépeden:** töltsd le a fájlokat (zöld „Code” gomb → „Download ZIP”), csomagold ki,
és kattints duplán az `index.html` fájlra.

**Interneten (GitHub Pages):**
1. A repó oldalán: **Settings** → bal oldalt **Pages**.
2. A „Branch” résznél válaszd: `main` és `/ (root)`, majd **Save**.
3. Egy-két perc múlva megjelenik a link, például: `https://barathg88-art.github.io/szamlalo/`

## Fájlok

- `index.html` – az oldal
- `style.css` – a kinézet
- `app.js` – a visszaszámlálás
- `tuzijatek.js` – a tűzijáték és a hangok (a hangokat a böngésző generálja, nincs szükség hangfájlra)

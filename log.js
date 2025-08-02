import { googleSheets } from 'https://gael-mgn.github.io/js/google-sheets.js';
const ID_Sheet = "11cwEfj8x5KkiX9z5081IN25xVCUD49bIaP0ltizI6l8";

window.onload = () => {
  setTimeout(() => {
    // Détection de robots
    const ua = navigator.userAgent.toLowerCase();
    const bots = ["googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot", "facebot", "ia_archiver"];
    const isBot = bots.some(bot => ua.includes(bot));
    if (isBot) {
      console.log("Bot détecté, script non exécuté");
      return; // On sort, pas d'exécution
    }
    if (location.protocol === "file:") {
      console.log("Exécuté en local (file://)");
      return;
    }
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      console.log("Exécuté en local (localhost)");
      return;

    }

      async function log(values, domain) {
  const payload = {
    spreadsheetId: ID_Sheet,
    sheetName: domain,
    values: values,
    domain : domain
  };

  const data = encodeURIComponent(JSON.stringify(payload));
  const body = `data=${data}`;

  const url = 'https://script.google.com/macros/s/AKfycby2DnL2yQn5__5wju4jREvkh6inrDquNVZE0zcXnsgtNqKtlaRSnWXCiHuY5w7_lGCf/exec';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body
    });

    const text = await res.text();
    console.log('Réponse du script :', text);
    return text;
  } catch (err) {
    console.error('Erreur lors de l\'envoi :', err);
    return null;
  }
}

  //import { googleSheets } from 'https://gael-mgn.github.io/js/google-sheets.js';
  



      console.log("Exécuté depuis Internet");
      const domain = window.location.hostname;
      const path = window.location.pathname;       // Chemin après le domaine (ex: /page1/test)
      const isMobile = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";
      const referrer = document.referrer;

      const iframe = (window.top !== window.self) ? "-iframe" : "";


      // Récupérer les paramètres de l'URL après le "?"
      const urlParams = new URLSearchParams(window.location.search);
      let formattedParams = "";
      urlParams.forEach((value, key) => {
        formattedParams += `${key} : ${value}\n`;
      });
      if (formattedParams.length > 0) {
        formattedParams = formattedParams.slice(0, -1); // Supprime dernier saut de ligne
      }

      if (!referrer.includes(domain)) {
          log([domain + path, referrer, isMobile + iframe, formattedParams], domain);
      }
      else {
        googleSheets([domain + path, referrer, isMobile, formattedParams], ID_Sheet, domain, true);
      }
      //
    
  }, 4000); // délai 4 secondes après le chargement complet
};

/**
 * Percorso statico di login SPID (solo dati, nessuna logica).
 *
 * Definisce `window.SPID_HELPER_STEPS`, consumato dal content script per
 * il rilevamento della pagina, lo stato di avanzamento dell'utente e il
 * rilevamento di blocco (vedi agents/agents/content-script-agent.md).
 * Questo file viene caricato come script classico (non come modulo ES):
 * per questo l'oggetto è assegnato direttamente su `window`, invece di
 * usare `export`.
 *
 * Schema di ogni step e convenzione dei selettori: vedi
 * agents/skills/spid-flow-mapper/SKILL.md per la logica generale di
 * mappatura di un percorso gestore. Le regole di scrittura dei testi
 * (title/text/hintOnBlock) seguono sempre
 * agents/skills/easy-read-it/SKILL.md (persona target: 65+, bassa
 * confidenza digitale, prima esperienza SPID).
 *
 * Ogni step ha i campi: id, title, text, icon, targetSelector,
 * expectedAction ("click" | "wait" | "none"), waitSeconds, hintOnBlock.
 */
window.SPID_HELPER_STEPS = {
  home: {
    id: "home-start",
    title: "Tocca il pulsante Entra con SPID.",
    text: "Sei nella pagina di accesso del sito.\nTocca il pulsante Entra con SPID.",
    icon: "cursor",
    targetSelector: '[data-shp="home-spid-button"]',
    expectedAction: "click",
    waitSeconds: 60,
    hintOnBlock:
      "Il pulsante Entra con SPID è in alto nella pagina.\nTocca il pulsante colorato con la scritta SPID.",
  },

  selectProvider: {
    id: "select-provider-list",
    title: "Tocca il nome del tuo gestore.",
    text: "Guarda l'elenco dei gestori SPID.\nTocca il nome del tuo gestore.",
    icon: "cursor",
    targetSelector: '[data-shp="select-provider-list"]',
    expectedAction: "click",
    waitSeconds: 75,
    hintOnBlock:
      "Non trovi il tuo gestore nell'elenco?\nScorri l'elenco verso il basso con un dito.",
  },

  providers: {
    posteid: [
      {
        id: "posteid-username",
        title: "Scrivi il tuo nome utente.",
        text: "Scrivi il nome utente di Poste ID nella casella.\nUsa quello che hai scelto quando hai creato SPID.",
        icon: "keyboard",
        targetSelector: '[data-shp="posteid-username-input"]',
        expectedAction: "wait",
        waitSeconds: 70,
        hintOnBlock:
          "Non ricordi il nome utente?\nControlla l'email che hai ricevuto da Poste ID.",
      },
      {
        id: "posteid-password",
        title: "Scrivi la tua password.",
        text: "Scrivi la password di Poste ID nella casella.\nControlla le lettere maiuscole e minuscole.",
        icon: "keyboard",
        targetSelector: '[data-shp="posteid-password-input"]',
        expectedAction: "wait",
        waitSeconds: 80,
        hintOnBlock:
          "Hai dimenticato la password?\nTocca la scritta Password dimenticata sotto la casella.",
      },
      {
        id: "posteid-submit",
        title: "Tocca il pulsante Accedi.",
        text: "Tocca il pulsante Accedi sotto la password.",
        icon: "cursor",
        targetSelector: '[data-shp="posteid-submit-button"]',
        expectedAction: "click",
        waitSeconds: 50,
        hintOnBlock:
          "Il pulsante Accedi è il riquadro colorato sotto la password.\nTocca al centro del pulsante.",
      },
      {
        id: "posteid-phone-notification",
        title: "Guarda il tuo telefono.",
        text: "Sul telefono arriva un messaggio dall'app Poste ID.\nGuarda lo schermo del telefono.",
        icon: "phone",
        targetSelector: '[data-shp="posteid-push-notification"]',
        expectedAction: "wait",
        waitSeconds: 120,
        hintOnBlock:
          "Non vedi nessun messaggio?\nApri l'app Poste ID sul telefono.",
      },
      {
        id: "posteid-fingerprint-confirm",
        title: "Conferma con l'impronta o il viso.",
        text: "Apri il messaggio dell'app Poste ID.\nConferma con l'impronta o il viso.",
        icon: "fingerprint",
        targetSelector: '[data-shp="posteid-biometric-confirm"]',
        expectedAction: "wait",
        waitSeconds: 95,
        hintOnBlock:
          "L'impronta non funziona?\nTocca Usa il codice dentro l'app Poste ID.",
      },
    ],

    sielteid: [
      {
        id: "sielteid-username",
        title: "Scrivi il tuo nome utente.",
        text: "Scrivi il nome utente di Sielte ID nella casella.\nUsa quello che hai scelto quando hai creato SPID.",
        icon: "keyboard",
        targetSelector: '[data-shp="sielteid-username-input"]',
        expectedAction: "wait",
        waitSeconds: 65,
        hintOnBlock:
          "Non ricordi il nome utente?\nControlla l'email che hai ricevuto da Sielte ID.",
      },
      {
        id: "sielteid-password",
        title: "Scrivi la tua password.",
        text: "Scrivi la password di Sielte ID nella casella.\nControlla le lettere maiuscole e minuscole.",
        icon: "keyboard",
        targetSelector: '[data-shp="sielteid-password-input"]',
        expectedAction: "wait",
        waitSeconds: 85,
        hintOnBlock:
          "Hai dimenticato la password?\nTocca la scritta Password dimenticata sotto la casella.",
      },
      {
        id: "sielteid-submit",
        title: "Tocca il pulsante Accedi.",
        text: "Tocca il pulsante Accedi sotto la password.",
        icon: "cursor",
        targetSelector: '[data-shp="sielteid-submit-button"]',
        expectedAction: "click",
        waitSeconds: 55,
        hintOnBlock:
          "Il pulsante Accedi è il riquadro colorato sotto la password.\nTocca al centro del pulsante.",
      },
      {
        id: "sielteid-qr-scan",
        title: "Inquadra il codice con la fotocamera dell'app.",
        text: "Apri l'app Sielte ID sul telefono.\nInquadra il codice a quadretti con la fotocamera dell'app.",
        icon: "scan",
        targetSelector: '[data-shp="sielteid-qr-code"]',
        expectedAction: "wait",
        waitSeconds: 110,
        hintOnBlock:
          "Non trovi la fotocamera nell'app?\nTocca l'icona del quadrato dentro l'app Sielte ID.",
      },
      {
        id: "sielteid-phone-code",
        title: "Guarda il codice sul telefono.",
        text: "Sul telefono arriva un codice da scrivere.\nLeggi bene tutti i numeri del codice.",
        icon: "phone",
        targetSelector: '[data-shp="sielteid-otp-banner"]',
        expectedAction: "wait",
        waitSeconds: 100,
        hintOnBlock: "Non vedi il codice?\nGuarda i messaggi SMS sul telefono.",
      },
      {
        id: "sielteid-otp-input",
        title: "Scrivi il codice nella casella.",
        text: "Scrivi il codice che hai letto nella casella apposita.\nScrivi solo i numeri del codice.",
        icon: "keyboard",
        targetSelector: '[data-shp="sielteid-otp-input"]',
        expectedAction: "wait",
        waitSeconds: 80,
        hintOnBlock: "Il codice non funziona più?\nTocca Invia di nuovo il codice.",
      },
      {
        id: "sielteid-otp-submit",
        title: "Tocca il pulsante Conferma.",
        text: "Tocca il pulsante Conferma sotto la casella del codice.",
        icon: "cursor",
        targetSelector: '[data-shp="sielteid-otp-submit-button"]',
        expectedAction: "click",
        waitSeconds: 50,
        hintOnBlock:
          "Il pulsante Conferma è il riquadro colorato sotto il codice.\nTocca al centro del pulsante.",
      },
    ],
  },

  success: {
    id: "success-landing",
    title: "Hai fatto l'accesso.",
    text: "Sei entrato nel Cassetto Fiscale.\nIl tuo accesso è andato bene.",
    icon: "check",
    targetSelector: '[data-shp="success-landing-panel"]',
    expectedAction: "none",
    waitSeconds: 30,
    hintOnBlock: "Se la pagina non cambia, aggiorna la pagina del sito.",
  },
};

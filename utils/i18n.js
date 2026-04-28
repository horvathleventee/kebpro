const supportedLanguages = ["hu", "en", "de"];
const defaultLanguage = "hu";

const copy = {
  hu: {
    nav: { home: "Főoldal", about: "Rólunk", quality: "Minőség", products: "Termékek", wholesale: "Nagykereskedelem", retail: "Kiskereskedelem", grants: "Pályázatok", quote: "Ajánlatkérés", order: "Megrendelés", career: "Karrier", contact: "Kapcsolat" },
    languages: { hu: "Magyar", en: "English", de: "Deutsch" },
    buttons: { quote: "Ajánlatot kérek", order: "Megrendelést adok le", contact: "Kapcsolatfelvétel", openDetails: "Részletek megnyitása", qualityDetails: "Részletes minőségi leírás", viewWholesale: "Nagykereskedelem megtekintése", logisticsDetails: "Logisztika részletei", submitQuote: "Ajánlatkérés elküldése", submitOrder: "Megrendelés elküldése", goHome: "Vissza a főoldalra" },
    footer: { description: "Magyar tulajdonú, családi vállalkozásként gyorsfagyasztott gyros- és kebab termékek gyártásával, illetve országos kiszállítással állunk partnereink rendelkezésére.", legal: "Jogi oldalak", contact: "Kapcsolat", privacy: "Adatkezelési tájékoztató", complaints: "Panaszkezelési szabályzat", imprint: "Impresszum", whistleblowing: "Belső Visszaélés-Bejelentés", copyright: "© Copyright 2026 Halasi Kebpro Kft." },
    home: { eyebrow: "Gyros- és kebab hús gyártás", title: "Gyros- és kebab hús gyártás Kiskunhalasról — minőségbiztosítva, országos lefedettséggel.", lead: "A Halasi Kebpro Kft. gyorsfagyasztott gyros- és kebab termékeket, fűszeres húskészítményeket, valamint kiegészítő termékeket gyárt és forgalmaz partnerei számára.", advantages: "Kiemelt előnyeink", advantageItems: ["Hazai alapanyagokra épülő, ellenőrzött gyártás", "A legrégebbi magyar gyros üzem", "Saját hűtött gépjárműves kiszállítás", "Nyomonkövethető, kiváló minőség"], qualityHeading: "Minőség és gyártás", qualityLead: "Sikerünk titka az alapanyagaink és végtermékeink folyamatosan ellenőrzött kiváló minősége, a modern és a hagyományos technológia egyedi ötvözete, illetve a szigorú élelmiszerhigiéniai szabályok következetes betartása.", qualityCards: [{ title: "Nyersanyagok", text: "A felhasznált hús kizárólag ellenőrzött forrásból érkezik, amelyet átvételkor és feldolgozás előtt többlépcsős kontrollnak vetünk alá." }, { title: "Fagyasztás", text: "A kész termékeket -42°C-ra beállított hűtőkamrában sokkolásos eljárással fagyasztjuk le." }, { title: "Nyomonkövetés", text: "Minden gyártási tétel teljes körűen visszakereshető, így partnereink számára átlátható és biztonságos ellátást biztosítunk." }], logisticsEyebrow: "Logisztika", logisticsTitle: "Országos lefedettség, heti ütemezésű kiszállítással.", logisticsLead: "Saját hűtős járműveinkkel Magyarország teljes területét kiszolgáljuk.", logisticsPanelTitle: "Aktív logisztikai információ", logisticsPanelText: "Mozgasd az egeret a régiók fölé, és megmutatjuk az adott zónához tartozó ellátási fókuszt.", qualityPillarsTitle: "Minőségbiztosítás 5 pillére", qualityPillarsText: "A Halasi Kebpro Kft.-nél a minőség nem külön folyamat, hanem a teljes működés alapja: ellenőrzött alapanyagok, szabályozott gyártás, sokkolásos fagyasztás, folyamatos kontroll és teljes nyomonkövethetőség.", ctaTitle: "Legyen Ön is partnerünk nagykereskedelmi vagy HORECA kiszolgálásban.", productsIntro: "Termékkínálatunk gyros- és kebab tömböket, csíkozott húsfalatokat, pitát, fűszerezett és pácolt húskészítményeket, valamint egyéb hús specialitásokat foglal magában — megrendelésre bármilyen receptúrával.", productsLink: "Részletek a termékkínálatról", ctaQuoteTitle: "Ajánlatkérés", ctaQuoteText: "Kérjen személyre szabott árajánlatot online felületünkön. Kollégáink rövid időn belül felkeresik Önt válaszunkkal!", ctaOrderTitle: "Megrendelés leadása", ctaOrderText: "Megrendelését közvetlenül online is leadhatja. Töltse ki az űrlapot, és munkatársaink rövid időn belül visszaigazolják rendelését." },
    about: { eyebrow: "Rólunk", title: "Magyar tulajdonú, folyamatosan fejlődő élelmiszeripari gyártó cég.", introTitle: "Bemutatkozás", introText: ["A Halasi Kebpro Kft. 2004 májusában alakult, német-magyar vegyes vállalkozásként. Fő tevékenységünk a kebab/gyros gyártása, melyhez a technológiát, know-how-t, fűszereket Németországból hoztuk be.", "Cégünk 2005-től teljes mértékben magyar, családi vállalkozásként működik. Folyamatosan növekvő forgalmunk 2008-ra tette elkerülhetetlenné, hogy az addigi bérelt üzemünket egy nagyobb, saját üzemre cseréljük. Jelenlegi kapacitásunk heti 14–15 tonna gyorsfagyasztott kebab/gyros gyártását teszi lehetővé, tárolókapacitásunk mintegy 18–20 tonna.", "Minden gyártási és minőségellenőrzési folyamatot kiválóan képzett szakembereink felügyelnek. A gyártás minden fázisa megfelel a legszigorúbb élelmiszerkezelési előírásoknak — dolgozóink rendszeres továbbképzéseken vesznek részt.", "A Halasi Kebpro Kft.-nek exportjoga van, amely folyamatos állatorvosi ellenőrzést is garantál. A kebab/gyros-hús tömbökön kívül csíkozott húst, saslikot, májjal töltött combfiléet és egyéb termékeket is gyártunk."], stats: [{ value: "2004", label: "Alapítás éve" }, { value: "14–15 t", label: "Heti kapacitás" }, { value: "18–20 t", label: "Tárolókapacitás" }, { value: "80+", label: "Alkalmazott" }], philosophyTitle: "Filozófiánk", philosophyItems: [{ title: "Kiváló ár-érték arány", text: "A termékek széles skáláját kínáljuk különböző variációkban, ízesítésben és méretben, kiváló ár-érték arány mellett." }, { title: "Szakértelem", text: "Jól ismerjük ügyfeleink igényeit és képesek vagyunk minden pillanatban rövid határidőn belül és rugalmasan teljesíteni a kívánságaikat. Ha hozzánk fordul, akkor a szakértőhöz fordul." }, { title: "Kiváló minőség", text: "Garantáljuk az állandó kiváló minőséget és a megbízható, határidőre történő szállítást. Modern gyártósorainkat folyamatosan fejlesztjük." }, { title: "Felelősség", text: "Élelmiszerrel dolgozunk — ez felelősséggel jár. A felelősségtudat és a szakmai felkészültség fejlesztése minden dolgozónk számára prioritás." }, { title: "A legjobbnak lenni", text: "Mi kizárólag a legjobbra koncentrálunk minden folyamatban, minden termékben." }] },
    quality: { eyebrow: "Minőség", title: "Kiemelt minőségbiztosítás a teljes gyártási és logisztikai folyamatban.", timelineTitle: "Gyártási idővonal", timelineLead: "A gyártási folyamat legfontosabb lépéseit vizuális sorrendben is kiemeltük.", sections: { quality: { title: "Kebpro minőség", paragraphs: ["Vállalatunk jelenleg mintegy 80 alkalmazottat foglalkoztat, termékeinkkel pedig az ország egész területén jelen vagyunk.", "Az élelmiszerhigiéniai szabályok maximális betartása mellett korszerű technológiai eljárásokkal és saját hűtött gépjárműveinkkel szolgáljuk ki partnereinket."] }, raw: { title: "Nyersanyagok", paragraphs: ["A termékeinkhez felhasznált húst kizárólag ellenőrzött forrásból, magyarországi partnereinktől szerezzük be.", "A nyersanyagok tekintetében napi szintű ellenőrzéseket végzünk." ] }, process: { title: "Gyártási folyamat", steps: ["A baromfihús szükség szerint megrendelésre kerül a beszállítótól.", "A leszállított áru hőmérsékletét és minőségét szakképzett kollégáink vizsgálják.", "A hús speciális hűtőházba kerül.", "A hús innen jut a gyártócsarnokba.", "A csontozást a speciális fűszerezés követi.", "Várakozási idő után a hús készen áll a döner kebab készítéséhez.", "Az ízesített csirke kebabot döner nyársra fűzzük.", "A végső súly elérése után következik a formázás és a csomagolás."] }, freezing: { title: "Fagyasztás", paragraphs: ["Az elkészült kebab nyársakat -42 °C-ra beállított speciális hűtőkamrában sokkolással lefagyasztjuk.", "Ezután -18 °C és -20 °C közötti hűtőkamrákban tároljuk őket a kiszállításig."] }, traceability: { title: "Nyomonkövetés", paragraphs: ["Az egy lépés előre, egy lépés hátra elv alapján garantáljuk az élelmiszerek biztonságát és visszakereshetőségét.", "Rendszerünk az alapanyag-beszállítótól a vevőig rögzíti a kapcsolatokat."] } } },
    services: { eyebrow: "Termékek", title: "Nagykereskedelmi termékpaletta gyros, kebab és kapcsolódó termékekhez.", introTitle: "Nagykereskedelem", introText: "A képkártyák most placeholderként működnek, így később egyszerűen csak a végleges termékfotókat kell majd a megfelelő helyre cserélni.", categoryJump: "Ugrás kategóriára", tableProduct: "Termék megnevezés", tablePack: "Kiszerelés", tableUnit: "Egység", tablePrice: "Ár", priceCustom: "Egyedi", placeholderLabel: "Termékkép helye", customText: "Bármilyen fűszerezett terméket előállítunk rendelésre, valamint friss baromfi és vízi szárnyas terméket is szállítunk. Termékeinket a HU 899-es és a HU 1439 számú saját üzemeinkben gyártjuk." },
    retail: { eyebrow: "Termékek / Kiskereskedelem", title: "Kiskereskedelmi kínálat", soon: "Hamarosan", text: "A kiskereskedelmi terméklista feltöltés alatt áll." },
    grants: { eyebrow: "Pályázatok", title: "Válassza ki, melyik pályázat részleteit szeretné megnyitni.", projectTitle: "Projekt címe", detailsEyebrow: "Pályázat részletei", beneficiary: "Kedvezményezett neve", call: "Pályázati felhívás neve, kódszáma", project: "Projekt címe, azonosító száma", amount: "Szerződött támogatás összege", supportRate: "Támogatás mértéke (%-ban)", summary: "Projekt tartalmának rövid bemutatása", endDate: "Projekt tervezett befejezési dátuma" },
    contact: { eyebrow: "Kapcsolat", title: "Vegye fel velünk a kapcsolatot.", lead: "Általános információ, partneri együttműködés vagy logisztikai kérdés esetén kollégáink készséggel állnak rendelkezésre.", details: "Elérhetőségeink", company: "Cégnév", address: "Cím", phone1: "Telefon 1", phone2: "Telefon 2", fax: "Fax", email: "E-mail", opening: "Nyitvatartás", openingHours: "H-P 08:00-16:00", quickTitle: "Gyors elérés", quickText: "Konkrét árkéréshez használja az Ajánlatkérés oldalt, megrendelés leadásához pedig a Megrendelés oldalt.", locationTitle: "Telephely", phoneTitle: "Telefonszám", emailTitle: "E-mail cím", hoursTitle: "Nyitvatartás", mapTitle: "Megközelítés", quickQuoteText: "Személyre szabott árajánlatot kérhet termékeinkre gyorsan és egyszerűen.", quickOrderText: "Adja le megrendelését közvetlenül online felületünkön keresztül.", quickCareer: "Karrier", quickCareerText: "Csatlakozzon csapatunkhoz — tekintse meg nyitott pozícióinkat." },
    forms: { name: "Név", contactName: "Kapcsolattartó neve", company: "Cégnév", email: "E-mail", phone: "Telefonszám", productInterest: "Érdeklődött termék", orderedProduct: "Megrendelt termék", estimatedQuantity: "Becsült mennyiség", quantity: "Mennyiség", address: "Szállítási cím", requestedDate: "Kért szállítás dátuma", message: "Igény leírása", note: "Megjegyzés" },
    quote: { eyebrow: "Ajánlatkérés", title: "Kérjen személyre szabott ajánlatot termékeinkre.", success: "Köszönjük ajánlatkérését! Hamarosan jelentkezünk." },
    order: { eyebrow: "Megrendelés", title: "Adja le megrendelését közvetlenül online.", success: "Köszönjük megrendelését! A részletekkel hamarosan keressük." },
    career: { eyebrow: "Karrier", title: "Csatlakozz a Halasi Kebpro csapatához!", lead: "Folyamatosan bővülő csapatunkba keressük azokat a motivált munkatársakat, akik szívesen dolgoznának egy dinamikusan fejlődő magyar élelmiszeripari vállalatnál.", whyTitle: "Miért jó nálunk dolgozni?", whyItems: ["Stabil, családi hátterű munkahely", "Versenyképes fizetés és bónuszok", "Folyamatos szakmai fejlődési lehetőség", "Barátságos munkahelyi környezet"], openPositions: "Nyitott pozíciók", dummyNotice: "Az alábbi pozíciók jelenleg minta adatok. A valós állásajánlatokért kérjük, egyeztessen velünk!", noPositions: "Jelenleg sajnos nincs meghirdetett állásunk.", applyTitle: "Jelentkezés", applyLead: "Töltse ki az alábbi űrlapot, és hamarosan felvesszük Önnel a kapcsolatot.", formName: "Teljes név", formEmail: "E-mail cím", formPhone: "Telefonszám", formMotivation: "Miért téged válasszunk?", formPosition: "Válasszon pozíciót", formCv: "Önéletrajz feltöltése (opcionális)", formCvHint: "PDF, DOC vagy DOCX, max. 5 MB", formSubmit: "Jelentkezés elküldése", success: "Jelentkezése sikeresen elküldve! Hamarosan felvesszük Önnel a kapcsolatot.", location: "Helyszín", type: "Típus" },
    errors: { notFoundTitle: "Az oldal nem található", notFoundText: "A keresett oldal nem található.", serverTitle: "Váratlan hiba", serverText: "Kérjük, próbálja meg újra később." },
  },
  en: {
    nav: { home: "Home", about: "About", quality: "Quality", products: "Products", wholesale: "Wholesale", retail: "Retail", grants: "Projects", quote: "Request Quote", order: "Order", career: "Career", contact: "Contact" },
    languages: { hu: "Hungarian", en: "English", de: "German" },
    buttons: { quote: "Request a quote", order: "Place an order", contact: "Get in touch", openDetails: "Open details", qualityDetails: "Detailed quality overview", viewWholesale: "View wholesale", logisticsDetails: "Logistics details", submitQuote: "Send quote request", submitOrder: "Send order", goHome: "Back to home" },
    footer: { description: "As a Hungarian-owned family company, we supply frozen gyros and kebab products with nationwide refrigerated delivery for our partners.", legal: "Legal", contact: "Contact", privacy: "Privacy notice", complaints: "Complaint handling policy", imprint: "Imprint", whistleblowing: "Internal Whistleblowing", copyright: "© Copyright 2026 Halasi Kebpro Ltd." },
    home: { eyebrow: "Gyros and kebab meat production", title: "Quality-assured meat production from Kiskunhalas with nationwide coverage.", lead: "Halasi Kebpro Kft. manufactures and distributes frozen gyros and kebab products, seasoned meat products and complementary items for business partners.", advantages: "Our key advantages", advantageItems: ["Controlled production based on domestic raw materials", "In-house refrigerated fleet", "Traceable products with stable quality"], qualityHeading: "Quality and production", qualityLead: "Our success is built on consistent product quality, modern technology and strict food hygiene standards.", qualityCards: [{ title: "Raw materials", text: "All meat arrives from controlled sources and is checked at intake and again before production." }, { title: "Freezing", text: "Finished products are shock-frozen in a chamber preset to -42°C." }, { title: "Traceability", text: "Every production batch remains fully traceable for a transparent and secure supply chain." }], logisticsEyebrow: "Logistics", logisticsTitle: "Nationwide coverage with scheduled weekly deliveries.", logisticsLead: "Our own refrigerated vehicles serve the whole territory of Hungary. Hovering the region cards highlights the main operating focus of each zone.", logisticsPanelTitle: "Active logistics info", logisticsPanelText: "Move over the regions to view the key service profile for each zone.", logisticsBadges: ["Nationwide refrigerated delivery", "Weekly route planning", "Flexible partner service"], logisticsStats: [{ label: "Coverage", value: "Hungary", text: "Nationwide partner service with our own refrigerated fleet." }, { label: "Routing", value: "Weekly", text: "Weekly scheduled routes with multiple rounds at priority points." }, { label: "Cold chain", value: "Controlled", text: "Tracked cold-chain handling and coordinated delivery rhythm until handover." }], qualityPillarsTitle: "Five pillars of quality assurance", qualityPillarsText: "At Halasi Kebpro Kft., quality is not a separate process but the foundation of the entire operation.", ctaTitle: "Become our partner in wholesale or HORECA supply.", productsIntro: "Our product range includes gyros and kebab blocks, sliced meat portions, pita, seasoned and marinated meat specialities, and other meat products — made to any recipe on request.", productsLink: "Full product range", ctaQuoteTitle: "Request a quote", ctaQuoteText: "Request a personalised quote through our online form. Our team will contact you shortly with a detailed offer!", ctaOrderTitle: "Place an order", ctaOrderText: "You can place your order directly online. Fill in the form and our team will confirm your order shortly." },
    about: { eyebrow: "About", title: "Hungarian-owned food manufacturing company with continuous growth.", introTitle: "About us", introText: ["Halasi Kebpro Kft. was founded in May 2004 as a Hungarian-German joint venture. Our core activity is the production of kebab and gyros products, bringing technology, know-how and spices from Germany.", "Since 2005, the company has operated as a fully Hungarian family business. Growing demand led us in 2008 to replace our leased facility with a larger, modern plant of our own. Current capacity stands at 14–15 tonnes of frozen kebab/gyros per week, with storage for approximately 18–20 tonnes.", "All production and quality-control processes are supervised by highly qualified specialists. Every production phase fully meets the strictest food-handling standards — all employees participate in regular training.", "Halasi Kebpro Kft. holds an export licence, which also guarantees continuous veterinary inspection. In addition to kebab/gyros meat blocks, we produce sliced kebab/gyros, shashlik, thigh fillets filled with liver and other specialities."], stats: [{ value: "2004", label: "Year founded" }, { value: "14–15 t", label: "Weekly capacity" }, { value: "18–20 t", label: "Storage capacity" }, { value: "80+", label: "Employees" }], philosophyTitle: "Our philosophy", philosophyItems: [{ title: "Outstanding value for money", text: "We offer a wide range of products in various combinations, flavours and sizes at an excellent price-to-quality ratio." }, { title: "Expertise", text: "We know our customers' needs well and are always able to fulfil their requests flexibly and at short notice. When you come to us, you come to the experts." }, { title: "Excellent quality", text: "We guarantee consistent top quality and reliable on-time delivery, while continuously upgrading our production lines." }, { title: "Responsibility", text: "We work with food — this carries responsibility. Building accountability and professional readiness is a priority for every employee." }, { title: "Striving for the best", text: "We focus exclusively on the best in every process and every product." }] },
    quality: { eyebrow: "Quality", title: "High-level quality assurance across production and logistics.", timelineTitle: "Production timeline", timelineLead: "We also highlight the key production stages in a visual sequence.", sections: { quality: { title: "Kebpro quality", paragraphs: ["Our company currently employs around 80 people and our products are present across the whole country.", "Modern technology and our refrigerated fleet help us supply partners every day."] }, raw: { title: "Raw materials", paragraphs: ["We source the meat used in our products only from controlled suppliers in Hungary.", "Raw materials are checked daily and used in line with strict food hygiene regulations."] }, process: { title: "Production process", steps: ["Poultry meat is ordered from the supplier as needed.", "Delivered goods are checked by our qualified staff.", "The meat is moved to dedicated cold storage.", "From there it goes to the production hall.", "Deboning is followed by seasoning.", "After a resting period the meat is ready for doner production.", "The seasoned meat is assembled onto skewers.", "The final step is shaping and wrapping."] }, freezing: { title: "Freezing", paragraphs: ["Finished kebab skewers are shock-frozen in a special chamber preset to -42°C.", "They are then stored at -18°C to -20°C until delivery."] }, traceability: { title: "Traceability", paragraphs: ["Based on the principle of one step forward, one step back, we guarantee product safety and traceability.", "Our system records the connection from raw material supplier to customer."] } } },
    services: { eyebrow: "Products", title: "Wholesale product portfolio for gyros, kebab and related items.", introTitle: "Wholesale", introText: "These image cards currently act as placeholders, so later you only need to replace them with the final product photos.", categoryJump: "Jump to category", tableProduct: "Product", tablePack: "Packaging", tableUnit: "Unit", tablePrice: "Price", priceCustom: "Custom", placeholderLabel: "Product image placeholder", customText: "We manufacture seasoned products on demand and also supply fresh poultry and waterfowl products. Our products are manufactured in our own HU 899 and HU 1439 plants." },
    retail: { eyebrow: "Products / Retail", title: "Retail range", soon: "Coming soon", text: "The retail product list is currently being prepared." },
    grants: { eyebrow: "Projects", title: "Choose which project description you would like to open.", projectTitle: "Project title", detailsEyebrow: "Project details", beneficiary: "Beneficiary", call: "Call reference", project: "Project title and identifier", amount: "Contracted support amount", supportRate: "Support rate (%)", summary: "Short project description", endDate: "Planned completion date" },
    contact: { eyebrow: "Contact", title: "Get in touch with us.", lead: "For general information, partnership topics or logistics questions, our colleagues are ready to help.", details: "Contact details", company: "Company", address: "Address", phone1: "Phone 1", phone2: "Phone 2", fax: "Fax", email: "E-mail", opening: "Office hours", openingHours: "Mon-Fri 08:00-16:00", quickTitle: "Quick access", quickText: "For pricing requests please use the Request Quote page, and for direct ordering use the Order page.", locationTitle: "Location", phoneTitle: "Phone", emailTitle: "E-mail address", hoursTitle: "Office hours", mapTitle: "How to find us", quickQuoteText: "Request a personalised quote for our products quickly and easily.", quickOrderText: "Place your order directly through our online platform.", quickCareer: "Career", quickCareerText: "Join our team — check out our open positions." },
    forms: { name: "Name", contactName: "Contact person", company: "Company", email: "E-mail", phone: "Phone", productInterest: "Interested product", orderedProduct: "Ordered product", estimatedQuantity: "Estimated quantity", quantity: "Quantity", address: "Delivery address", requestedDate: "Requested delivery date", message: "Request details", note: "Note" },
    quote: { eyebrow: "Request Quote", title: "Request a tailored offer for our products.", success: "Thank you for your request. We will get back to you shortly." },
    order: { eyebrow: "Order", title: "Place your order directly online.", success: "Thank you for your order. We will contact you with the details shortly." },
    career: { eyebrow: "Career", title: "Join the Halasi Kebpro team!", lead: "We are constantly looking for motivated people who enjoy working at a dynamically growing Hungarian food industry company.", whyTitle: "Why work with us?", whyItems: ["Stable, family-owned workplace", "Competitive salary and bonuses", "Continuous professional development", "Friendly working environment"], openPositions: "Open positions", dummyNotice: "The positions below are currently sample data. For real job offers please contact us directly!", noPositions: "There are currently no open positions.", applyTitle: "Apply", applyLead: "Fill out the form below and we will get back to you shortly.", formName: "Full name", formEmail: "Email address", formPhone: "Phone number", formMotivation: "Why should we choose you?", formPosition: "Select a position", formCv: "Upload CV (optional)", formCvHint: "PDF, DOC or DOCX, max 5 MB", formSubmit: "Submit application", success: "Your application has been submitted successfully! We will contact you soon.", location: "Location", type: "Type" },
    errors: { notFoundTitle: "Page not found", notFoundText: "The page you are looking for could not be found.", serverTitle: "Unexpected error", serverText: "Please try again later." },
  },
  de: {
    nav: { home: "Startseite", about: "Über uns", quality: "Qualität", products: "Produkte", wholesale: "Großhandel", retail: "Einzelhandel", grants: "Förderprojekte", quote: "Angebotsanfrage", order: "Bestellung", career: "Karriere", contact: "Kontakt" },
    languages: { hu: "Ungarisch", en: "Englisch", de: "Deutsch" },
    buttons: { quote: "Angebot anfragen", order: "Bestellung aufgeben", contact: "Kontakt", openDetails: "Details öffnen", qualityDetails: "Detaillierte Qualitätsübersicht", viewWholesale: "Großhandel ansehen", logisticsDetails: "Logistikdetails", submitQuote: "Anfrage senden", submitOrder: "Bestellung senden", goHome: "Zur Startseite" },
    footer: { description: "Als ungarisches Familienunternehmen beliefern wir unsere Partner mit tiefgekühlten Gyros- und Kebabprodukten sowie gekühlter landesweiter Zustellung.", legal: "Rechtliches", contact: "Kontakt", privacy: "Datenschutzhinweis", complaints: "Beschwerdeordnung", imprint: "Impressum", whistleblowing: "Internes Hinweisgebersystem", copyright: "© Copyright 2026 Halasi Kebpro GmbH" },
    home: { eyebrow: "Gyros- und Kebabfleischproduktion", title: "Qualitätsgesicherte Fleischproduktion aus Kiskunhalas mit landesweiter Abdeckung.", lead: "Die Halasi Kebpro Kft. produziert und vertreibt tiefgekühlte Gyros- und Kebabprodukte, gewürzte Fleischwaren sowie ergänzende Produkte für Geschäftspartner.", advantages: "Unsere wichtigsten Vorteile", advantageItems: ["Kontrollierte Produktion auf Basis heimischer Rohstoffe", "Eigene gekühlte Fahrzeugflotte", "Rückverfolgbare Produkte mit stabiler Qualität"], qualityHeading: "Qualität und Produktion", qualityLead: "Unser Erfolg basiert auf gleichbleibender Produktqualität, moderner Technologie und strengen Lebensmittelhygienestandards.", qualityCards: [{ title: "Rohstoffe", text: "Das eingesetzte Fleisch stammt ausschließlich aus kontrollierten Quellen und wird bei der Übernahme sowie vor der Verarbeitung geprüft." }, { title: "Gefrieren", text: "Fertige Produkte werden in einer auf -42 °C eingestellten Kammer schockgefrostet." }, { title: "Rückverfolgbarkeit", text: "Jede Produktionscharge bleibt vollständig nachvollziehbar und sorgt für eine transparente und sichere Lieferkette." }], logisticsEyebrow: "Logistik", logisticsTitle: "Landesweite Abdeckung mit planmäßigen wöchentlichen Lieferungen.", logisticsLead: "Mit unseren eigenen Kühlfahrzeugen bedienen wir das gesamte Gebiet Ungarns. Beim Überfahren der Regionskarten wird der jeweilige Versorgungsschwerpunkt sichtbar.", logisticsPanelTitle: "Aktive Logistikinformation", logisticsPanelText: "Bewege die Maus über die Regionen, um das Leistungsprofil der jeweiligen Zone zu sehen.", qualityPillarsTitle: "Fünf Säulen der Qualitätssicherung", qualityPillarsText: "Bei der Halasi Kebpro Kft. ist Qualität kein separater Prozess, sondern die Grundlage des gesamten Betriebs.", ctaTitle: "Werden Sie unser Partner im Großhandel oder in der HORECA-Belieferung.", productsIntro: "Unser Sortiment umfasst Gyros- und Kebabblöcke, geschnittene Fleischportionen, Pita, gewürzte und marinierte Fleischspezialitäten sowie weitere Fleischwaren — auf Wunsch nach individueller Rezeptur.", productsLink: "Vollständiges Sortiment", ctaQuoteTitle: "Angebot anfragen", ctaQuoteText: "Fordern Sie ein individuelles Angebot über unser Online-Formular an. Unser Team meldet sich kurzfristig mit einem detaillierten Angebot!", ctaOrderTitle: "Bestellung aufgeben", ctaOrderText: "Sie können Ihre Bestellung direkt online aufgeben. Füllen Sie das Formular aus und wir bestätigen Ihre Bestellung zeitnah." },
    about: { eyebrow: "Über uns", title: "Ungarisches Lebensmittelunternehmen mit kontinuierlicher Entwicklung.", introTitle: "Unternehmensprofil", introText: ["Die Halasi Kebpro Kft. wurde im Mai 2004 als deutsch-ungarisches Gemeinschaftsunternehmen gegründet. Unsere Kerntätigkeit ist die Herstellung von Kebab- und Gyrosprodukten; Technologie, Know-how und Gewürze stammen aus Deutschland.", "Seit 2005 ist das Unternehmen ein vollständig ungarisches Familienunternehmen. Das kontinuierliche Wachstum machte es 2008 notwendig, unsere gemietete Produktionsstätte durch eine größere, eigene Anlage zu ersetzen. Die aktuelle Kapazität beträgt 14–15 Tonnen tiefgekühltes Kebab/Gyros pro Woche, mit einem Lagerbestand von rund 18–20 Tonnen.", "Alle Produktions- und Qualitätskontrollprozesse werden von hochqualifizierten Fachkräften überwacht. Jede Produktionsphase erfüllt die strengsten Lebensmittelhygienestandards — alle Mitarbeiter nehmen regelmäßig an Weiterbildungen teil.", "Die Halasi Kebpro Kft. verfügt über eine Exportlizenz, die auch eine kontinuierliche veterinärmedizinische Überwachung gewährleistet. Neben Kebab-/Gyrosfleischblöcken stellen wir auch geschnittenes Kebab-/Gyrosfleisch, Schaschlik, leberstopfgefüllte Oberschenkelfilets und weitere Produkte her."], stats: [{ value: "2004", label: "Gründungsjahr" }, { value: "14–15 t", label: "Wöchentl. Kapazität" }, { value: "18–20 t", label: "Lagerkapazität" }, { value: "80+", label: "Mitarbeitende" }], philosophyTitle: "Unsere Philosophie", philosophyItems: [{ title: "Hervorragendes Preis-Leistungs-Verhältnis", text: "Wir bieten eine breite Produktpalette in verschiedenen Variationen, Geschmacksrichtungen und Größen zu einem hervorragenden Preis-Leistungs-Verhältnis an." }, { title: "Fachkompetenz", text: "Wir kennen die Bedürfnisse unserer Kunden genau und sind stets in der Lage, ihre Wünsche flexibel und kurzfristig zu erfüllen." }, { title: "Hervorragende Qualität", text: "Wir garantieren gleichbleibend hohe Qualität und zuverlässige termingerechte Lieferung, während wir unsere Produktionslinien kontinuierlich weiterentwickeln." }, { title: "Verantwortung", text: "Wir arbeiten mit Lebensmitteln — das ist mit Verantwortung verbunden. Die Förderung von Verantwortungsbewusstsein und fachlicher Kompetenz hat für alle Mitarbeiter Priorität." }, { title: "Nach dem Besten streben", text: "Wir konzentrieren uns ausschließlich auf das Beste in jedem Prozess und jedem Produkt." }] },
    quality: { eyebrow: "Qualität", title: "Hervorgehobene Qualitätssicherung im gesamten Produktions- und Logistikprozess.", timelineTitle: "Produktionszeitlinie", timelineLead: "Die wichtigsten Produktionsschritte haben wir zusätzlich visuell hervorgehoben.", sections: { quality: { title: "Kebpro-Qualität", paragraphs: ["Unser Unternehmen beschäftigt derzeit rund 80 Mitarbeitende und unsere Produkte sind landesweit präsent.", "Moderne Technologie und unsere Kühlfahrzeuge ermöglichen die tägliche Versorgung unserer Partner."] }, raw: { title: "Rohstoffe", paragraphs: ["Das verwendete Fleisch beziehen wir ausschließlich aus kontrollierten Quellen ungarischer Partner.", "Die Rohstoffe werden täglich kontrolliert und nach strengen Hygienevorschriften verarbeitet."] }, process: { title: "Produktionsprozess", steps: ["Geflügelfleisch wird je nach Bedarf bestellt.", "Die angelieferte Ware wird geprüft.", "Das Fleisch gelangt in den Kühlbereich.", "Von dort geht es in die Produktionshalle.", "Es folgen Entbeinen und Würzen.", "Nach der Ruhezeit ist das Fleisch bereit.", "Das gewürzte Fleisch wird auf Spieße gesteckt.", "Danach folgen Formgebung und Verpackung."] }, freezing: { title: "Gefrieren", paragraphs: ["Die fertigen Kebab-Spieße werden in einer auf -42 °C eingestellten Spezialkammer schockgefrostet.", "Bis zur Auslieferung lagern sie bei -18 °C bis -20 °C."] }, traceability: { title: "Rückverfolgbarkeit", paragraphs: ["Nach dem Prinzip ein Schritt vor, ein Schritt zurück gewährleisten wir die Sicherheit und Nachverfolgbarkeit der Lebensmittel.", "Unser System dokumentiert die Beziehungen vom Lieferanten bis zum Kunden."] } } },
    services: { eyebrow: "Produkte", title: "Großhandelssortiment für Gyros, Kebab und ergänzende Produkte.", introTitle: "Großhandel", introText: "Die Bildkarten funktionieren derzeit als Platzhalter, sodass später nur noch die finalen Produktfotos ersetzt werden müssen.", categoryJump: "Zur Kategorie springen", tableProduct: "Produkt", tablePack: "Verpackung", tableUnit: "Einheit", tablePrice: "Preis", priceCustom: "Individuell", placeholderLabel: "Platzhalter für Produktbild", customText: "Wir fertigen gewürzte Produkte auf Bestellung und liefern außerdem frische Geflügel- und Wassergeflügelprodukte. Unsere Produkte werden in unseren eigenen Betrieben HU 899 und HU 1439 hergestellt." },
    retail: { eyebrow: "Produkte / Einzelhandel", title: "Einzelhandelssortiment", soon: "Demnächst", text: "Die Einzelhandelsproduktliste wird derzeit vorbereitet." },
    grants: { eyebrow: "Förderprojekte", title: "Wählen Sie aus, welche Projektbeschreibung Sie öffnen möchten.", projectTitle: "Projektbezeichnung", detailsEyebrow: "Projektdetails", beneficiary: "Begünstigter", call: "Förderaufruf / Kennzeichen", project: "Projekt und Kennnummer", amount: "Vertraglich zugesagte Förderung", supportRate: "Förderquote (%)", summary: "Kurzbeschreibung des Projekts", endDate: "Geplantes Abschlussdatum" },
    contact: { eyebrow: "Kontakt", title: "Nehmen Sie Kontakt mit uns auf.", lead: "Bei allgemeinen Fragen, Partnerschaften oder logistischen Themen stehen Ihnen unsere Kolleginnen und Kollegen gerne zur Verfügung.", details: "Kontaktdaten", company: "Firma", address: "Adresse", phone1: "Telefon 1", phone2: "Telefon 2", fax: "Fax", email: "E-Mail", opening: "Öffnungszeiten", openingHours: "Mo-Fr 08:00-16:00", quickTitle: "Schnellzugriff", quickText: "Für Preisfragen nutzen Sie bitte die Seite Angebotsanfrage, für direkte Bestellungen die Seite Bestellung.", locationTitle: "Standort", phoneTitle: "Telefon", emailTitle: "E-Mail-Adresse", hoursTitle: "Öffnungszeiten", mapTitle: "So finden Sie uns", quickQuoteText: "Fordern Sie schnell und einfach ein individuelles Angebot für unsere Produkte an.", quickOrderText: "Geben Sie Ihre Bestellung direkt über unsere Online-Plattform auf.", quickCareer: "Karriere", quickCareerText: "Werden Sie Teil unseres Teams — entdecken Sie unsere offenen Stellen." },
    forms: { name: "Name", contactName: "Ansprechpartner", company: "Firma", email: "E-Mail", phone: "Telefon", productInterest: "Interessiertes Produkt", orderedProduct: "Bestelltes Produkt", estimatedQuantity: "Geschätzte Menge", quantity: "Menge", address: "Lieferadresse", requestedDate: "Gewünschtes Lieferdatum", message: "Anfragebeschreibung", note: "Bemerkung" },
    quote: { eyebrow: "Angebotsanfrage", title: "Fordern Sie ein individuelles Angebot für unsere Produkte an.", success: "Vielen Dank für Ihre Anfrage. Wir melden uns in Kürze bei Ihnen." },
    order: { eyebrow: "Bestellung", title: "Geben Sie Ihre Bestellung direkt online auf.", success: "Vielen Dank für Ihre Bestellung. Wir melden uns in Kürze mit den Details." },
    career: { eyebrow: "Karriere", title: "Werden Sie Teil des Halasi Kebpro Teams!", lead: "Wir suchen laufend motivierte Mitarbeiter, die gerne in einem dynamisch wachsenden ungarischen Lebensmittelunternehmen arbeiten.", whyTitle: "Warum bei uns arbeiten?", whyItems: ["Stabiler, familiengeführter Arbeitsplatz", "Wettbewerbsfähiges Gehalt und Boni", "Kontinuierliche berufliche Weiterentwicklung", "Freundliches Arbeitsumfeld"], openPositions: "Offene Stellen", dummyNotice: "Die unten aufgeführten Stellen sind derzeit Beispieldaten. Für aktuelle Stellenangebote kontaktieren Sie uns bitte direkt!", noPositions: "Derzeit sind leider keine offenen Stellen vorhanden.", applyTitle: "Bewerbung", applyLead: "Füllen Sie das untenstehende Formular aus, und wir melden uns in Kürze bei Ihnen.", formName: "Vollständiger Name", formEmail: "E-Mail-Adresse", formPhone: "Telefonnummer", formMotivation: "Warum sollten wir Sie wählen?", formPosition: "Position auswählen", formCv: "Lebenslauf hochladen (optional)", formCvHint: "PDF, DOC oder DOCX, max. 5 MB", formSubmit: "Bewerbung absenden", success: "Ihre Bewerbung wurde erfolgreich eingereicht! Wir melden uns in Kürze bei Ihnen.", location: "Standort", type: "Typ" },
    errors: { notFoundTitle: "Seite nicht gefunden", notFoundText: "Die angeforderte Seite wurde nicht gefunden.", serverTitle: "Unerwarteter Fehler", serverText: "Bitte versuchen Sie es später erneut." },
  },
};

const logisticsRegions = {
  hu: [{ key: "west", title: "Nyugat-Magyarország", text: "Stabil heti útvonalak, gyors nagykereskedelmi fordulók és rugalmas regionális kiszolgálás." }, { key: "central", title: "Közép-Magyarország", text: "Sűrű partnerháló, rövid reakcióidő és kiemelt HORECA fókusz a központi zónában." }, { key: "north", title: "Észak-Magyarország", text: "Ütemezett szállítás nagyker partnereknek, megbízható hűtőlánccal és előre tervezhető fordulókkal." }, { key: "east", title: "Kelet-Magyarország", text: "Országos kiszállítás részeként rendszeres lefedettség, egyedi igényekhez igazított logisztikai egyeztetéssel." }, { key: "south", title: "Dél-Alföld", text: "Halasi közelségből induló, gyors újratervezést is támogató kiszolgálás." }],
  en: [{ key: "west", title: "Western Hungary", text: "Stable weekly routes, fast wholesale rounds and flexible regional coverage." }, { key: "central", title: "Central Hungary", text: "Dense partner network, short reaction times and a strong HORECA focus in the central zone." }, { key: "north", title: "Northern Hungary", text: "Scheduled deliveries for wholesale partners with reliable cold-chain handling." }, { key: "east", title: "Eastern Hungary", text: "Regular nationwide service with logistics coordination tailored to individual needs." }, { key: "south", title: "Southern Great Plain", text: "Fast-serving zone supported by proximity to Kiskunhalas and flexible replanning." }],
  de: [{ key: "west", title: "Westungarn", text: "Stabile Wochenrouten, schnelle Großhandelsfahrten und flexible regionale Versorgung." }, { key: "central", title: "Mittelungarn", text: "Dichtes Partnernetz, kurze Reaktionszeiten und starker HORECA-Fokus in der Zentralregion." }, { key: "north", title: "Nordungarn", text: "Planmäßige Auslieferung für Großhandelspartner mit verlässlicher Kühlkette." }, { key: "east", title: "Ostungarn", text: "Regelmäßige landesweite Belieferung mit auf individuelle Anforderungen abgestimmter Logistik." }, { key: "south", title: "Südliche Tiefebene", text: "Schnell bediente Zone dank der Nähe zu Kiskunhalas und flexibler Routenplanung." }],
};
const productCatalog = {
  hu: [
    { slug: "gyros-kebab", title: "Gyros/Kebab termékek", cardLead: "Gyros és kebab főtermékek, nagykereskedelmi kiszerelésekben.", items: [["Gyorsfagyasztott csirke kebab", "5,10,15,20,25,....", "kg"], ["Gyorsfagyasztott borjúhúsos kebab (EU)", "7kg, 10kg, 15kg, 20kg", "kg"], ["Gyorsfagyasztott csirke kebab csík (bőr nélkül)", "5x2kg, 10kg/karton", "kg"], ["Gyorsfagyasztott csirke sült kebab", "6x1,5kg, 9kg/karton", "kg"]] },
    { slug: "fuszeres", title: "Fűszeres termékek", cardLead: "Magyaros fűszerezésű készítmények, stabil ízprofilra optimalizálva.", items: [["Gyorsfagyasztott saslik (magyaros fűszerezésű)", "5kg/karton", "kg"], ["Gyorsfagyasztott saslik szalonnával (magyaros fűszerezésű)", "5kg/karton", "kg"]] },
    { slug: "egyeb", title: "Egyéb termékek", cardLead: "Speciális, rendeléshez igazított húskészítmények és kiegészítők.", items: [["Gyorsfagyasztott kakas taréj", "10x0,5kg, 5kg/karton", "kg"], ["Gyorsfagyasztott kakas here", "-", "kg"]] },
    { slug: "kiegeszitok", title: "Kiegészítő termékek", cardLead: "Pita, tortilla, desszert és ital kiegészítők egy helyen.", items: [["Gyorsfagyasztott (Zsebes) Pita", "70/80/90/100 gr", "db"], ["Dürüm Tortilla 25cm", "18db/zacskó", "db"], ["Dürüm Tortilla 30cm", "18db/zacskó", "db"], ["Baklava", "24db/karton", "db"], ["Marlenka Diós", "-", "db"], ["Marlenka Csokis", "-", "db"], ["Ayran Joghurt", "20db/karton", "db"]] },
    { slug: "gorog", title: "Görög termékek", cardLead: "Importált vagy kapcsolódó görög termékek a teljes kínálat kiegészítésére.", items: [["Eredeti Görög Joghurt", "5kg/egység", "egység"], ["Eredeti Görög Pita", "10db/csomag", "csomag"]] },
    { slug: "torok", title: "Török termékek", cardLead: "Kiegészítő török termékek és csomagolóanyagok partnereink részére.", items: [["Török joghurt Haydi 3,5%", "10 kg", "db"], ["Gyros zacskó nylon", "1000db/csomag", "csomag"], ["Gyros zacskó papír", "2500db/csomag", "csomag"]] },
  ],
  en: [
    { slug: "gyros-kebab", title: "Gyros/Kebab products", cardLead: "Core gyros and kebab products in wholesale packaging sizes.", items: [["Frozen chicken kebab", "5,10,15,20,25,....", "kg"], ["Frozen veal kebab (EU)", "7kg, 10kg, 15kg, 20kg", "kg"], ["Frozen chicken kebab strips (skinless)", "5x2kg, 10kg/carton", "kg"], ["Frozen roasted chicken kebab", "6x1.5kg, 9kg/carton", "kg"]] },
    { slug: "seasoned", title: "Seasoned products", cardLead: "Seasoned preparations optimized for consistent flavour profiles.", items: [["Frozen shashlik (Hungarian seasoning)", "5kg/carton", "kg"], ["Frozen shashlik with bacon (Hungarian seasoning)", "5kg/carton", "kg"]] },
    { slug: "other", title: "Other products", cardLead: "Special meat preparations and custom supporting items.", items: [["Frozen rooster comb", "10x0.5kg, 5kg/carton", "kg"], ["Frozen rooster testicle", "-", "kg"]] },
    { slug: "extras", title: "Complementary products", cardLead: "Pita, tortilla, desserts and beverage complements in one place.", items: [["Frozen pocket pita", "70/80/90/100 gr", "pcs"], ["Durum tortilla 25 cm", "18 pcs/bag", "pcs"], ["Durum tortilla 30 cm", "18 pcs/bag", "pcs"], ["Baklava", "24 pcs/carton", "pcs"], ["Marlenka Walnut", "-", "pcs"], ["Marlenka Chocolate", "-", "pcs"], ["Ayran yoghurt", "20 pcs/carton", "pcs"]] },
    { slug: "greek", title: "Greek products", cardLead: "Imported or complementary Greek items for a fuller assortment.", items: [["Original Greek yoghurt", "5kg/unit", "unit"], ["Original Greek pita", "10 pcs/pack", "pack"]] },
    { slug: "turkish", title: "Turkish products", cardLead: "Additional Turkish items and packaging materials for partners.", items: [["Turkish yoghurt Haydi 3.5%", "10 kg", "pcs"], ["Gyros nylon bag", "1000 pcs/pack", "pack"], ["Gyros paper bag", "2500 pcs/pack", "pack"]] },
  ],
  de: [
    { slug: "gyros-kebab", title: "Gyros/Kebab-Produkte", cardLead: "Zentrale Gyros- und Kebabprodukte in Großhandelsverpackungen.", items: [["Tiefgekühlter Hähnchen-Kebab", "5,10,15,20,25,....", "kg"], ["Tiefgekühlter Kalbfleisch-Kebab (EU)", "7kg, 10kg, 15kg, 20kg", "kg"], ["Tiefgekühlte Hähnchen-Kebabstreifen (ohne Haut)", "5x2kg, 10kg/Karton", "kg"], ["Tiefgekühlter gebratener Hähnchen-Kebab", "6x1,5kg, 9kg/Karton", "kg"]] },
    { slug: "seasoned", title: "Gewürzte Produkte", cardLead: "Gewürzte Zubereitungen mit stabiler Geschmackscharakteristik.", items: [["Tiefgekühltes Schaschlik (ungarische Würzung)", "5kg/Karton", "kg"], ["Tiefgekühltes Schaschlik mit Speck (ungarische Würzung)", "5kg/Karton", "kg"]] },
    { slug: "other", title: "Weitere Produkte", cardLead: "Spezielle Fleischzubereitungen und ergänzende Sonderartikel.", items: [["Tiefgekühlter Hahnenkamm", "10x0,5kg, 5kg/Karton", "kg"], ["Tiefgekühlte Hahnenhoden", "-", "kg"]] },
    { slug: "extras", title: "Ergänzende Produkte", cardLead: "Pita, Tortilla, Desserts und Getränkeergänzungen an einem Ort.", items: [["Tiefgekühlte Taschenpita", "70/80/90/100 gr", "Stk"], ["Dürüm-Tortilla 25 cm", "18 Stk/Beutel", "Stk"], ["Dürüm-Tortilla 30 cm", "18 Stk/Beutel", "Stk"], ["Baklava", "24 Stk/Karton", "Stk"], ["Marlenka Walnuss", "-", "Stk"], ["Marlenka Schoko", "-", "Stk"], ["Ayran Joghurt", "20 Stk/Karton", "Stk"]] },
    { slug: "greek", title: "Griechische Produkte", cardLead: "Importierte oder ergänzende griechische Produkte für ein vollständigeres Sortiment.", items: [["Original griechischer Joghurt", "5kg/Einheit", "Einheit"], ["Original griechische Pita", "10 Stk/Packung", "Packung"]] },
    { slug: "turkish", title: "Türkische Produkte", cardLead: "Zusätzliche türkische Produkte und Verpackungsmaterialien für unsere Partner.", items: [["Türkischer Joghurt Haydi 3,5%", "10 kg", "Stk"], ["Gyros-Beutel Nylon", "1000 Stk/Packung", "Packung"], ["Gyros-Beutel Papier", "2500 Stk/Packung", "Packung"]] },
  ],
};


const retailCatalog = {
  hu: [
    { slug: "pitak", title: "Piták", cardLead: "Zsebes és görög piták több méretben, klasszikus és teljes kiőrlésű változatban.", items: [["Pita 70", "10 db/tasak, 100 db/karton", "db"], ["Pita 80", "10 db/tasak, 100 db/karton", "db"], ["Pita 90", "10 db/tasak, 100 db/karton", "db"], ["Pita 100", "10 db/tasak, 100 db/karton", "db"], ["Pita 80 teljes kiőrlésű", "10 db/tasak", "db"], ["Görög pita", "10 db/tasak, 120 db/karton", "db"], ["Görög pita teljes kiőrlésű", "10 db/tasak, 120 db/karton", "db"]] },
    { slug: "tortillak", title: "Tortillák", cardLead: "Dürüm és mexikói tortilla termékek normál, teljes kiőrlésű és gluténmentes változatban.", items: [["Dürüm tortilla 25 cm", "18 db/csomag", "csomag"], ["Dürüm tortilla 30 cm", "18 db/csomag", "csomag"], ["Dürüm tortilla 30 cm tk", "18 db/csomag", "csomag"], ["Mexifoods tortilla - gm, 15 cm", "10 db/csomag", "csomag"]] },
    { slug: "desszertek", title: "Desszertek", cardLead: "Marlenka és baklava desszertek több ízben, tálcás vagy darabos kiszerelésben.", items: [["Marlenka (csokis, diós)", "", "db"], ["Marlenka (gluténmentes)", "", "db"], ["Baklava (csokis, diós, vegyes)", "24 db/tálca", "tálca"]] },
    { slug: "kiegeszitok-csomagolas", title: "Kiegészítők, csomagolóanyagok", cardLead: "Falafel, olajbogyó és csomagolóanyagok a teljes kiszolgáláshoz.", items: [["Falafel", "1 kg/tasak", "db"], ["Hutesa olajbogyó fekete szeletelt", "", "db"], ["Hutesa olajbogyó zöld szeletelt", "", "db"], ["Pita tasak papír", "", "tasak"], ["Pita tasak nylon", "", "tasak"]] },
  ],
  en: [
    { slug: "pitas", title: "Pitas", cardLead: "Pocket and Greek pitas in multiple sizes, classic and wholegrain versions.", items: [["Pita 70", "10 pcs/bag, 100 pcs/carton", "pcs"], ["Pita 80", "10 pcs/bag, 100 pcs/carton", "pcs"], ["Pita 90", "10 pcs/bag, 100 pcs/carton", "pcs"], ["Pita 100", "10 pcs/bag, 100 pcs/carton", "pcs"], ["Pita 80 wholegrain", "10 pcs/bag", "pcs"], ["Greek pita", "10 pcs/bag, 120 pcs/carton", "pcs"], ["Greek pita wholegrain", "10 pcs/bag, 120 pcs/carton", "pcs"]] },
    { slug: "tortillas", title: "Tortillas", cardLead: "Durum and Mexican tortilla products in classic, wholegrain and gluten-free versions.", items: [["Durum tortilla 25 cm", "18 pcs/pack", "pack"], ["Durum tortilla 30 cm", "18 pcs/pack", "pack"], ["Durum tortilla 30 cm wholegrain", "18 pcs/pack", "pack"], ["Mexifoods tortilla - gluten-free, 15 cm", "10 pcs/pack", "pack"]] },
    { slug: "desserts", title: "Desserts", cardLead: "Marlenka and baklava desserts in multiple flavours.", items: [["Marlenka (chocolate, walnut)", "", "pcs"], ["Marlenka (gluten-free)", "", "pcs"], ["Baklava (chocolate, walnut, mixed)", "24 pcs/tray", "tray"]] },
    { slug: "extras-packaging", title: "Extras and packaging", cardLead: "Falafel, olives and packaging materials for complete service.", items: [["Falafel", "1 kg/bag", "pcs"], ["Hutesa sliced black olives", "", "pcs"], ["Hutesa sliced green olives", "", "pcs"], ["Pita paper bag", "", "bag"], ["Pita nylon bag", "", "bag"]] },
  ],
  de: [
    { slug: "pitas", title: "Pitas", cardLead: "Taschen- und griechische Pitas in mehreren Größen, klassisch und Vollkorn.", items: [["Pita 70", "10 Stk/Beutel, 100 Stk/Karton", "Stk"], ["Pita 80", "10 Stk/Beutel, 100 Stk/Karton", "Stk"], ["Pita 90", "10 Stk/Beutel, 100 Stk/Karton", "Stk"], ["Pita 100", "10 Stk/Beutel, 100 Stk/Karton", "Stk"], ["Pita 80 Vollkorn", "10 Stk/Beutel", "Stk"], ["Griechische Pita", "10 Stk/Beutel, 120 Stk/Karton", "Stk"], ["Griechische Pita Vollkorn", "10 Stk/Beutel, 120 Stk/Karton", "Stk"]] },
    { slug: "tortillas", title: "Tortillas", cardLead: "Dürüm- und mexikanische Tortillas in klassischer, Vollkorn- und glutenfreier Variante.", items: [["Dürüm Tortilla 25 cm", "18 Stk/Packung", "Packung"], ["Dürüm Tortilla 30 cm", "18 Stk/Packung", "Packung"], ["Dürüm Tortilla 30 cm Vollkorn", "18 Stk/Packung", "Packung"], ["Mexifoods Tortilla - glutenfrei, 15 cm", "10 Stk/Packung", "Packung"]] },
    { slug: "desserts", title: "Desserts", cardLead: "Marlenka und Baklava in mehreren Geschmacksrichtungen.", items: [["Marlenka (Schoko, Walnuss)", "", "Stk"], ["Marlenka (glutenfrei)", "", "Stk"], ["Baklava (Schoko, Walnuss, gemischt)", "24 Stk/Tablett", "Tablett"]] },
    { slug: "extras-verpackung", title: "Extras und Verpackung", cardLead: "Falafel, Oliven und Verpackungsmaterialien für komplette Versorgung.", items: [["Falafel", "1 kg/Beutel", "Stk"], ["Hutesa schwarze Oliven geschnitten", "", "Stk"], ["Hutesa grüne Oliven geschnitten", "", "Stk"], ["Pita Papierbeutel", "", "Beutel"], ["Pita Nylonbeutel", "", "Beutel"]] },
  ],
};

const grantItems = {
  hu: [
    { slug: "vp3-4.2.1-4.2.2-2-21", title: "VP3-4.2.1-4.2.2-2-21", image: "/images/141mil.jpg", beneficiary: "HALASI KEBPRO Élelmiszerfeldolgozó és Kereskedelmi Kft.", call: "Élelmiszeripari üzemek komplex fejlesztése; VP3-4.2.1-4.2.2-2-21", project: "A Halasi Kebpro Kft. komplex fejlesztése; 3301640506", amount: "141.447.690 Ft", supportRate: "50%", summary: ["A projekt célja volt, hogy a termékek értéknövelését és a piacra jutást elősegítő, a technológiai fejlesztést, továbbá a környezeti erőforrás-hatékonyságot célzó komplex beruházásokat támogassa.", "A projekt végrehajtása elősegítette a Halasi Kebpro Kft. versenyképességének javítását a legkorszerűbb, innovatív technológiák megvalósításával.", "A projekt műszaki-szakmai előrehaladása a tervezettek szerint alakult.", "Beszerzésre és beüzemelésre került többek között Fiat Ducato teherjármű, légcsere rendszer, szeletelő robot, targonca és csomagológép."], endDate: "2023.08.30." },
    { slug: "vp-3-4.2.1-15", title: "VP-3-4.2.1-15", image: "/images/159mil.jpg", beneficiary: "HALASI KEBPRO Élelmiszer feldolgozó és Kereskedelmi Kft.", call: "Mezőgazdasági termékek értéknövelése és erőforrás-hatékonyságának elősegítése a feldolgozásban című, VP-3-4.2.1-15", project: "Mezőgazdasági termékek értéknövelése; Hússütő üzem építése a Halasi Kebpro Kft.-nél; 1773089087", amount: "159.777.828 Ft", supportRate: "50%", summary: ["A projektben magasabb hozzáadott értékű termékek előállítása és piacbővítés érdekében új hússütő üzem létesült.", "A beruházás része volt a teljes technológia és infrastruktúra kialakítása, környezetkímélő technológiák bevezetése, megújuló energia felhasználása és új munkahelyek létrehozása.", "Kialakításra került a kapcsolódó üzemi út és járda, továbbá az alapanyag hűtéséhez és sütött termék fagyasztásához szükséges berendezések beüzemelése.", "Újdonságként bevezetésre került hővisszanyerő rendszer, megújuló energiatermelés és biológiai szennyvízkezelés."], endDate: "2018.10.31." },
  ],
  en: [
    { slug: "vp3-4.2.1-4.2.2-2-21", title: "VP3-4.2.1-4.2.2-2-21", image: "/images/141mil.jpg", beneficiary: "Halasi Kebpro Food Processing and Trading Ltd.", call: "Complex development of food industry plants; VP3-4.2.1-4.2.2-2-21", project: "Complex development of Halasi Kebpro Ltd.; 3301640506", amount: "HUF 141,447,690", supportRate: "50%", summary: ["The project supported complex investments improving product added value, market access, technology and resource efficiency.", "Implementation strengthened competitiveness through modern and innovative technologies.", "Technical and professional progress developed according to plan.", "Purchased assets included cargo vehicles, an air exchange system, slicing robots, a forklift and a packaging machine."], endDate: "30.08.2023" },
    { slug: "vp-3-4.2.1-15", title: "VP-3-4.2.1-15", image: "/images/159mil.jpg", beneficiary: "Halasi Kebpro Food Processing and Trading Ltd.", call: "Improving value added and resource efficiency of agricultural products in processing; VP-3-4.2.1-15", project: "Value enhancement of agricultural products; construction of a meat roasting plant at Halasi Kebpro Ltd.; 1773089087", amount: "HUF 159,777,828", supportRate: "50%", summary: ["A new roasting plant was created to support higher added value products and market expansion.", "The investment included full technology and infrastructure, environmentally friendly solutions, renewable energy and new jobs.", "The related service road and the required cooling and freezing equipment were also completed.", "New technologies included heat recovery, renewable energy generation and biological wastewater treatment."], endDate: "31.10.2018" },
  ],
  de: [
    { slug: "vp3-4.2.1-4.2.2-2-21", title: "VP3-4.2.1-4.2.2-2-21", image: "/images/141mil.jpg", beneficiary: "Halasi Kebpro Lebensmittelverarbeitung und Handels GmbH", call: "Komplexe Entwicklung von lebensmittelverarbeitenden Betrieben; VP3-4.2.1-4.2.2-2-21", project: "Komplexe Entwicklung der Halasi Kebpro GmbH; 3301640506", amount: "141.447.690 HUF", supportRate: "50%", summary: ["Das Projekt unterstützte komplexe Investitionen zur Steigerung von Produktwert, Marktzugang, Technologie und Ressourceneffizienz.", "Die Umsetzung stärkte die Wettbewerbsfähigkeit durch moderne und innovative Technologien.", "Der technische und fachliche Fortschritt verlief planmäßig.", "Beschafft wurden unter anderem Transportfahrzeuge, Luftaustauschsystem, Schneidroboter, Stapler und Verpackungsmaschine."], endDate: "30.08.2023" },
    { slug: "vp-3-4.2.1-15", title: "VP-3-4.2.1-15", image: "/images/159mil.jpg", beneficiary: "Halasi Kebpro Lebensmittelverarbeitung und Handels GmbH", call: "Förderung der Wertsteigerung und Ressourceneffizienz landwirtschaftlicher Produkte in der Verarbeitung; VP-3-4.2.1-15", project: "Wertsteigerung landwirtschaftlicher Produkte; Bau eines Fleischbratbetriebs bei der Halasi Kebpro GmbH; 1773089087", amount: "159.777.828 HUF", supportRate: "50%", summary: ["Ein neuer Bratbetrieb wurde errichtet, um höherwertige Produkte und Markterweiterung zu unterstützen.", "Die Investition umfasste Technologie, Infrastruktur, umweltfreundliche Verfahren, erneuerbare Energie und neue Arbeitsplätze.", "Auch Betriebsweg sowie Kühl- und Gefriertechnik wurden realisiert.", "Zu den neuen Technologien zählen Wärmerückgewinnung, erneuerbare Energie und biologische Abwasserbehandlung."], endDate: "31.10.2018" },
  ],
};

copy.hu.home.logisticsBadges = ["Orsz\u00e1gos h\u0171t\u0151s kisz\u00e1ll\u00edt\u00e1s", "Heti \u00fatvonaltervez\u00e9s", "Rugalmas partnerkiszolg\u00e1l\u00e1s"];
copy.hu.home.logisticsStats = [
  { label: "Lefedetts\u00e9g", value: "Magyarorsz\u00e1g", text: "Orsz\u00e1gos partnerkiszolg\u00e1l\u00e1s saj\u00e1t h\u0171t\u0151s flott\u00e1val." },
  { label: "\u00dctemez\u00e9s", value: "Heti", text: "Heti \u00fctemezett \u00fatvonalak, kiemelt pontokon t\u00f6bbsz\u00f6ri fordul\u00f3val." },
  { label: "H\u0171t\u0151l\u00e1nc", value: "Ellen\u0151rz\u00f6tt", text: "\u00c1tad\u00e1sig k\u00f6vetett h\u0171t\u0151l\u00e1nc \u00e9s egyeztetett kisz\u00e1ll\u00edt\u00e1si ritmus." },
];

copy.de.home.logisticsBadges = ["Gek\u00fchlte Zustellung landesweit", "W\u00f6chentliche Routenplanung", "Flexible Partnerbetreuung"];
copy.de.home.logisticsStats = [
  { label: "Abdeckung", value: "Ungarn", text: "Landesweite Partnerbelieferung mit eigener K\u00fchlflotte." },
  { label: "Rhythmus", value: "W\u00f6chentlich", text: "Geplante Wochenrouten mit mehreren Stopps an priorisierten Punkten." },
  { label: "K\u00fchlkette", value: "Kontrolliert", text: "\u00dcberwachte K\u00fchlkette und abgestimmtes Lieferfenster bis zur \u00dcbergabe." },
];


productCatalog.hu = [
  { slug: "kebab-nyars", title: "Kebab nyárs termékek", cardLead: "Csirke és marha kebab nyársak HORECA partnereknek, 5-50 kg-os kiszerelésben.", items: [["Csirke kebab", "5, 10, 15 ... 50 kg", "kg"], ["Csirke kebab félbőrös", "5, 10, 15 ... 50 kg", "kg"], ["Marha kebab EU", "5, 10, 15 ... 50 kg", "kg"]] },
  { slug: "saslik", title: "Saslik termékek", cardLead: "Combfiléből és mellfiléből készülő saslik termékek stabil HORECA kiszerelésben.", items: [["Csirke saslik combfiléből", "5 kg/karton", "kg"], ["Csirke saslik combfiléből szalonnával", "5 kg/karton", "kg"], ["Csirke saslik combfiléből trikolor", "5 kg/karton", "kg"], ["Csirke saslik mellfiléből szalonnával", "Rendelhető 20 kg-tól", "kg"]] },
  { slug: "elosutott", title: "Elősütött termékek", cardLead: "Elősütött és gyorsfagyasztott kebab, marhahúsos kebab és pulled pork termékek.", items: [["E.h. sült csirke comb kebab", "1,5 kg/tasak, 9 kg/karton, 15 nap szavatossági idő", "kg"], ["Gy.f. sült csirke comb kebab", "1 kg/tasak, 10 kg/karton, új gépi csomagolás", "kg"], ["Gy.f. sült csirke comb kebab", "1,5 kg/tasak, 9 kg/karton", "kg"], ["Gy.f. sült marhahúsos kebab", "1 kg/tasak, 8 kg/karton", "kg"], ["Gy.f. pulled pork - tépett sertéshús", "1 kg/tasak, 8 kg/karton", "kg"]] },
  { slug: "kulonlegessegek", title: "Különlegességek", cardLead: "Speciális húskészítmények egyedi igényekhez és visszatérő partnerrendelésekhez.", items: [["Kakas taraj", "0,5 kg/tasak, 5 kg/karton", "kg"], ["Kakas here", "Érdeklődjön", ""]] },
  { slug: "joghurtok", title: "Joghurtok", cardLead: "Török és görög joghurtok, illetve ayran italjoghurt partneri kiszerelésben.", items: [["Haydi török joghurt", "10 kg", "db"], ["Paltsidis görög joghurt", "5 kg", "db"], ["Laban joghurt", "10 kg", "db"], ["Haydi ayran ivójoghurt", "20 db/tálca", "tálca"]] },
];
productCatalog.en = productCatalog.hu.map((category) => ({ ...category, title: category.title, cardLead: category.cardLead }));
productCatalog.de = productCatalog.hu.map((category) => ({ ...category, title: category.title, cardLead: category.cardLead }));

const productImages = {
  "kebab-nyars": "/images/products/kebab-nyars.png",
  saslik: "/images/products/saslik.jpeg",
  elosutott: "/images/products/sultkebab.jpeg",
  kulonlegessegek: "/images/products/kulonlegessegek.png",
  joghurtok: "/images/products/joghurtok.png",
  pitak: "/images/products/pitak.png",
  pitas: "/images/products/pitak.png",
  tortillak: "/images/products/tortillak.png",
  tortillas: "/images/products/tortillak.png",
  desszertek: "/images/products/desszertek.png",
  desserts: "/images/products/desszertek.png",
  "kiegeszitok-csomagolas": "/images/products/kiegeszitok-csomagolas.png",
  "extras-packaging": "/images/products/kiegeszitok-csomagolas.png",
  "extras-verpackung": "/images/products/kiegeszitok-csomagolas.png",
};

[productCatalog, retailCatalog].forEach((catalogSet) => {
  Object.values(catalogSet).forEach((catalog) => {
    catalog.forEach((category) => {
      category.image = productImages[category.slug] || category.image;
    });
  });
});

// Kebpro 2026 content overrides
copy.hu.nav.wholesale = "HORECA";
copy.en.nav.wholesale = "HORECA";
copy.de.nav.wholesale = "HORECA";
copy.hu.buttons.viewWholesale = "HORECA kínálat megtekintése";
copy.en.buttons.viewWholesale = "View HORECA range";
copy.de.buttons.viewWholesale = "HORECA-Sortiment ansehen";
copy.hu.home.title = "Gyros- és kebab hús gyártás Kiskunhalason, országos lefedettséggel.";
copy.en.home.title = "Gyros and kebab meat production in Kiskunhalas with nationwide coverage.";
copy.de.home.title = "Gyros- und Kebabfleischproduktion in Kiskunhalas mit landesweiter Abdeckung.";
copy.hu.services.title = "HORECA termékpaletta gyros, kebab és kapcsolódó termékekhez.";
copy.hu.services.introTitle = "HORECA";
copy.hu.services.introText = "A kategóriakártyák képes helyőrzőként működnek, így a következő körben egyszerűen a végleges termékfotókra cserélhetők.";
copy.hu.home.ctaTitle = "Legyen Ön is partnerünk HORECA kiszolgálásban.";
copy.en.services.title = "HORECA product range for gyros, kebab and related products.";
copy.en.services.introTitle = "HORECA";
copy.en.home.ctaTitle = "Become our partner in HORECA supply.";
copy.de.services.title = "HORECA-Produktsortiment für Gyros, Kebab und ergänzende Artikel.";
copy.de.services.introTitle = "HORECA";
copy.de.home.ctaTitle = "Werden Sie unser Partner in der HORECA-Belieferung.";
copy.hu.retail.soon = "Kiskereskedelmi terméklista";
copy.hu.retail.text = "A kiskereskedelmi kínálat pitákat, tortillákat, desszerteket, kiegészítőket és csomagolóanyagokat tartalmaz.";
copy.hu.retail.note = "A kiegészítő és csomagoló anyagok mellett egyéb termékeket is beszerzünk az Attase Kft. (török) és a Hellas-Invest Kft. (görög) termékei közül.";
copy.en.retail.note = "In addition to complementary and packaging materials, we can also source other products from Attase Kft. (Turkish) and Hellas-Invest Kft. (Greek) ranges.";
copy.de.retail.note = "Neben Ergänzungs- und Verpackungsmaterialien können wir weitere Produkte aus dem Sortiment der Attase Kft. (türkisch) und Hellas-Invest Kft. (griechisch) beschaffen.";
copy.hu.forms.headquarters = "Székhely";
copy.hu.forms.taxNumber = "Adószám";
copy.hu.forms.addProduct = "További termék hozzáadása";
copy.hu.forms.removeProduct = "Termék eltávolítása";
copy.hu.forms.selectProduct = "Válasszon terméket";
copy.hu.forms.productList = "Rendelt termékek";
copy.hu.forms.requiredHint = "A csillaggal jelölt mezők kitöltése kötelező.";
copy.hu.forms.quoteSuccessNote = "Az üzenetet rögzítettük, a csapat hamarosan jelentkezik.";
copy.hu.forms.orderSuccessNote = "A rendelés rögzítve, a visszaigazolással hamarosan keresünk.";
copy.en.forms.headquarters = "Registered office";
copy.en.forms.taxNumber = "Tax number";
copy.en.forms.addProduct = "Add another product";
copy.en.forms.removeProduct = "Remove product";
copy.en.forms.selectProduct = "Select product";
copy.en.forms.productList = "Ordered products";
copy.en.forms.requiredHint = "Fields marked with an asterisk are required.";
copy.en.forms.quoteSuccessNote = "Your message has been recorded, our team will contact you shortly.";
copy.en.forms.orderSuccessNote = "Your order has been recorded, we will contact you shortly with confirmation.";
copy.de.forms.headquarters = "Firmensitz";
copy.de.forms.taxNumber = "Steuernummer";
copy.de.forms.addProduct = "Weiteres Produkt hinzufügen";
copy.de.forms.removeProduct = "Produkt entfernen";
copy.de.forms.selectProduct = "Produkt auswählen";
copy.de.forms.productList = "Bestellte Produkte";
copy.de.forms.requiredHint = "Mit Stern markierte Felder sind Pflichtfelder.";
copy.de.forms.quoteSuccessNote = "Ihre Nachricht wurde erfasst, unser Team meldet sich in Kürze.";
copy.de.forms.orderSuccessNote = "Ihre Bestellung wurde erfasst, wir melden uns in Kürze mit der Bestätigung.";
copy.hu.quote.success = "Köszönjük, az ajánlatkérésed megérkezett! Kollégáink hamarosan felveszik veled a kapcsolatot.";
copy.hu.order.success = "Köszönjük, a megrendelésed megérkezett! Rövidesen visszaigazoljuk a részleteket.";
copy.en.quote.success = "Thank you, your quote request has arrived! Our team will contact you shortly.";
copy.en.order.success = "Thank you, your order has arrived! We will confirm the details shortly.";
copy.de.quote.success = "Vielen Dank, Ihre Anfrage ist eingegangen! Unser Team meldet sich in Kürze.";
copy.de.order.success = "Vielen Dank, Ihre Bestellung ist eingegangen! Wir bestätigen die Details in Kürze.";
copy.hu.career.formCv = "Önéletrajz feltöltése";
copy.en.career.formCv = "Upload CV";
copy.de.career.formCv = "Lebenslauf hochladen";

copy.hu.productsHub = {
  eyebrow: "Term\u00e9kek",
  title: "V\u00e1lasszon term\u00e9kk\u00f6rt",
  lead: "A HORECA \u00e9s kiskereskedelmi k\u00edn\u00e1lat k\u00fcl\u00f6n oldalon, \u00e1tl\u00e1that\u00f3 kateg\u00f3ri\u00e1kkal \u00e9rhet\u0151 el.",
  horecaTitle: "HORECA term\u00e9kek",
  horecaText: "Kebab ny\u00e1rsak, saslikok, el\u0151s\u00fct\u00f6tt term\u00e9kek, k\u00fcl\u00f6nlegess\u00e9gek \u00e9s joghurtok partnereknek.",
  retailTitle: "Kiskereskedelmi term\u00e9kek",
  retailText: "Pit\u00e1k, tortill\u00e1k, desszertek, kieg\u00e9sz\u00edt\u0151k \u00e9s csomagol\u00f3anyagok.",
  open: "K\u00edn\u00e1lat megnyit\u00e1sa",
};
copy.en.productsHub = {
  eyebrow: "Products",
  title: "Choose a product range",
  lead: "The HORECA and retail ranges are available on separate pages with clear categories.",
  horecaTitle: "HORECA products",
  horecaText: "Kebab skewers, shashlik, pre-cooked products, specialities and yoghurts for partners.",
  retailTitle: "Retail products",
  retailText: "Pitas, tortillas, desserts, extras and packaging materials.",
  open: "Open range",
};
copy.de.productsHub = {
  eyebrow: "Produkte",
  title: "Produktsortiment ausw\u00e4hlen",
  lead: "HORECA- und Einzelhandelssortimente sind auf separaten Seiten mit klaren Kategorien erreichbar.",
  horecaTitle: "HORECA-Produkte",
  horecaText: "Kebabspie\u00dfe, Schaschlik, vorgegarte Produkte, Spezialit\u00e4ten und Joghurts f\u00fcr Partner.",
  retailTitle: "Einzelhandelsprodukte",
  retailText: "Pitas, Tortillas, Desserts, Erg\u00e4nzungen und Verpackungsmaterialien.",
  open: "Sortiment \u00f6ffnen",
};

copy.hu.home.zipPlaceholder = "Ir\u00e1ny\u00edt\u00f3sz\u00e1m";
copy.hu.home.zipResult = "Ehhez a z\u00f3n\u00e1hoz tartozik";
copy.hu.home.zipNotFound = "Adjon meg egy 4 jegy\u0171 ir\u00e1ny\u00edt\u00f3sz\u00e1mot";
copy.hu.home.faqTitle = "Gyakori k\u00e9rd\u00e9sek";
copy.hu.home.faqShowMore = "Tov\u00e1bbi k\u00e9rd\u00e9sek";
copy.hu.home.faqShowLess = "Kevesebb k\u00e9rd\u00e9s";
copy.hu.home.faqItems = [
  { q: "Hova sz\u00e1ll\u00edtanak?", a: "Saj\u00e1t h\u0171t\u0151s j\u00e1rm\u0171veinkkel Magyarorsz\u00e1g teljes ter\u00fclet\u00e9n kiszolg\u00e1ljuk partnereinket." },
  { q: "Hogyan lehet aj\u00e1nlatot k\u00e9rni?", a: "Az Aj\u00e1nlatk\u00e9r\u00e9s oldalon kiv\u00e1laszthatja az \u00e9rdekl\u0151d\u00e9s term\u00e9keit, koll\u00e9g\u00e1ink pedig felveszik \u00d6nnel a kapcsolatot." },
  { q: "Milyen term\u00e9kek rendelhet\u0151k?", a: "HORECA partnereinknek kebab ny\u00e1rsakat, saslikokat, el\u0151s\u00fct\u00f6tt term\u00e9keket, joghurtokat \u00e9s kieg\u00e9sz\u00edt\u0151ket k\u00edn\u00e1lunk." },
  { q: "Hogyan biztos\u00edtj\u00e1k a term\u00e9kek frissess\u00e9g\u00e9t?", a: "Az elk\u00e9sz\u00fclt term\u00e9keket sokkol\u00e1sos elj\u00e1r\u00e1ssal fagyasztjuk, majd kontroll\u00e1lt h\u0171t\u0151kamr\u00e1kban t\u00e1roljuk a kisz\u00e1ll\u00edt\u00e1sig." },
  { q: "Visszak\u00f6vethet\u0151k a gy\u00e1rt\u00e1si t\u00e9telek?", a: "Igen, nyomon k\u00f6vet\u00e9si rendszer\u00fcnk az alapanyag-besz\u00e1ll\u00edt\u00f3t\u00f3l a vev\u0151ig r\u00f6gz\u00edti a kapcsolatokat." },
];

copy.hu.career.galleryEyebrow = "Munkakörnyezet";
copy.hu.career.galleryTitle = "Valódi üzemi háttér, stabil csapat";
copy.hu.career.galleryText = "A napi munka tiszta, ellenőrzött élelmiszeripari környezetben zajlik, ahol a folyamatok és a csapatmunka egyaránt fontosak.";
copy.en.career.galleryEyebrow = "Work environment";
copy.en.career.galleryTitle = "Real production background, stable team";
copy.en.career.galleryText = "Daily work takes place in a clean, controlled food-industry environment where process discipline and teamwork both matter.";
copy.de.career.galleryEyebrow = "Arbeitsumfeld";
copy.de.career.galleryTitle = "Echter Produktionshintergrund, stabiles Team";
copy.de.career.galleryText = "Die tägliche Arbeit erfolgt in einer sauberen, kontrollierten Lebensmittelumgebung, in der Prozesse und Teamarbeit gleichermaßen wichtig sind.";

copy.hu.quality.photoAlt = "Minőségellenőrzött kebab gyártási folyamat";
copy.en.quality.photoAlt = "Quality-controlled kebab production process";
copy.de.quality.photoAlt = "Qualitätskontrollierter Kebab-Produktionsprozess";
copy.hu.about.photoAlt = "Halasi Kebpro üzem bemutatkozó kép";
copy.en.about.photoAlt = "Halasi Kebpro facility introduction image";
copy.de.about.photoAlt = "Halasi Kebpro Betriebsbild";

copy.en.home.zipPlaceholder = "Postal code";
copy.en.home.zipResult = "Belongs to this zone";
copy.en.home.zipNotFound = "Enter a 4-digit postal code";
copy.en.home.faqTitle = "FAQ";
copy.en.home.faqShowMore = "More questions";
copy.en.home.faqShowLess = "Fewer questions";
copy.en.home.faqItems = [
  { q: "Where do you deliver?", a: "Our own refrigerated vehicles serve partners across Hungary." },
  { q: "How can I request a quote?", a: "Use the Request Quote page to select products of interest, and our team will contact you." },
  { q: "Which products are available?", a: "We supply kebab skewers, shashlik, pre-cooked products, yoghurts and complementary products for HORECA partners." },
  { q: "How do you keep products fresh?", a: "Finished products are shock-frozen and then stored in controlled cold rooms until delivery." },
  { q: "Are production batches traceable?", a: "Yes, our traceability system records supplier-to-customer links for each product flow." },
];

copy.de.home.zipPlaceholder = "Postleitzahl";
copy.de.home.zipResult = "Geh\u00f6rt zu dieser Zone";
copy.de.home.zipNotFound = "Geben Sie eine 4-stellige Postleitzahl ein";
copy.de.home.faqTitle = "H\u00e4ufige Fragen";
copy.de.home.faqShowMore = "Weitere Fragen";
copy.de.home.faqShowLess = "Weniger Fragen";
copy.de.home.faqItems = [
  { q: "Wohin liefern Sie?", a: "Mit unserer eigenen K\u00fchlflotte beliefern wir Partner in ganz Ungarn." },
  { q: "Wie kann ich ein Angebot anfordern?", a: "Auf der Angebotsseite k\u00f6nnen Sie Produkte ausw\u00e4hlen, danach kontaktiert Sie unser Team." },
  { q: "Welche Produkte sind verf\u00fcgbar?", a: "Wir liefern Kebabspie\u00dfe, Schaschlik, vorgegarte Produkte, Joghurts und Erg\u00e4nzungsprodukte f\u00fcr HORECA-Partner." },
  { q: "Wie bleibt die Frische der Produkte erhalten?", a: "Fertige Produkte werden schockgefrostet und bis zur Lieferung in kontrollierten K\u00fchlr\u00e4umen gelagert." },
  { q: "Sind Produktionschargen r\u00fcckverfolgbar?", a: "Ja, unser R\u00fcckverfolgungssystem dokumentiert die Verbindung vom Rohstofflieferanten bis zum Kunden." },
];

copy.hu.home.faqItems.push(
  { q: "Mi a minim\u00e1lisan rendelhet\u0151 mennyis\u00e9g?", a: "Ahhoz, hogy a term\u00e9keket kisz\u00e1ll\u00edtsuk, legal\u00e1bb 20 kg / k\u00e9t karton h\u00fast kell rendelni." },
  { q: "Mag\u00e1nszem\u00e9lyeket is kiszolg\u00e1lnak?", a: "Sajnos egyel\u0151re nem, k\u00e9rj\u00fck, \u00e9rdekl\u0151dj\u00f6n nagyker partnereinkn\u00e9l!" },
  { q: "Csak eg\u00e9sz kartonnal lehet rendelni?", a: "Igen, a legt\u00f6bb term\u00e9k\u00fcnkb\u0151l csak eg\u00e9sz kartonnal lehet rendelni: s\u00fclt h\u00fasok, t\u00e9pett h\u00fas, pita, saslik, stb." }
);
copy.en.home.faqItems.push(
  { q: "What is the minimum order quantity?", a: "For delivery, at least 20 kg / two cartons of meat must be ordered." },
  { q: "Do you serve private individuals?", a: "Unfortunately not at the moment. Please contact our wholesale partners." },
  { q: "Can products be ordered only by full carton?", a: "Yes, most products are available by full carton only, including roasted meats, pulled meat, pita and shashlik." }
);
copy.de.home.faqItems.push(
  { q: "Was ist die Mindestbestellmenge?", a: "F\u00fcr die Lieferung m\u00fcssen mindestens 20 kg / zwei Kartons Fleisch bestellt werden." },
  { q: "Beliefern Sie auch Privatpersonen?", a: "Derzeit leider nicht. Bitte wenden Sie sich an unsere Gro\u00dfhandelspartner." },
  { q: "Kann man nur ganze Kartons bestellen?", a: "Ja, die meisten Produkte sind nur kartonweise erh\u00e4ltlich, darunter gebratenes Fleisch, Pulled Meat, Pita und Schaschlik." }
);

logisticsRegions.hu = [
  { key: "northHungary", title: "\u00c9szak-Magyarorsz\u00e1g", schedule: "Cs\u00fct\u00f6rt\u00f6k", text: "El\u0151re tervezhet\u0151, h\u0171t\u00f6tt kisz\u00e1ll\u00edt\u00e1st biztos\u00edtunk az \u00e9szaki partnereknek, stabil heti ritmusban." },
  { key: "northAlfold", title: "\u00c9szak-Alf\u00f6ld", schedule: "P\u00e9ntek", text: "Nagykereskedelmi partnereinket kisz\u00e1m\u00edthat\u00f3 fordul\u00f3kkal \u00e9s folyamatos h\u0171t\u0151l\u00e1nccal szolg\u00e1ljuk ki." },
  { key: "southAlfold", title: "D\u00e9l-Alf\u00f6ld", schedule: "H\u00e9tf\u0151", text: "Kiskunhalashoz k\u00f6zeli z\u00f3nak\u00e9nt gyors egyeztet\u00e9ssel \u00e9s rugalmas partnerkiszolg\u00e1l\u00e1ssal m\u0171k\u00f6dik." },
  { key: "centralWestDunantul", title: "K\u00f6z\u00e9p-Nyugat-Dun\u00e1nt\u00fal", schedule: "Szerda", text: "A dun\u00e1nt\u00fali \u00fatvonal a k\u00f6z\u00e9ps\u0151 \u00e9s nyugati partnerek kiszolg\u00e1l\u00e1s\u00e1t fogja \u00f6ssze egy tervezett fordul\u00f3ban." },
  { key: "southDunantul", title: "D\u00e9l-Dun\u00e1nt\u00fal", schedule: "Szerda", text: "A d\u00e9li dun\u00e1nt\u00fali partnerek heti ritmusban, kisz\u00e1m\u00edthat\u00f3an rendelhetnek \u00e9s fogadhatj\u00e1k az \u00e1rut." },
  { key: "centralHungary", title: "K\u00f6z\u00e9p-Magyarorsz\u00e1g", schedule: "Kedd, p\u00e9ntek", text: "S\u0171r\u0171 partnerh\u00e1l\u00f3val \u00e9s kiemelt HORECA f\u00f3kusszal m\u0171k\u00f6d\u0151 z\u00f3na, t\u00f6bb heti kisz\u00e1ll\u00edt\u00e1si ablakkal." },
  { key: "balaton", title: "Balaton t\u00e9rs\u00e9ge", schedule: "H\u00e9tf\u0151, cs\u00fct\u00f6rt\u00f6k", text: "Szezonban is kiemelten kezelt, gyors partnerkiszolg\u00e1l\u00e1st biztos\u00edt\u00f3 Balaton k\u00f6rny\u00e9ki \u00fatvonal." },
];
logisticsRegions.en = [
  { key: "northHungary", title: "Northern Hungary", schedule: "Thursday", text: "Predictable refrigerated service for partners in the northern region with a stable weekly rhythm." },
  { key: "northAlfold", title: "Northern Great Plain", schedule: "Friday", text: "Scheduled deliveries with a stable cold chain and routes adapted to wholesale partners." },
  { key: "southAlfold", title: "Southern Great Plain", schedule: "Monday", text: "Service from the Kiskunhalas area with quick coordination and flexible partner handling." },
  { key: "centralWestDunantul", title: "Central-West Transdanubia", schedule: "Wednesday", text: "A planned Transdanubian route connecting central and western partners in one delivery cycle." },
  { key: "southDunantul", title: "Southern Transdanubia", schedule: "Wednesday", text: "Weekly refrigerated service for southern Transdanubian partners in a predictable rhythm." },
  { key: "centralHungary", title: "Central Hungary", schedule: "Tuesday, Friday", text: "Dense partner network and strong HORECA focus with multiple delivery windows each week." },
  { key: "balaton", title: "Lake Balaton area", schedule: "Monday, Thursday", text: "Priority route around Lake Balaton with fast partner coverage, especially useful in season." },
];
logisticsRegions.de = [
  { key: "northHungary", title: "Nordungarn", schedule: "Donnerstag", text: "Planbare gek\u00fchlte Versorgung der n\u00f6rdlichen Partner in einem stabilen Wochenrhythmus." },
  { key: "northAlfold", title: "N\u00f6rdliche Tiefebene", schedule: "Freitag", text: "Geplante Auslieferung mit stabiler K\u00fchlkette und auf Gro\u00dfhandelspartner abgestimmten Touren." },
  { key: "southAlfold", title: "S\u00fcdliche Tiefebene", schedule: "Montag", text: "Zone in der N\u00e4he von Kiskunhalas mit schneller Abstimmung und flexibler Partnerbetreuung." },
  { key: "centralWestDunantul", title: "Mittel-West-Transdanubien", schedule: "Mittwoch", text: "Geplante Transdanubien-Route f\u00fcr zentrale und westliche Partner in einem festen Lieferrhythmus." },
  { key: "southDunantul", title: "S\u00fcd-Transdanubien", schedule: "Mittwoch", text: "W\u00f6chentliche und gut planbare Belieferung der s\u00fcdtransdanubischen Partner." },
  { key: "centralHungary", title: "Mittelungarn", schedule: "Dienstag, Freitag", text: "Dichtes Partnernetz und starker HORECA-Fokus mit mehreren Lieferfenstern pro Woche." },
  { key: "balaton", title: "Balaton-Region", schedule: "Montag, Donnerstag", text: "Priorit\u00e4tsroute rund um den Balaton mit schneller Partnerbelieferung, besonders in der Saison." },
];

function getLang(value) { return supportedLanguages.includes(value) ? value : defaultLanguage; }
function getTranslations(lang) { return copy[getLang(lang)]; }
function getWholesaleCatalog(lang) { return productCatalog[getLang(lang)]; }
function getRetailCatalog(lang) { return retailCatalog[getLang(lang)]; }
function getOrderProductOptions(lang) {
  const currentLang = getLang(lang);
  return [...productCatalog[currentLang], ...retailCatalog[currentLang]].flatMap((category) =>
    category.items.map((item) => ({ value: item[0], label: `${category.title} - ${item[0]}` }))
  );
}
function getGrantItems(lang) { return grantItems[getLang(lang)]; }
const logisticsPanelPositions = {
  northHungary: "panel-bottom-left",
  northAlfold: "panel-bottom-left",
  southAlfold: "panel-top-right",
  centralWestDunantul: "panel-bottom-right",
  southDunantul: "panel-top-right",
  centralHungary: "panel-bottom-left",
  balaton: "panel-bottom-right",
};

const logisticsRegionExtras = {
  hu: [],
  en: [],
  de: [],
};

function getLogisticsRegions(lang) {
  const currentLang = getLang(lang);
  const base = logisticsRegions[currentLang] || [];
  const extra = logisticsRegionExtras[currentLang] || [];
  return [...base, ...extra].map((region) => ({
    ...region,
    panelPosition: logisticsPanelPositions[region.key] || "panel-bottom-right",
  }));
}
function buildLangUrl(pathname, lang, extraQuery = {}) {
  const params = new URLSearchParams();
  const currentLang = getLang(lang);
  if (currentLang !== defaultLanguage) params.set("lang", currentLang);
  Object.entries(extraQuery).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, value);
  });
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

module.exports = { supportedLanguages, defaultLanguage, getLang, getTranslations, getWholesaleCatalog, getRetailCatalog, getOrderProductOptions, getGrantItems, getLogisticsRegions, buildLangUrl };


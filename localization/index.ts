export interface Translations {
  // StartScreen
  startScreen: {
    loading: string;
    placeholder: string;
    startButton: string;
    selectCustomer: string;
    noCustomers: string;
    importCustomersHint: string;
    newDataAvailableReload: string;
    searchCustomers: string;
    noCustomersFound: string;
    ungroupedCustomers: string;
    customerGroupLabel: string;
  };
  // SelectionScreen
  selectionScreen: {
    orderFor: string;
    sendOrder: string;
    successTitle: string;
    successMessage: string;
    okButton: string;
    cardViewTitle: string;
    polica: string;
    clearOrderTitle: string;
    clearOrderMessage: string;
    keepItems: string;
    clearItems: string;
  };
  // StandScreen
  standScreen: {
    title: string;
    quantity: string;
    confirmBack: string;
    confirmBackMessage: string;
    noItems: string;
    noItemsMessage: string;
  };
  // ShelfScreen
  shelfScreen: {
    title: string;
    searchPlaceholder: string;
    resultsCountSingular: string;
    resultsCountPlural: string;
    totalArticlesSingular: string;
    totalArticlesPlural: string;
    noResults: string;
    noResultsMessage: string;
    noItems: string;
    noItemsMessage: string;
    quantity: string;
  };
  // OrderSummaryScreen
  orderSummaryScreen: {
    title: string;
    orderDetails: string;
    items: string;
    noItemsSelected: string;
    goBackAndAdd: string;
    editOrder: string;
    generateExcel: string;
    sendByEmail: string;
    share: string;
    generating: string;
    success: string;
    excelShared: string;
    emailReady: string;
    emailCancelled: string;
    error: string;
    customerRequired: string;
    noItemsInOrder: string;
    failedToSend: string;
    sharingUnavailable: string;
    mailUnavailable: string;
    notAvailable: string;
  };
  // SettingsModal
  settings: {
    title: string;
    email: string;
    emailPlaceholder: string;
    importData: string;
    exportExamples: string;
    language: string;
    darkMode: string;
    close: string;
    success: string;
    settingsSaved: string;
    importDataTitle: string;
    importDataMessage: string;
    cancel: string;
    selectFile: string;
    error: string;
    failedToImport: string;
    generateExampleTitle: string;
    generateExampleMessage: string;
    generate: string;
    templateGenerated: string;
    templateCreatedMessage: string;
    shareTemplate: string;
    done: string;
    failedToShare: string;
    failedToGenerate: string;
    invalidExcelFile: string;
    noItemsImported: string;
    createdStandsCount: string;
    importedStandItemsCount: string;
    importedShelfItemsCount: string;
    importedCustomersCount: string;
    preparingImport: string;
    readingRowsFromSheet: string;
    resolvingWorkbookSheets: string;
    extractingStandImages: string;
    extractingShelfImages: string;
    skippingImageExtraction: string;
    startingDatabaseTransaction: string;
    clearingExistingData: string;
    importingStandItems: string;
    importingShelfItems: string;
    importingCustomers: string;
    finalizingImport: string;
    importingStandItemRow: string;
    importingShelfItemRow: string;
    importingCustomerRow: string;
  };
  // Export
  export: {
    orderPrefix: string;
    shelfSheetName: string;
    customerLabel: string;
    dateLabel: string;
    timeLabel: string;
    articleLabel: string;
    quantityLabel: string;
    shareOrderExcelDialogTitle: string;
  };
  // Item Modal
  itemModal: {
    color: string;
    itemCode: string;
    currentQuantity: string;
    itemId: string;
  };
}

export const translations: Record<string, Translations> = {
  en: {
    startScreen: {
      loading: 'Loading...',
      placeholder: 'Enter text here...',
      startButton: 'Start',
      selectCustomer: 'Select Customer',
      noCustomers: 'No customers available',
      importCustomersHint: 'Import customers from Excel to get started',
      newDataAvailableReload: 'New data is available. Tap to reload data.',
      searchCustomers: 'Search customers...',
      noCustomersFound: 'No customers found',
      ungroupedCustomers: 'Ungrouped',
      customerGroupLabel: 'Group',
    },
    selectionScreen: {
      orderFor: 'Order for:',
      sendOrder: 'Send Order',
      successTitle: 'Success!',
      successMessage: 'Your order has been sent successfully.',
      okButton: 'OK',
      cardViewTitle: 'Card View',
      polica: 'Shelf',
      clearOrderTitle: 'Clear Order?',
      clearOrderMessage: 'Do you want to clear all selected items?',
      keepItems: 'Keep Items',
      clearItems: 'Clear Items',
    },
    standScreen: {
      title: 'Stand',
      quantity: 'Qty',
      confirmBack: 'Go Back?',
      confirmBackMessage: 'Your selections will be saved.',
      noItems: 'No Items',
      noItemsMessage: 'This stand has no items yet. Import data from Excel to get started.',
    },
    shelfScreen: {
      title: 'Shelf',
      searchPlaceholder: 'Search articles...',
      resultsCountSingular: '{count} result',
      resultsCountPlural: '{count} results',
      totalArticlesSingular: '{count} total article',
      totalArticlesPlural: '{count} total articles',
      noResults: 'No articles found',
      noResultsMessage: 'Try adjusting your search terms',
      noItems: 'No Items',
      noItemsMessage: 'The shelf has no items yet. Import data from Excel to get started.',
      quantity: 'Qty',
    },
    orderSummaryScreen: {
      title: 'Order Summary',
      orderDetails: 'Order Details',
      items: 'items',
      noItemsSelected: 'No items selected',
      goBackAndAdd: 'Go back and add items to your order',
      editOrder: 'Edit Order',
      generateExcel: 'Generate Excel',
      sendByEmail: 'Send by Email',
      share: 'Share',
      generating: 'Generating...',
      success: 'Success',
      excelShared: 'Excel file has been shared',
      emailReady: 'Email composer opened',
      emailCancelled: 'Email sending cancelled',
      error: 'Error',
      customerRequired: 'Customer name is required',
      noItemsInOrder: 'No items in order',
      failedToSend: 'Failed to send order. Please try again.',
      sharingUnavailable: 'Sharing is not available on this device',
      mailUnavailable: 'Mail composer is not available on this device',
      notAvailable: 'N/A',
    },
    settings: {
      title: 'Settings',
      email: 'Email',
      emailPlaceholder: 'Enter email address',
      importData: 'Import Data',
      exportExamples: 'Generate Example Files',
      language: 'Language',
      darkMode: 'Dark Mode',
      close: 'Close',
      success: 'Success',
      settingsSaved: 'Settings saved successfully',
      importDataTitle: 'Import Data',
      importDataMessage:
        'Select an Excel (.xlsx) or CSV file to import. The file should contain stands, stand items, or shelf items.',
      cancel: 'Cancel',
      selectFile: 'Select File',
      error: 'Error',
      failedToImport: 'Failed to import data',
      generateExampleTitle: 'Generate Example Files',
      generateExampleMessage:
        'This will create 3 Excel template files with sample data that you can use as a reference for importing your own data.',
      generate: 'Generate',
      templateGenerated: 'Template Generated!',
      templateCreatedMessage:
        'The Excel template with three sheets (Stand Items, Shelf Items & Customers) has been created. Would you like to share/save it now?',
      shareTemplate: 'Share Template',
      done: 'Done',
      failedToShare: 'Failed to share file',
      failedToGenerate: 'Failed to generate example files',
      invalidExcelFile: 'Please select an Excel file (.xlsx).',
      noItemsImported: 'No items imported',
      createdStandsCount: 'Created {count} stands',
      importedStandItemsCount: 'Imported {count} stand items',
      importedShelfItemsCount: 'Imported {count} shelf items',
      importedCustomersCount: 'Imported {count} customers',
      preparingImport: 'Preparing import...',
      readingRowsFromSheet: 'Reading rows from sheet...',
      resolvingWorkbookSheets: 'Resolving workbook sheets by name...',
      extractingStandImages: 'Extracting anchored images (Stand Items)...',
      extractingShelfImages: 'Extracting anchored images (Shelf Items)...',
      skippingImageExtraction: 'Skipping image extraction for faster import...',
      startingDatabaseTransaction: 'Starting database transaction...',
      clearingExistingData: 'Clearing existing data...',
      importingStandItems: 'Importing stand items...',
      importingShelfItems: 'Importing shelf items...',
      importingCustomers: 'Importing customers...',
      finalizingImport: 'Finalizing import...',
      importingStandItemRow: 'Importing stand item row {row}',
      importingShelfItemRow: 'Importing shelf item row {row}',
      importingCustomerRow: 'Importing customer row {row}',
    },
    export: {
      orderPrefix: 'order',
      shelfSheetName: 'Shelf',
      customerLabel: 'Customer:',
      dateLabel: 'Date:',
      timeLabel: 'Time:',
      articleLabel: 'Article',
      quantityLabel: 'Quantity',
      shareOrderExcelDialogTitle: 'Share Order Excel File',
    },
    itemModal: {
      color: 'Color',
      itemCode: 'Item Code',
      currentQuantity: 'Current Quantity',
      itemId: 'Item ID',
    },
  },
  sr: {
    startScreen: {
      loading: 'Učitavanje...',
      placeholder: 'Unesite tekst ovde...',
      startButton: 'Počni',
      selectCustomer: 'Izaberite Kupca',
      noCustomers: 'Nema dostupnih kupaca',
      importCustomersHint: 'Uvezite kupce iz Excel-a da biste počeli',
      newDataAvailableReload: 'Novi podaci su dostupni. Dodirnite za ponovno učitavanje.',
      searchCustomers: 'Pretraži kupce...',
      noCustomersFound: 'Kupci nisu pronađeni',
      ungroupedCustomers: 'Bez grupe',
      customerGroupLabel: 'Grupa',
    },
    selectionScreen: {
      orderFor: 'Narudžbina za:',
      sendOrder: 'Pošalji Narudžbinu',
      successTitle: 'Uspešno!',
      successMessage: 'Vaša narudžbina je uspešno poslata.',
      okButton: 'U redu',
      cardViewTitle: 'Pregled Kartica',
      polica: 'Polica',
      clearOrderTitle: 'Obrisati porudžbinu?',
      clearOrderMessage: 'Da li želite da obrišete sve izabrane artikle?',
      keepItems: 'Zadrži artikle',
      clearItems: 'Obriši artikle',
    },
    standScreen: {
      title: 'Štand',
      quantity: 'Kol',
      confirmBack: 'Vratiti se?',
      confirmBackMessage: 'Vaš izbor će biti sačuvan.',
      noItems: 'Nema Stavki',
      noItemsMessage: 'Ovaj štand još nema stavki. Uvezite podatke iz Excel-a da biste počeli.',
    },
    shelfScreen: {
      title: 'Polica',
      searchPlaceholder: 'Pretraži artikle...',
      resultsCountSingular: '{count} rezultat',
      resultsCountPlural: '{count} rezultata',
      totalArticlesSingular: 'Ukupno {count} artikal',
      totalArticlesPlural: 'Ukupno {count} artikala',
      noResults: 'Nisu pronađeni artikli',
      noResultsMessage: 'Pokušajte promeniti termine pretrage',
      noItems: 'Nema Stavki',
      noItemsMessage: 'Polica još nema stavki. Uvezite podatke iz Excel-a da biste počeli.',
      quantity: 'Kol',
    },
    orderSummaryScreen: {
      title: 'Pregled Narudžbine',
      orderDetails: 'Detalji Narudžbine',
      items: 'stavki',
      noItemsSelected: 'Nema izabranih stavki',
      goBackAndAdd: 'Vratite se i dodajte stavke u narudžbinu',
      editOrder: 'Izmeni Narudžbinu',
      generateExcel: 'Generiši Excel',
      sendByEmail: 'Pošalji Emailom',
      share: 'Podeli',
      generating: 'Generisanje...',
      success: 'Uspešno',
      excelShared: 'Excel fajl je podeljen',
      emailReady: 'Email forma je otvorena',
      emailCancelled: 'Slanje emaila je otkazano',
      error: 'Greška',
      customerRequired: 'Ime kupca je obavezno',
      noItemsInOrder: 'Nema stavki u narudžbini',
      failedToSend: 'Slanje narudžbine nije uspelo. Pokušajte ponovo.',
      sharingUnavailable: 'Deljenje nije dostupno na ovom uređaju',
      mailUnavailable: 'Email forma nije dostupna na ovom uređaju',
      notAvailable: 'N/A',
    },
    settings: {
      title: 'Podešavanja',
      email: 'Email',
      emailPlaceholder: 'Unesite email adresu',
      importData: 'Uvezi Podatke',
      exportExamples: 'Generiši Primere Fajlova',
      language: 'Jezik',
      darkMode: 'Tamni režim',
      close: 'Zatvori',
      success: 'Uspešno',
      settingsSaved: 'Podešavanja su uspešno sačuvana',
      importDataTitle: 'Uvezi Podatke',
      importDataMessage:
        'Izaberite Excel (.xlsx) ili CSV fajl za uvoz. Fajl treba da sadrži štandove, stavke štanda ili stavke police.',
      cancel: 'Otkaži',
      selectFile: 'Izaberi Fajl',
      error: 'Greška',
      failedToImport: 'Uvoz podataka nije uspeo',
      generateExampleTitle: 'Generiši Primere Fajlova',
      generateExampleMessage:
        'Ovo će kreirati 3 Excel šablona sa primerima podataka koje možete koristiti kao referencu za uvoz vaših podataka.',
      generate: 'Generiši',
      templateGenerated: 'Šablon Generisan!',
      templateCreatedMessage:
        'Excel šablon sa tri lista (Stavke Štanda, Stavke Police i Kupci) je kreiran. Želite li da ga podelite/sačuvate sada?',
      shareTemplate: 'Podeli Šablon',
      done: 'Gotovo',
      failedToShare: 'Deljenje fajla nije uspelo',
      failedToGenerate: 'Generisanje primera fajlova nije uspelo',
      invalidExcelFile: 'Izaberite Excel fajl (.xlsx).',
      noItemsImported: 'Nijedna stavka nije uvezena',
      createdStandsCount: 'Kreirano štandova: {count}',
      importedStandItemsCount: 'Uvezeno stavki štanda: {count}',
      importedShelfItemsCount: 'Uvezeno stavki police: {count}',
      importedCustomersCount: 'Uvezeno kupaca: {count}',
      preparingImport: 'Priprema uvoza...',
      readingRowsFromSheet: 'Čitanje redova iz lista...',
      resolvingWorkbookSheets: 'Pronalaženje listova po nazivu...',
      extractingStandImages: 'Izdvajanje usidrenih slika (Stavke Štanda)...',
      extractingShelfImages: 'Izdvajanje usidrenih slika (Stavke Police)...',
      skippingImageExtraction: 'Preskakanje izdvajanja slika radi bržeg uvoza...',
      startingDatabaseTransaction: 'Pokretanje transakcije baze...',
      clearingExistingData: 'Brisanje postojećih podataka...',
      importingStandItems: 'Uvoz stavki štanda...',
      importingShelfItems: 'Uvoz stavki police...',
      importingCustomers: 'Uvoz kupaca...',
      finalizingImport: 'Završavanje uvoza...',
      importingStandItemRow: 'Uvoz reda stavke štanda {row}',
      importingShelfItemRow: 'Uvoz reda stavke police {row}',
      importingCustomerRow: 'Uvoz reda kupca {row}',
    },
    export: {
      orderPrefix: 'narudzbina',
      shelfSheetName: 'Polica',
      customerLabel: 'Kupac:',
      dateLabel: 'Datum:',
      timeLabel: 'Vreme:',
      articleLabel: 'Artikal',
      quantityLabel: 'Količina',
      shareOrderExcelDialogTitle: 'Podeli Excel narudžbine',
    },
    itemModal: {
      color: 'Boja',
      itemCode: 'Šifra Artikla',
      currentQuantity: 'Trenutna Količina',
      itemId: 'ID Artikla',
    },
  },
  es: {
    startScreen: {
      loading: 'Cargando...',
      placeholder: 'Ingrese texto aquí...',
      startButton: 'Comenzar',
      selectCustomer: 'Seleccionar Cliente',
      noCustomers: 'No hay clientes disponibles',
      importCustomersHint: 'Importe clientes desde Excel para comenzar',
      newDataAvailableReload: 'Hay datos nuevos disponibles. Toque para recargar datos.',
      searchCustomers: 'Buscar clientes...',
      noCustomersFound: 'No se encontraron clientes',
      ungroupedCustomers: 'Sin grupo',
      customerGroupLabel: 'Grupo',
    },
    selectionScreen: {
      orderFor: 'Pedido para:',
      sendOrder: 'Enviar Pedido',
      successTitle: '¡Éxito!',
      successMessage: 'Su pedido ha sido enviado exitosamente.',
      okButton: 'OK',
      cardViewTitle: 'Vista de Tarjetas',
      polica: 'Estante',
      clearOrderTitle: '¿Borrar Pedido?',
      clearOrderMessage: '¿Desea borrar todos los artículos seleccionados?',
      keepItems: 'Mantener Artículos',
      clearItems: 'Borrar Artículos',
    },
    standScreen: {
      title: 'Stand',
      quantity: 'Cant',
      confirmBack: '¿Volver?',
      confirmBackMessage: 'Sus selecciones serán guardadas.',
      noItems: 'Sin Artículos',
      noItemsMessage: 'Este stand aún no tiene artículos. Importe datos desde Excel para comenzar.',
    },
    shelfScreen: {
      title: 'Estante',
      searchPlaceholder: 'Buscar artículos...',
      resultsCountSingular: '{count} resultado',
      resultsCountPlural: '{count} resultados',
      totalArticlesSingular: '{count} artículo total',
      totalArticlesPlural: '{count} artículos totales',
      noResults: 'No se encontraron artículos',
      noResultsMessage: 'Intente ajustar sus términos de búsqueda',
      noItems: 'Sin Artículos',
      noItemsMessage: 'El estante aún no tiene artículos. Importe datos desde Excel para comenzar.',
      quantity: 'Cant',
    },
    orderSummaryScreen: {
      title: 'Resumen del Pedido',
      orderDetails: 'Detalles del Pedido',
      items: 'artículos',
      noItemsSelected: 'No hay artículos seleccionados',
      goBackAndAdd: 'Vuelva atrás y agregue artículos a su pedido',
      editOrder: 'Editar Pedido',
      generateExcel: 'Generar Excel',
      sendByEmail: 'Enviar por Correo',
      share: 'Compartir',
      generating: 'Generando...',
      success: 'Éxito',
      excelShared: 'El archivo Excel ha sido compartido',
      emailReady: 'Se abrió el correo',
      emailCancelled: 'El envío de correo fue cancelado',
      error: 'Error',
      customerRequired: 'El nombre del cliente es requerido',
      noItemsInOrder: 'No hay artículos en el pedido',
      failedToSend: 'Error al enviar el pedido. Por favor, inténtelo de nuevo.',
      sharingUnavailable: 'Compartir no está disponible en este dispositivo',
      mailUnavailable: 'El editor de correo no está disponible en este dispositivo',
      notAvailable: 'N/A',
    },
    settings: {
      title: 'Configuración',
      email: 'Correo Electrónico',
      emailPlaceholder: 'Ingrese dirección de correo',
      importData: 'Importar Datos',
      exportExamples: 'Generar Archivos de Ejemplo',
      language: 'Idioma',
      darkMode: 'Modo oscuro',
      close: 'Cerrar',
      success: 'Éxito',
      settingsSaved: 'Configuración guardada exitosamente',
      importDataTitle: 'Importar Datos',
      importDataMessage:
        'Seleccione un archivo Excel (.xlsx) o CSV para importar. El archivo debe contener stands, artículos de stand o artículos de estante.',
      cancel: 'Cancelar',
      selectFile: 'Seleccionar Archivo',
      error: 'Error',
      failedToImport: 'Error al importar datos',
      generateExampleTitle: 'Generar Archivos de Ejemplo',
      generateExampleMessage:
        'Esto creará 3 archivos de plantilla Excel con datos de ejemplo que puede usar como referencia para importar sus propios datos.',
      generate: 'Generar',
      templateGenerated: '¡Plantilla Generada!',
      templateCreatedMessage:
        'La plantilla Excel con tres hojas (Artículos de Stand, Artículos de Estante y Clientes) ha sido creada. ¿Desea compartir/guardarla ahora?',
      shareTemplate: 'Compartir Plantilla',
      done: 'Hecho',
      failedToShare: 'Error al compartir archivo',
      failedToGenerate: 'Error al generar archivos de ejemplo',
      invalidExcelFile: 'Seleccione un archivo Excel (.xlsx).',
      noItemsImported: 'No se importaron elementos',
      createdStandsCount: 'Se crearon {count} stands',
      importedStandItemsCount: 'Se importaron {count} artículos de stand',
      importedShelfItemsCount: 'Se importaron {count} artículos de estante',
      importedCustomersCount: 'Se importaron {count} clientes',
      preparingImport: 'Preparando importación...',
      readingRowsFromSheet: 'Leyendo filas de la hoja...',
      resolvingWorkbookSheets: 'Resolviendo hojas del libro por nombre...',
      extractingStandImages: 'Extrayendo imágenes ancladas (Artículos de Stand)...',
      extractingShelfImages: 'Extrayendo imágenes ancladas (Artículos de Estante)...',
      skippingImageExtraction:
        'Omitiendo extracción de imágenes para una importación más rápida...',
      startingDatabaseTransaction: 'Iniciando transacción de base de datos...',
      clearingExistingData: 'Limpiando datos existentes...',
      importingStandItems: 'Importando artículos de stand...',
      importingShelfItems: 'Importando artículos de estante...',
      importingCustomers: 'Importando clientes...',
      finalizingImport: 'Finalizando importación...',
      importingStandItemRow: 'Importando fila de artículo de stand {row}',
      importingShelfItemRow: 'Importando fila de artículo de estante {row}',
      importingCustomerRow: 'Importando fila de cliente {row}',
    },
    export: {
      orderPrefix: 'pedido',
      shelfSheetName: 'Estante',
      customerLabel: 'Cliente:',
      dateLabel: 'Fecha:',
      timeLabel: 'Hora:',
      articleLabel: 'Artículo',
      quantityLabel: 'Cantidad',
      shareOrderExcelDialogTitle: 'Compartir archivo Excel del pedido',
    },
    itemModal: {
      color: 'Color',
      itemCode: 'Código de Artículo',
      currentQuantity: 'Cantidad Actual',
      itemId: 'ID de Artículo',
    },
  },
};

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'sr', name: 'Srpski' },
  { code: 'es', name: 'Español' },
];

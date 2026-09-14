export const en = {
  tabs: {
    mocks: 'Mocks',
    settings: 'Settings',
  },
  panel: {
    close: 'Close',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
  },
  tooltip: {
    databaseLoading: 'Database status…',
    databaseMissing: 'Database not configured',
    databaseOk: 'Database: {name} (ok)',
    databaseError: 'Database: {name} (error)',
    mocksEmpty: 'No endpoints with table yet',
    mocksReady: 'Mocks: endpoints with table present',
    mocksData: 'Mocks: data present in store',
  },
  settings: {
    locale: 'Locale',
    button: 'Launcher button',
    corner: 'Position',
    hidden: 'Hide launcher',
    hiddenHint: 'Panel stays available via Ctrl+Shift+M / ⌘⇧M',
    panelSize: 'Panel size',
    width: 'Width (%)',
    height: 'Height (%)',
    apply: 'Apply',
    applyError: 'Enter numbers from 20 to 100',
    fullscreen: 'Fullscreen',
    database: 'Database',
    databaseNotConfigured: 'Database not configured',
    databaseConnected: 'Connected',
    databaseError: 'Error',
    refresh: 'Refresh',
    refreshedAt: 'Updated {time}',
    tables: 'Tables',
    count: 'Count',
    logging: 'API logging',
    loggingOn: 'ON',
    loggingOff: 'OFF',
    loggingHint: 'api.use("logger", ConsoleLogger) / api.remove("logger")',
    corners: {
      'top-left': 'Top left',
      'top-right': 'Top right',
      'bottom-left': 'Bottom left',
      'bottom-right': 'Bottom right',
    },
  },
  mocks: {
    emptyNotice:
      'No endpoints with table meta yet (GET/POST/PATCH/PUT/DELETE). Improve the mock API (@endpoint / register.meta / route.table) or add manually.',
    add: 'Add',
    addTitle: 'Add mock',
    addMethod: 'Method',
    addPath: 'Path',
    addTable: 'Table',
    addSave: 'Save',
    addCancel: 'Cancel',
    addHint: 'Method + path + table. Opens in Mocks; set status/body in Expand.',
    addOverrideWarn:
      'This method+path already exists in the API. Saving seeds an override — confirm in Expand or use Reset.',
    addPathRequired: 'Enter a path like /tasks',
    addTableRequired: 'Select a table',
    addNoTables: 'No tables (dbStatus)',
    addDuplicate: 'This method+path is already in the list',
    addError: 'Failed to save mock',
    searchPlaceholder: 'Search by /endpoint',
    searchEmpty: 'No mocks match this path',
    records: 'Records',
    countUnknown: '—',
    table: 'Table',
    generate: 'Generate',
    generateCount: 'Count',
    generateDone: 'Added {n} row(s)',
    generateError: 'Generate failed',
    clear: 'Clear table',
    clearDone: 'Table cleared',
    clearError: 'Clear failed',
    needStoreAdapter: 'Connect api.storeAdapter to enable Generate / Clear.',
    parseTitle: 'Parse from table data',
    parseHint: 'Sample = first row. AS-IS keeps values; Similar varies fields.',
    parseMode: 'Parse mode',
    parseGenerate: 'Parse → Generate',
    parseLoading: 'Loading sample…',
    parseNoSample: 'No sample row in storeAdapter',
    parseError: 'Parse generate failed',
    overrideTitle: 'Response override',
    overrideWarnExisting:
      'Route/resource already registered — override replaces the handler response until Reset.',
    overrideHintManual: 'No API route yet — override answers api.handle for this method+path.',
    overrideSuccess: 'Success',
    overrideError: 'Error',
    overrideStatus: 'Status',
    overrideStatusCustom: 'Custom',
    overrideBody: 'Body (JSON)',
    overrideBodyInvalid: 'Invalid JSON',
    overrideApply: 'Apply body',
    overrideReset: 'Reset',
    overrideResetDone: 'Override cleared',
    overrideSaved: 'Override saved',
    overrideActive: 'Active',
    expandTabs: 'Mock sections',
    tabSchemas: 'Schemas',
    tabResponse: 'Response',
    tabSchemasOn: 'Schemas defined',
    tabSchemasOff: 'No schemas yet',
    tabResponseOn: 'Response override ON (HTTP {status})',
    tabResponseOff: 'No response override',
    tabData: 'Data',
    tabSchema: 'Schema',
    tabOverride: 'Override',
    tabDataOn: 'Table has {n} row(s)',
    tabDataOff:
      'Table is empty — use the Schemas tab to Parse JSON / configure fields and Generate.',
    tabSchemaOn: 'Schemas defined',
    tabSchemaOff: 'No schemas yet',
    tabOverrideOn: 'Response override ON (HTTP {status})',
    tabOverrideOff: 'No response override',
    schemasHint:
      'Named schemas as accordions. Use kind "ref" to nest another schema (e.g. roles: roles[]).',
    schemasAdd: 'Add schema',
    schemasRemove: 'Remove schema',
    schemasNamePlaceholder: 'schema name (roles, users…)',
    responseHint: 'Body source: one schema object, schema array, pagination, or raw JSON — plus status code.',
    responseBodyMode: 'Body source',
    responseModeSchema: 'Schema',
    responseModeArray: 'Array',
    responseModePagination: 'Pagination',
    responseModeJson: 'JSON',
    responseSchema: 'Schema',
    responseGenerateHint: 'Apply generates body from the selected source and saves the override.',
    responseNeedSchema: 'Define a schema on the Schemas tab first',
    responsePaginationDb: 'From DB',
    responsePaginationSchema: 'From schema',
    responsePaginationDbHint: 'Table',
    responsePaginationPage: 'page',
    responsePaginationLimit: 'limit',
    responsePaginationPages: 'pages',
    pushEnable: 'Enable channel',
    pushPeriod: 'Period (ms)',
    pushHint:
      'When enabled, DevTools ticks this payload to open SSE/WS connections (app handler skipped).',
    pushSaved: 'Push channel saved',
    pushResetDone: 'Push channel cleared',
    pushBadgeOn: 'Push live',
    sourcePush: 'Push route from api',
    source: 'Source',
    sourceApi: 'API',
    sourceManual: 'Manual',
    genSourceSchema: 'schema ({n} fields)',
    ctorTitle: 'Schema constructor',
    ctorHint:
      'Two paths: Parse JSON into a field list, or create fields manually — then Generate.',
    ctorEmpty: 'No fields yet — use Parse JSON above, From table, or Add field.',
    ctorNoSample: 'No row in table — paste JSON and Parse, or Add field below.',
    ctorAutoImported: 'Imported from sample (Similar). Edit and Save if needed.',
    ctorImportMode: 'Import mode',
    ctorAddField: 'Add field',
    ctorRemove: 'Remove',
    ctorArrayElement: 'item',
    ctorImport: 'From table',
    ctorSave: 'Save',
    ctorClear: 'Reset',
    ctorSaved: 'Schema saved',
    ctorCleared: 'Schema cleared',
    ctorImported: 'Loaded from table sample',
    ctorSaveError: 'Failed to save schema',
    ctorColKey: 'Key',
    ctorColKind: 'Kind',
    ctorColConfig: 'Config',
    ctorColNull: 'Null',
    ctorNullTooltip: 'nullable',
    ctorConfigObjectHint:
      'Use a named schema as the object, or define fields here. Table updates after Apply.',
    ctorConfigObjectMode: 'Object',
    ctorConfigObjectFields: 'new fields',
    ctorConfigObjectSchema: 'schema',
    ctorPathParseTitle: '1. Parse JSON → fields',
    ctorPathParseHint:
      'JSON will be converted into a field list below. Similar infers kinds; AS-IS keeps const values.',
    ctorPathFieldsTitle: '2. Create by fields',
    ctorPathFieldsHint:
      'Add fields manually, or edit the list after Parse. Then Generate rows.',
    ctorJsonTitle: 'Parse JSON → fields',
    ctorJsonHint:
      'JSON will be converted into a field list. Similar infers kinds; AS-IS keeps const values.',
    ctorJsonPlaceholder:
      '{\n  "id": "…",\n  "user_id": 42,\n  "login": "pending_user",\n  "status": "pending",\n  "createdAt": "2026-01-01T00:00:00.000Z"\n}',
    ctorJsonParse: 'Parse → fields',
    ctorJsonParsed: 'Converted to field list',
    ctorJsonInvalid: 'Invalid JSON',
    ctorJsonEmpty: 'Paste a JSON object first',
    ctorJsonNeedObject: 'Need a JSON object (or non-empty array of objects)',
    ctorConfigTitle: 'Field settings',
    ctorConfigOpen: 'Open field settings',
    ctorConfigApply: 'Apply',
    ctorConfigCancel: 'Cancel',
    ctorConfigMode: 'Mode',
    ctorConfigStringHint: 'One value = constant. List with separator (default ;) = pool.',
    ctorConfigPoolOrConst: 'Value or pool',
    ctorConfigPoolSep: 'Separator',
    ctorConfigNumRange: 'range (min…max)',
    ctorConfigNumStep: 'stepped (from…to / step)',
    ctorConfigNumPool: 'pool',
    ctorConfigNumPoolHint: 'Numbers with separator, e.g. 22; 80; 443',
    ctorConfigNumPoolInvalid: 'Invalid numbers in pool',
    ctorConfigNumPoolEmpty: 'Number pool cannot be empty',
    ctorConfigDupKeys: 'Duplicate keys',
    ctorConfigEmptyKeys: 'All object fields need a non-empty key',
    ctorConfigNoOptions: 'No extra options for this kind.',
    ctorConfigRefHint: 'Reference another named schema (Model.asProperty).',
    ctorConfigRefSchema: 'Schema',
    ctorConfigRefPick: '— pick schema —',
    ctorConfigRefArray: 'array of schema',
    ctorConfigArrayHint:
      'Array count + element type: strings, numbers, a named schema, or an object with fields.',
    ctorConfigArrayLength: 'Count',
    ctorConfigArrayElement: 'Element',
    ctorConfigArrayElString: 'string[]',
    ctorConfigArrayElNumber: 'number[]',
    ctorConfigArrayElSchema: 'schema[]',
    ctorConfigArrayElObject: 'object[] (fields)',
    ctorConfigArrayObjectHint:
      'Add nested fields below in this dialog. They appear in the table after Apply.',
    ctorConfigNestedFieldsHint: 'Object fields — add and configure here. Apply to save.',
    ctorConfigNestedEmpty: 'No fields yet — click Add field.',
  },
};

export type Dictionary = {
  tabs: { mocks: string; settings: string };
  panel: {
    close: string;
    fullscreen: string;
    exitFullscreen: string;
  };
  tooltip: {
    databaseLoading: string;
    databaseMissing: string;
    databaseOk: string;
    databaseError: string;
    mocksEmpty: string;
    mocksReady: string;
    mocksData: string;
  };
  settings: {
    locale: string;
    button: string;
    corner: string;
    hidden: string;
    hiddenHint: string;
    panelSize: string;
    width: string;
    height: string;
    apply: string;
    applyError: string;
    fullscreen: string;
    database: string;
    databaseNotConfigured: string;
    databaseConnected: string;
    databaseError: string;
    refresh: string;
    refreshedAt: string;
    tables: string;
    count: string;
    logging: string;
    loggingOn: string;
    loggingOff: string;
    loggingHint: string;
    corners: Record<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', string>;
  };
  mocks: {
    emptyNotice: string;
    add: string;
    addTitle: string;
    addMethod: string;
    addPath: string;
    addTable: string;
    addSave: string;
    addCancel: string;
    addHint: string;
    addOverrideWarn: string;
    addPathRequired: string;
    addTableRequired: string;
    addNoTables: string;
    addDuplicate: string;
    addError: string;
    searchPlaceholder: string;
    searchEmpty: string;
    records: string;
    countUnknown: string;
    table: string;
    generate: string;
    generateCount: string;
    generateDone: string;
    generateError: string;
    clear: string;
    clearDone: string;
    clearError: string;
    needStoreAdapter: string;
    parseTitle: string;
    parseHint: string;
    parseMode: string;
    parseGenerate: string;
    parseLoading: string;
    parseNoSample: string;
    parseError: string;
    overrideTitle: string;
    overrideWarnExisting: string;
    overrideHintManual: string;
    overrideSuccess: string;
    overrideError: string;
    overrideStatus: string;
    overrideStatusCustom: string;
    overrideBody: string;
    overrideBodyInvalid: string;
    overrideApply: string;
    overrideReset: string;
    overrideResetDone: string;
    overrideSaved: string;
    overrideActive: string;
    expandTabs: string;
    tabSchemas: string;
    tabResponse: string;
    tabSchemasOn: string;
    tabSchemasOff: string;
    tabResponseOn: string;
    tabResponseOff: string;
    tabData: string;
    tabSchema: string;
    tabOverride: string;
    tabDataOn: string;
    tabDataOff: string;
    tabSchemaOn: string;
    tabSchemaOff: string;
    tabOverrideOn: string;
    tabOverrideOff: string;
    schemasHint: string;
    schemasAdd: string;
    schemasRemove: string;
    schemasNamePlaceholder: string;
    responseHint: string;
    responseBodyMode: string;
    responseModeSchema: string;
    responseModeArray: string;
    responseModePagination: string;
    responseModeJson: string;
    responseSchema: string;
    responseGenerateHint: string;
    responseNeedSchema: string;
    responsePaginationDb: string;
    responsePaginationSchema: string;
    responsePaginationDbHint: string;
    responsePaginationPage: string;
    responsePaginationLimit: string;
    responsePaginationPages: string;
    pushEnable: string;
    pushPeriod: string;
    pushHint: string;
    pushSaved: string;
    pushResetDone: string;
    pushBadgeOn: string;
    sourcePush: string;
    source: string;
    sourceApi: string;
    sourceManual: string;
    genSourceSchema: string;
    ctorTitle: string;
    ctorHint: string;
    ctorEmpty: string;
    ctorNoSample: string;
    ctorAutoImported: string;
    ctorImportMode: string;
    ctorAddField: string;
    ctorRemove: string;
    ctorArrayElement: string;
    ctorImport: string;
    ctorSave: string;
    ctorClear: string;
    ctorSaved: string;
    ctorCleared: string;
    ctorImported: string;
    ctorSaveError: string;
    ctorColKey: string;
    ctorColKind: string;
    ctorColConfig: string;
    ctorColNull: string;
    ctorNullTooltip: string;
    ctorConfigObjectHint: string;
    ctorConfigObjectMode: string;
    ctorConfigObjectFields: string;
    ctorConfigObjectSchema: string;
    ctorPathParseTitle: string;
    ctorPathParseHint: string;
    ctorPathFieldsTitle: string;
    ctorPathFieldsHint: string;
    ctorJsonTitle: string;
    ctorJsonHint: string;
    ctorJsonPlaceholder: string;
    ctorJsonParse: string;
    ctorJsonParsed: string;
    ctorJsonInvalid: string;
    ctorJsonEmpty: string;
    ctorJsonNeedObject: string;
    ctorConfigTitle: string;
    ctorConfigOpen: string;
    ctorConfigApply: string;
    ctorConfigCancel: string;
    ctorConfigMode: string;
    ctorConfigStringHint: string;
    ctorConfigPoolOrConst: string;
    ctorConfigPoolSep: string;
    ctorConfigNumRange: string;
    ctorConfigNumStep: string;
    ctorConfigNumPool: string;
    ctorConfigNumPoolHint: string;
    ctorConfigNumPoolInvalid: string;
    ctorConfigNumPoolEmpty: string;
    ctorConfigDupKeys: string;
    ctorConfigEmptyKeys: string;
    ctorConfigNoOptions: string;
    ctorConfigRefHint: string;
    ctorConfigRefSchema: string;
    ctorConfigRefPick: string;
    ctorConfigRefArray: string;
    ctorConfigArrayHint: string;
    ctorConfigArrayLength: string;
    ctorConfigArrayElement: string;
    ctorConfigArrayElString: string;
    ctorConfigArrayElNumber: string;
    ctorConfigArrayElSchema: string;
    ctorConfigArrayElObject: string;
    ctorConfigArrayObjectHint: string;
    ctorConfigNestedFieldsHint: string;
    ctorConfigNestedEmpty: string;
  };
};

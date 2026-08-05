document.addEventListener("DOMContentLoaded", () => {
  // Handle para o arquivo JSON aberto, permitindo salvar automaticamente.
  let fileHandle = null;

  /**
   * Detecta se o app está rodando em um celular ou tablet.
   * O iPad se identifica como "MacIntel" no navigator.platform, por isso
   * precisa de uma checagem extra baseada em suporte a toque.
   */
  const isMobileOrTabletDevice = () => {
    const ua = navigator.userAgent || navigator.vendor || "";
    const uaIsMobile =
      /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
        ua,
      );
    const isIPadOS =
      navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return uaIsMobile || isIPadOS;
  };

  // A File System Access API (showOpenFilePicker/showSaveFilePicker) não existe
  // em navegadores móveis (Android e iOS) nem em alguns navegadores desktop
  // (Firefox, Safari). Chamar essas funções nesses casos lança um erro
  // imediatamente, sem nunca exibir o seletor de arquivos.
  const supportsFileSystemAccessAPI = () =>
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function";

  const isMobileDevice = isMobileOrTabletDevice();
  const useNativeFilePicker = !isMobileDevice && supportsFileSystemAccessAPI();

  // Chave usada para salvar/recuperar os dados automaticamente quando não é
  // possível manter um handle de arquivo aberto (celular, tablet ou
  // navegadores sem suporte à File System Access API).
  const AUTO_SAVE_STORAGE_KEY = "actEducacaoData";
  let localStorageAutoSaveActive = false;

  /**
   * Mescla os dados de um arquivo carregado ao estado atual, garantindo os
   * defaults de configuração adicionados em versões mais novas.
   */
  const applyLoadedData = (parsedData) => {
    state = { ...state, ...parsedData }; // Mescla os dados carregados ao estado

    if (!state.settings) {
      state.settings = {};
    }
    if (state.settings.minimumBlueGrade === undefined) {
      state.settings.minimumBlueGrade = 5;
    }
    if (state.settings.gradeDecimalPlaces === undefined) {
      state.settings.gradeDecimalPlaces = 2;
    }
    if (!state.settings.gradeRoundingMode) {
      state.settings.gradeRoundingMode = "real";
    }
    if (state.settings.sidebarCollapsed === undefined) {
      state.settings.sidebarCollapsed = false;
    }
    if (state.settings.diaryShowOnlyActiveStudents === undefined) {
      state.settings.diaryShowOnlyActiveStudents = true;
    }

    // Inicializa cache de frequência
    if (!state.termAttendanceCache) {
      state.termAttendanceCache = {};
    }
    if (!state.occurrences) {
      state.occurrences = [];
    }
    if (!state.plannings) {
      state.plannings = [];
    }
    if (!state.planningTemplates) {
      state.planningTemplates = [];
    }
    if (!state.planningAssociations) {
      state.planningAssociations = [];
    }
    if (!state.individualReportTemplates) {
      state.individualReportTemplates = [];
    }
    if (!state.studentIndividualReports) {
      state.studentIndividualReports = [];
    }
  };

  // Nome do arquivo de dados na raiz do projeto, carregado automaticamente
  // em celulares/tablets (onde não faz sentido pedir para o usuário escolher).
  const ROOT_JSON_FILE_NAME = "act_educacao_db.json";

  /**
   * Carrega automaticamente o arquivo .json da raiz do projeto. Usado em
   * celulares/tablets (e navegadores sem suporte à File System Access API),
   * onde não exibimos o modal de escolha. A partir daí, as alterações
   * passam a ser salvas automaticamente no armazenamento local do
   * dispositivo, já que não é possível escrever de volta nesse arquivo.
   */
  const autoLoadRootJsonFile = async () => {
    try {
      const response = await fetch(ROOT_JSON_FILE_NAME, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      applyLoadedData(await response.json());
      CustomSwal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Arquivo "${ROOT_JSON_FILE_NAME}" carregado automaticamente!`,
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error) {
      console.warn(
        `Não foi possível carregar "${ROOT_JSON_FILE_NAME}" automaticamente. Iniciando com dados vazios.`,
        error,
      );
      CustomSwal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: `Não encontrei "${ROOT_JSON_FILE_NAME}". Iniciando vazio.`,
        showConfirmButton: false,
        timer: 3000,
      });
    }

    localStorageAutoSaveActive = true;
    localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(state));
    return true;
  };

  /**
   * Pede ao usuário para carregar um arquivo .json existente.
   */
  const loadDataFromFile = async () => {
    try {
      // Abre o seletor de arquivos do sistema operacional
      [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Arquivos JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      const file = await fileHandle.getFile();

      const content = await file.text();

      if (content) {
        applyLoadedData(JSON.parse(content));

        CustomSwal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: `Arquivo "${file.name}" carregado!`,
          showConfirmButton: false,
          timer: 2000,
        });
      }
    } catch (error) {
      // O erro 'AbortError' acontece se o usuário fechar o seletor de arquivo, o que é normal.
      if (error.name !== "AbortError") {
        console.error("Erro ao carregar o arquivo:", error);
        CustomSwal.fire(
          "Erro",
          "Não foi possível ler o arquivo selecionado.",
          "error",
        );
      }
      // Se o usuário cancelou, não fazemos nada, e a aplicação continuará com o estado padrão.
      return false;
    }
    return true; // Sucesso
  };

  /**
   * Pede ao usuário para criar e salvar um novo arquivo .json.
   */
  const createNewFile = async () => {
    try {
      // Abre o seletor "Salvar como..." do sistema operacional
      fileHandle = await window.showSaveFilePicker({
        types: [
          {
            description: "Arquivos JSON",
            accept: { "application/json": [".json"] },
          },
        ],
        suggestedName: `actEducacao_dados_${new Date().toISOString().split("T")[0]}.json`,
      });
      // Salva o estado inicial (vazio) no novo arquivo
      await saveData();
      CustomSwal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Novo arquivo criado com sucesso!",
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Erro ao criar novo arquivo:", error);
        CustomSwal.fire(
          "Erro",
          "Não foi possível criar o novo arquivo.",
          "error",
        );
      }
      return false; // Falha ou cancelamento
    }
    return true; // Sucesso
  };

  /**
   * Tenta salvar os dados no arquivo que está sendo manipulado (se houver um).
   */
  const saveDataToFile = async () => {
    // Sem handle de arquivo: em celulares/tablets (ou navegadores sem suporte
    // à File System Access API) salvamos automaticamente no armazenamento
    // local do dispositivo, já que não é possível escrever de volta no arquivo.
    if (!fileHandle) {
      if (localStorageAutoSaveActive) {
        saveQueue = saveQueue.then(async () => {
          try {
            localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(state));
          } catch (error) {
            console.error("Erro no salvamento automático (dispositivo):", error);
          }
        });
        await saveQueue;
      }
      return;
    }

    const writeOnce = async () => {
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(state, null, 2));
      await writable.close();
      state.termAttendanceCache = {};
    };

    saveQueue = saveQueue.then(async () => {
      try {
        await writeOnce();
      } catch (error) {
        if (error?.name === "InvalidStateError") {
          await new Promise((resolve) => setTimeout(resolve, 50));
          try {
            await writeOnce();
          } catch (retryError) {
            console.error("Erro no salvamento automático:", retryError);
          }
          return;
        }
        console.error("Erro no salvamento automático:", error);
      }
    });

    await saveQueue;
  };

  /**
   * Exibe o modal inicial para o usuário escolher entre carregar ou criar um arquivo.
   */
  const promptToLoadOrCreateFile = () => {
    return CustomSwal.fire({
      title: "Bem-vindo ao actEducação",
      html: `
                <p class="text-secondary mb-4">Para começar, carregue um arquivo de dados existente ou crie um novo.</p>
                <div class="text-xs text-left p-3 border rounded-lg bg-[var(--bg-primary)]">
                    <b>Nota:</b> Seu trabalho será salvo automaticamente no arquivo escolhido.
                    Este aplicativo funciona offline e seus dados <b>nunca</b> saem do seu computador.
                </div>
            `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showCancelButton: true,
      confirmButtonText:
        '<i class="fas fa-folder-open mr-2"></i> Carregar Arquivo',
      cancelButtonText: '<i class="fas fa-plus mr-2"></i> Criar Novo Arquivo',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Usuário escolheu "Carregar Arquivo"
        return await loadDataFromFile();
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        // Usuário escolheu "Criar Novo Arquivo"
        return await createNewFile();
      }
      return false;
    });
  };

  let mainContent = document.querySelector("main");
  const body = document.body;
  const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
  const themeBtn = document.getElementById("theme-btn");
  const backupBtn = document.getElementById("backup-btn");
  let saveQueue = Promise.resolve();

  const CustomSwal = Swal.mixin({
    customClass: {
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-subtle",
      denyButton: "btn btn-subtle",
    },
    buttonsStyling: false,
    showClass: { popup: "animate__animated animate__fadeIn animate__faster" },
    hideClass: { popup: "animate__animated animate__fadeOut animate__faster" },
  });

  const typeTranslations = {
    school: "Escola",
    teacher: "Professor",
    subject: "Disciplina",
  };

  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const decodeHtmlEntities = (value = "") => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(value);
    return textarea.value;
  };

  const abbreviateStudentName = (fullName = "") => {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);

    if (parts.length <= 3) return String(fullName).trim();

    const firstName = parts[0];
    const secondName = parts[1];
    const lastName = parts[parts.length - 1];
    const middle = parts
      .slice(2, -1)
      .map((namePart) => `${namePart.charAt(0).toUpperCase()}.`)
      .join(" ");

    return `${firstName} ${secondName} ${middle} ${lastName}`
      .replace(/\s+/g, " ")
      .trim();
  };

  const sanitizePdfText = (value = "") => {
    const decoded = decodeHtmlEntities(String(value));
    let fixed = decoded;
    try {
      if (/[���]/.test(decoded)) {
        fixed = decodeURIComponent(escape(decoded));
      }
    } catch (_error) {
      fixed = decoded;
    }

    return fixed
      .normalize("NFC")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getPdfStudentNameDisplay = (student, className = "") => {
    const name = sanitizePdfText(student?.name || "");
    const status = String(student?.status || "").toLowerCase();
    const isTransferido = status === "transferido";
    const isRemanejado =
      status === "remanejado" || !!student?.__isRemanejadoOrigem;

    if (isTransferido) {
      return {
        text: name,
        fontStyle: "italic",
        strike: true,
        strikeText: name,
        strikePrefix: "",
      };
    }

    if (isRemanejado) {
      const suffix = className ? ` (${sanitizePdfText(className)})` : "";
      return {
        text: `${name}${suffix}`.trim(),
        fontStyle: "italic",
        strike: false,
        strikeText: "",
        strikePrefix: "",
      };
    }

    return {
      text: name,
      fontStyle: "normal",
      strike: false,
      strikeText: "",
      strikePrefix: "",
    };
  };

  const buildPdfStudentNameCell = (student, className = "") => {
    const display = getPdfStudentNameDisplay(student, className);
    return {
      content: display.text,
      styles: { fontStyle: display.fontStyle },
      __pdfStudentStrike: display.strike,
      __pdfStudentStrikeText: display.strikeText || "",
      __pdfStudentStrikePrefix: display.strikePrefix || "",
    };
  };

  const drawPdfStudentStrikeThrough = (doc, data) => {
    const raw = data?.cell?.raw;
    if (!raw || typeof raw !== "object" || !raw.__pdfStudentStrike) return;

    const strikeText = String(raw.__pdfStudentStrikeText || "");
    const strikePrefix = String(raw.__pdfStudentStrikePrefix || "");
    const textWidth = doc.getTextWidth(strikeText);
    const prefixWidth = strikePrefix ? doc.getTextWidth(strikePrefix) : 0;
    const paddingLeft = data.cell.styles?.cellPadding?.left ?? 2;
    const startX = data.cell.x + paddingLeft + prefixWidth + 0.8;
    const strikeY = data.cell.y + data.cell.height / 2 + 0.3;

    doc.setLineWidth(0.25);
    doc.line(startX, strikeY, startX + textWidth, strikeY);
  };

  const drawPdfStudentLabel = (
    doc,
    x,
    y,
    student,
    className = "",
    prefix = "Aluno: ",
  ) => {
    const display = getPdfStudentNameDisplay(student, className);
    const startX = x;
    const labelText = prefix ? String(prefix).trimEnd() : "";
    const labelHasSpace = prefix.endsWith(" ");
    const prefixWidth = labelText ? doc.getTextWidth(labelText) : 0;
    const nameX = startX + prefixWidth + (labelHasSpace ? 0 : 1.5);
    doc.setFont(undefined, display.fontStyle);
    if (labelText) {
      doc.text(prefix, startX, y);
    }
    doc.text(display.text, labelText ? nameX : startX, y);
    if (display.strike) {
      const strikePrefixWidth = display.strikePrefix
        ? doc.getTextWidth(display.strikePrefix)
        : 0;
      const width = doc.getTextWidth(display.strikeText || display.text);
      doc.setLineWidth(0.25);
      doc.line(
        (labelText ? nameX : startX) + strikePrefixWidth,
        y - 1.2,
        (labelText ? nameX : startX) + strikePrefixWidth + width,
        y - 1.2,
      );
    }
    doc.setFont(undefined, "normal");
    return `${prefix}${display.text}`.trim();
  };

  const extendedColorPalette = [
    "#F44336",
    "#E91E63",
    "#9C27B0",
    "#673AB7",
    "#3F51B5",
    "#2196F3",
    "#03A9F4",
    "#00BCD4",
    "#009688",
    "#4CAF50",
    "#8BC34A",
    "#CDDC39",
    "#FFC107",
    "#FF9800",
    "#FF5722",
    "#795548",
    "#9E9E9E",
    "#607D8B",
    "#d62728",
    "#1f77b4",
  ];

  let state = {
    settings: {
      theme: "light-default",
      color: "#4CAF50",
      minimumBlueGrade: 5,
      gradeDecimalPlaces: 2,
      gradeRoundingMode: "real",
      sidebarCollapsed: false,
      diaryShowOnlyActiveStudents: true,
    },
    schools: [],
    teachers: [],
    subjects: [],
    classes: [],
    students: [],
    schedules: [],
    homeworks: [],
    occurrences: [],
    tasks: [],
    notes: [],
    plannings: [],
    planningTemplates: [],
    planningAssociations: [],
    attendance: {},
    content: {},
    calendars: {},
    assessments: [],
    grades: {},
    assessmentSettings: {},
    gradesAdjustments: {},
    calculatedAverages: {},
    termAttendance: {},
    finalResults: {},
    finalAdjustments: {},
    gradesHorarias: [],
    termAttendanceCache: {}, // Cache para acelerar cálulos de frequência
    transferHistory: [], // Histórico de transferências de alunos entre turmas
    individualReportTemplates: [], // Modelos de relatórios individuais personalizados
    individualReportVariables: [], // Variáveis personalizadas para relatórios individuais
    studentIndividualReports: [], // Histórico de relatórios individuais por aluno
  };

  const isDiaryOnlyActiveStudentsEnabled = () =>
    state?.settings?.diaryShowOnlyActiveStudents !== false;

  const isReportOnlyActiveStudentsEnabled = () =>
    document.getElementById("report-active-students-only")?.checked ?? true;

  const getStudentsForClass = (
    classId,
    onlyActive = true,
    sortMode = "number",
  ) => {
    const students = state.students
      .filter((student) => student.classId === classId)
      .filter((student) =>
        onlyActive ? (student.status || "ativo") === "ativo" : true,
      );

    if (sortMode === "name") {
      return students.sort((a, b) => a.name.localeCompare(b.name));
    }

    return students.sort((a, b) => (a.number || 999) - (b.number || 999));
  };

  const getDiaryStudentsForClass = (classId, onlyActive = true) =>
    state.students
      .filter((student) => student.classId === classId)
      .filter((student) =>
        onlyActive ? (student.status || "ativo") === "ativo" : true,
      )
      .sort((a, b) => (a.number || 999) - (b.number || 999));

  const getPassingGradeThreshold = () => {
    const rawValue = parseFloat(state?.settings?.minimumBlueGrade);
    if (isNaN(rawValue)) return 5;
    return Math.max(0, Math.min(10, rawValue));
  };

  const parseGradeNumericValue = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const normalized = String(value).trim().replace(",", ".");
    const numeric = parseFloat(normalized);
    return Number.isNaN(numeric) ? null : numeric;
  };

  const isBlueGrade = (gradeValue) => {
    const numeric = parseGradeNumericValue(gradeValue);
    if (numeric === null) return false;
    return numeric >= getPassingGradeThreshold();
  };

  const isRedGrade = (gradeValue) => {
    const numeric = parseGradeNumericValue(gradeValue);
    if (numeric === null) return false;
    return numeric < getPassingGradeThreshold();
  };

  const formatPassingGradeThresholdPtBr = () =>
    getPassingGradeThreshold().toFixed(1).replace(".", ",");

  const getGradeDecimalPlaces = () => {
    const rawValue = parseInt(state?.settings?.gradeDecimalPlaces, 10);
    if (isNaN(rawValue)) return 2;
    return Math.max(0, Math.min(4, rawValue));
  };

  const getGradeRoundingMode = () => {
    const mode = state?.settings?.gradeRoundingMode;
    if (["real", "half", "integer"].includes(mode)) return mode;
    return "real";
  };

  const roundGradeValue = (value) => {
    const numeric = parseGradeNumericValue(value);
    if (numeric === null) return null;

    const decimals = getGradeDecimalPlaces();
    const factor = 10 ** decimals;
    const mode = getGradeRoundingMode();

    let rounded;
    if (mode === "integer") {
      // Somente inteiro: arredondamento matemático para o inteiro mais próximo
      rounded = Math.round(numeric);
    } else if (mode === "half") {
      // Arredondar de 0,5 em 0,5: aceita apenas valores terminados em .0 ou .5
      rounded = Math.round(numeric * 2) / 2;
    } else {
      // Manter valor real: trunca na quantidade de casas decimais configurada
      rounded = Math.floor((numeric + Number.EPSILON) * factor) / factor;
    }

    return Number(rounded.toFixed(decimals));
  };

  const formatGradeValue = (value, fallback = "--") => {
    const rounded = roundGradeValue(value);
    if (rounded === null) return fallback;
    const decimals = getGradeDecimalPlaces();
    return rounded.toFixed(decimals);
  };

  const formatConventionalGradeValue = (value, fallback = "--") => {
    if (value === undefined || value === null || value === "") return fallback;
    const decimals = getGradeDecimalPlaces();
    const normalized = String(value).trim().replace(",", ".");
    const numeric = parseFloat(normalized);
    if (isNaN(numeric)) return fallback;

    // Nota comum não arredonda: apenas limita as casas decimais configuradas.
    const [integerPart, decimalPart = ""] = normalized.split(".");
    const sliced = decimalPart.slice(0, decimals).padEnd(decimals, "0");
    return decimals > 0 ? `${integerPart}.${sliced}` : integerPart;
  };

  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  };

  const hasLaunchesForVersion = (versao) => {
    const suffix = `_v${versao}`;

    const attendanceKeys = Object.keys(state.attendance || {});
    const hasAttendance = attendanceKeys.some((key) => key.includes(suffix));

    let hasContent = false;
    Object.values(state.content || {}).some((termContent) => {
      const dailyRecords = termContent?.dailyRecords || {};
      const keys = Object.keys(dailyRecords);
      if (keys.some((key) => key.includes(suffix))) {
        hasContent = true;
        return true;
      }
      return false;
    });

    // Fallback: dados antigos sem sufixo (considerar como versão 1)
    if (versao === 1) {
      const hasOldAttendance = attendanceKeys.some(
        (key) => !key.includes("_v"),
      );
      let hasOldContent = false;
      Object.values(state.content || {}).some((termContent) => {
        const dailyRecords = termContent?.dailyRecords || {};
        const keys = Object.keys(dailyRecords);
        if (keys.some((key) => !key.includes("_v"))) {
          hasOldContent = true;
          return true;
        }
        return false;
      });
      return hasAttendance || hasContent || hasOldAttendance || hasOldContent;
    }

    return hasAttendance || hasContent;
  };

  const copyLaunchesToVersion = (targetVersion) => {
    if (
      !targetVersion?.versao ||
      !targetVersion?.dataInicio ||
      !targetVersion?.dataFim
    ) {
      return;
    }

    const start = targetVersion.dataInicio;
    const end = targetVersion.dataFim;
    const suffix = `_v${targetVersion.versao}`;

    // Copia frequência
    Object.keys(state.attendance || {}).forEach((key) => {
      if (key.includes(suffix)) return; // já está nesta versão

      const parts = key.split("_");
      if (parts.length < 4) return;

      const date = parts[2];
      if (date < start || date > end) return;

      const periodWithSuffix = parts[3];
      const periodIndex = periodWithSuffix.split("_v")[0];
      const newKey = `${parts[0]}_${parts[1]}_${date}_${periodIndex}${suffix}`;

      const current = state.attendance[key];
      const hasLaunch =
        current && Object.values(current).some((status) => status !== "unset");
      if (!hasLaunch) return;

      if (!state.attendance[newKey]) {
        state.attendance[newKey] = JSON.parse(JSON.stringify(current));
      }
    });

    // Copia conteúdo
    Object.values(state.content || {}).forEach((termContent) => {
      const dailyRecords = termContent?.dailyRecords;
      if (!dailyRecords) return;

      Object.keys(dailyRecords).forEach((lessonKey) => {
        if (lessonKey.includes(suffix)) return;

        const [datePart, periodPart] = lessonKey.split("_");
        if (!datePart || !periodPart) return;
        if (datePart < start || datePart > end) return;

        const periodIndex = periodPart.split("_v")[0];
        const newLessonKey = `${datePart}_${periodIndex}${suffix}`;

        if (!dailyRecords[newLessonKey]) {
          dailyRecords[newLessonKey] = JSON.parse(
            JSON.stringify(dailyRecords[lessonKey]),
          );
        }
      });
    });
  };

  /**
   * Retorna a versão da grade horária vigente para uma determinada data.
   * @param {string} dataAula - Data da aula no formato YYYY-MM-DD.
   * @returns {object|null} Objeto da versão da grade ou null.
   */
  const getGradeHorariaVigente = (dataAula) => {
    if (!state.gradesHorarias || !Array.isArray(state.gradesHorarias))
      return null;
    return (
      state.gradesHorarias.find((grade) => {
        return dataAula >= grade.dataInicio && dataAula <= grade.dataFim;
      }) || null
    );
  };

  const getSchedulesForDate = (dateString) => {
    const gradeVigente = getGradeHorariaVigente(dateString);
    if (gradeVigente && Array.isArray(gradeVigente.schedules)) {
      return gradeVigente.schedules;
    }
    return state.schedules;
  };

  const getScheduleEntryForCourse = (course, dateString) => {
    if (!course) return null;
    const schedulesToUse = getSchedulesForDate(dateString);
    return schedulesToUse.find(
      (s) => s.classId === course.classId && s.subjectId === course.subjectId,
    );
  };

  const getNumPeriodsForCourseDate = (classId, subjectId, dateString) => {
    const schedulesToUse = getSchedulesForDate(dateString);
    const dateObj = new Date(`${dateString}T12:00:00`);
    const dayOfWeek = dateObj.getDay();

    return schedulesToUse.filter(
      (s) =>
        s.classId === classId &&
        s.subjectId === subjectId &&
        Number(s.dayOfWeek) === dayOfWeek,
    ).length;
  };

  const getStudentClassForDate = (student, dateString) => {
    if (!student) return null;

    const movements = Array.isArray(student.classMovements)
      ? [...student.classMovements]
          .filter((m) => m?.fromClassId && m?.toClassId && m?.date)
          .sort((a, b) => (a.date < b.date ? 1 : -1))
      : [];

    let classIdAtDate = student.classId;

    movements.forEach((movement) => {
      if (dateString < movement.date && classIdAtDate === movement.toClassId) {
        classIdAtDate = movement.fromClassId;
      }
    });

    return classIdAtDate;
  };

  const getStudentClassCandidatesForDate = (student, dateString) => {
    if (!student) return [];

    const candidates = new Set();
    const classAtDate = getStudentClassForDate(student, dateString);
    if (classAtDate) candidates.add(classAtDate);

    const movements = Array.isArray(student.classMovements)
      ? student.classMovements.filter(
          (m) => m?.fromClassId && m?.toClassId && m?.date,
        )
      : [];

    movements.forEach((movement) => {
      if (dateString < movement.date) {
        candidates.add(movement.fromClassId);
      } else {
        candidates.add(movement.toClassId);
      }
    });

    return Array.from(candidates);
  };

  // Helper para buscar attendance com fallback para chave sem versão
  const getAttendanceForDate = (classId, subjectId, date, periodIndex) => {
    const gradeVigente = getGradeHorariaVigente(date);
    const versaoSuffix = gradeVigente ? `_v${gradeVigente.versao}` : "";

    // Tenta com sufixo de versão primeiro
    const keyWithVersion = `${classId}_${subjectId}_${date}_${periodIndex}${versaoSuffix}`;
    if (state.attendance[keyWithVersion]) {
      return state.attendance[keyWithVersion];
    }

    // Fallback para chave sem versão (dados antigos)
    const keyWithoutVersion = `${classId}_${subjectId}_${date}_${periodIndex}`;
    return state.attendance[keyWithoutVersion] || {};
  };

  const getAttendanceStatusesForStudentOnDate = (classId, date, studentId) => {
    const lessonStatusMap = new Map();

    Object.entries(state.attendance || {}).forEach(([key, data]) => {
      const match = key.match(
        /^([^_]+)_([^_]+)_(\d{4}-\d{2}-\d{2})_(\d+)(?:_v(\d+))?$/,
      );
      if (!match) return;

      const [, keyClassId, keySubjectId, keyDate, keyPeriodIndex, keyVersion] =
        match;
      if (keyClassId !== classId || keyDate !== date) return;

      const status = data?.[studentId];
      if (!status || status === "unset") return;

      const lessonKey = `${keySubjectId}_${keyPeriodIndex}`;
      const versionNumber = keyVersion ? Number(keyVersion) : -1;
      const current = lessonStatusMap.get(lessonKey);

      if (!current || versionNumber > current.version) {
        lessonStatusMap.set(lessonKey, {
          status,
          version: versionNumber,
        });
      }
    });

    return Array.from(lessonStatusMap.values()).map((entry) => entry.status);
  };

  // Helper para buscar content com fallback para chave sem versão
  const getContentForLesson = (
    classId,
    subjectId,
    termStart,
    termEnd,
    date,
    periodIndex,
  ) => {
    const termKey = `${classId}_${subjectId}_${termStart}_${termEnd}`;
    const termContent = state.content[termKey];

    if (!termContent || !termContent.dailyRecords) {
      return null;
    }

    const gradeVigente = getGradeHorariaVigente(date);
    const versaoSuffix = gradeVigente ? `_v${gradeVigente.versao}` : "";

    // Tenta com sufixo de versão primeiro
    const lessonKeyWithVersion = `${date}_${periodIndex}${versaoSuffix}`;
    if (termContent.dailyRecords[lessonKeyWithVersion]) {
      return termContent.dailyRecords[lessonKeyWithVersion];
    }

    // Fallback para chave sem versão (dados antigos)
    const lessonKeyWithoutVersion = `${date}_${periodIndex}`;
    return termContent.dailyRecords[lessonKeyWithoutVersion] || null;
  };

  /**
   * Registra frequência e conteúdo associando à versão da grade horária vigente.
   * @param {string} turmaId
   * @param {string} dataAula
   * @param {object} frequencia
   * @param {object} conteudo
   */
  const registrarFrequenciaConteudo = (
    turmaId,
    dataAula,
    frequencia,
    conteudo,
  ) => {
    const gradeVigente = getGradeHorariaVigente(dataAula);
    if (!gradeVigente) {
      CustomSwal.fire(
        "Erro",
        "Não há grade horária vigente para a data informada.",
        "error",
      );
      return;
    }
    // Chave composta: turma, data, versão da grade
    const chave = `${turmaId}_${dataAula}_v${gradeVigente.versao}`;
    state.attendance[chave] = frequencia;
    state.content[chave] = conteudo;
    saveDataToFile();
  };

  /**
   * Consulta frequência/conteúdo usando a versão da grade vigente.
   * @param {string} turmaId
   * @param {string} dataAula
   * @returns {object} { frequencia, conteudo }
   */
  const consultarFrequenciaConteudo = (turmaId, dataAula) => {
    const gradeVigente = getGradeHorariaVigente(dataAula);
    if (!gradeVigente) return { frequencia: null, conteudo: null };
    const chave = `${turmaId}_${dataAula}_v${gradeVigente.versao}`;
    return {
      frequencia: state.attendance[chave] || null,
      conteudo: state.content[chave] || null,
    };
  };

  // ... (O restante do seu código até a função renderBulletinsPage)

  /**
   * NOVO HELPER: Aplica cores (vermelho/azul) a células de nota em relatórios PDF.
   */
  const applyGradeStylesToPdfCell = (data) => {
    const grade = parseFloat(data.cell.text[0]);
    if (!isNaN(grade)) {
      if (isRedGrade(grade)) {
        data.cell.styles.textColor = "#e74c3c"; // Vermelho
      } else {
        data.cell.styles.textColor = "#2980b9"; // Azul
      }
    }
  };

  const getPdfChartPalette = () => {
    const fallbackPalette = {
      min: [205, 230, 207],
      avg: [142, 196, 147],
      student: [76, 175, 80],
      max: [46, 125, 50],
      axis: [56, 86, 60],
      grid: [215, 232, 217],
      text: [52, 78, 55],
      tableHead: [56, 142, 60],
      tableAlt: "#eef7ef",
    };

    if (typeof tinycolor !== "function") {
      return fallbackPalette;
    }

    const base = tinycolor(state?.settings?.color || "#4CAF50");
    const toRgbArray = (color) => {
      const { r, g, b } = color.toRgb();
      return [r, g, b];
    };

    return {
      min: toRgbArray(base.clone().lighten(32)),
      avg: toRgbArray(base.clone().lighten(16)),
      student: toRgbArray(base.clone()),
      max: toRgbArray(base.clone().darken(18)),
      axis: toRgbArray(base.clone().darken(28)),
      grid: toRgbArray(base.clone().lighten(38)),
      text: toRgbArray(base.clone().darken(22)),
      tableHead: toRgbArray(base.clone().darken(10)),
      tableAlt: base.clone().lighten(43).toHexString(),
    };
  };

  /**
   * Adiciona uma página com gráfico comparativo do aluno em relação à turma.
   * Exibe menor nota, maior nota, média da sala e nota do aluno por indicador.
   */
  const appendStudentComparativeChartPage = (doc, options) => {
    const {
      reportTitle,
      studentName,
      className,
      subjectName,
      metrics = [],
      yearLabel = "",
      inline = false,
      startY = null,
      includeMetricsTable = true,
    } = options || {};

    const numericMetrics = metrics
      .map((metric) => {
        const classGrades = Array.isArray(metric.classGrades)
          ? metric.classGrades
              .map((value) => parseFloat(value))
              .filter((value) => !isNaN(value))
          : [];
        const studentGrade = parseFloat(metric.studentGrade);

        if (classGrades.length === 0 || isNaN(studentGrade)) return null;

        const min = Math.min(...classGrades);
        const max = Math.max(...classGrades);
        const avg =
          classGrades.reduce((sum, value) => sum + value, 0) /
          classGrades.length;

        return {
          label: metric.label,
          min,
          max,
          avg,
          student: studentGrade,
        };
      })
      .filter(Boolean);

    if (!inline) {
      doc.addPage();
    }

    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const pageHeight =
      doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const contentStartY = startY || 14;
    const chartPalette = getPdfChartPalette();

    doc.setFont(undefined, "bold");
    doc.setFontSize(inline ? 11 : 14);
    doc.text(reportTitle || "Gráfico Comparativo", 14, contentStartY);

    doc.setFont(undefined, "normal");
    doc.setFontSize(inline ? 8 : 10);
    if (!inline) {
      doc.text(`Aluno: ${studentName || "N/D"}`, 14, contentStartY + 6);
      doc.text(`Turma: ${className || "N/D"}`, 14, contentStartY + 11);
      doc.text(`Disciplina: ${subjectName || "N/D"}`, 14, contentStartY + 16);
      if (yearLabel) {
        doc.text(
          `Ano Letivo: ${yearLabel}`,
          pageWidth - 14,
          contentStartY + 6,
          {
            align: "right",
          },
        );
      }
    } else if (yearLabel) {
      doc.text(`Ano Letivo: ${yearLabel}`, pageWidth - 14, contentStartY, {
        align: "right",
      });
    }

    if (numericMetrics.length === 0) {
      doc.setFontSize(11);
      doc.text(
        "Sem dados suficientes para gerar o comparativo deste aluno.",
        14,
        contentStartY + 8,
      );
      return contentStartY + 8;
    }

    const legendItems = [
      { label: "Menor nota da sala", color: chartPalette.min },
      { label: "Média da sala", color: chartPalette.avg },
      { label: "Nota do aluno", color: chartPalette.student },
      { label: "Maior nota da sala", color: chartPalette.max },
    ];

    let legendX = 14;
    const legendY = contentStartY + (inline ? 6 : 22);
    doc.setFontSize(inline ? 6.5 : 8);
    legendItems.forEach((item) => {
      doc.setFillColor(...item.color);
      doc.rect(legendX, legendY - 3, 4, 4, "F");
      doc.setTextColor(...chartPalette.text);
      doc.text(item.label, legendX + 6, legendY);
      legendX += doc.getTextWidth(item.label) + (inline ? 12 : 22);
    });
    doc.setTextColor(0);

    const chartX = 18;
    const chartY = legendY + 6;
    const chartW = pageWidth - 36;
    const availableHeight =
      pageHeight - chartY - (includeMetricsTable ? 48 : 18);
    const chartH = inline
      ? Math.max(26, Math.min(42, availableHeight))
      : Math.min(95, pageHeight - 100);
    const yTicks = 5;
    const allValues = numericMetrics.flatMap((m) => [
      m.min,
      m.avg,
      m.student,
      m.max,
    ]);
    const rawMax = Math.max(...allValues, 10);
    const yMax = Math.ceil(rawMax / 2) * 2;

    doc.setDrawColor(...chartPalette.axis);
    doc.line(chartX, chartY, chartX, chartY + chartH);
    doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

    doc.setFontSize(inline ? 6.5 : 8);
    for (let tick = 0; tick <= yTicks; tick++) {
      const y = chartY + chartH - (tick / yTicks) * chartH;
      const value = (tick / yTicks) * yMax;
      doc.setDrawColor(...chartPalette.grid);
      doc.line(chartX, y, chartX + chartW, y);
      doc.setTextColor(...chartPalette.text);
      doc.text(formatGradeValue(value), chartX - 2, y + 1, { align: "right" });
    }
    doc.setTextColor(0);

    const groupCount = numericMetrics.length;
    const groupWidth = chartW / groupCount;
    const innerGroupWidth = groupWidth * 0.8;
    const barWidth = Math.max(2.5, Math.min(7, innerGroupWidth / 5));
    const barGap = (innerGroupWidth - 4 * barWidth) / 3;
    const labelAsIndex = groupCount > 7;

    numericMetrics.forEach((metric, idx) => {
      const groupStartX =
        chartX + idx * groupWidth + (groupWidth - innerGroupWidth) / 2;
      const bars = [
        { value: metric.min, color: chartPalette.min },
        { value: metric.avg, color: chartPalette.avg },
        { value: metric.student, color: chartPalette.student },
        { value: metric.max, color: chartPalette.max },
      ];

      bars.forEach((bar, barIndex) => {
        const height = yMax > 0 ? (bar.value / yMax) * chartH : 0;
        const x = groupStartX + barIndex * (barWidth + barGap);
        const y = chartY + chartH - height;
        doc.setFillColor(...bar.color);
        doc.rect(x, y, barWidth, height, "F");
      });

      const displayLabel = labelAsIndex
        ? `#${idx + 1}`
        : String(metric.label).slice(0, 12);
      doc.setFontSize(inline ? 6 : 7);
      doc.setTextColor(...chartPalette.text);
      doc.text(
        displayLabel,
        groupStartX + innerGroupWidth / 2,
        chartY + chartH + 5,
        {
          align: "center",
        },
      );
    });
    doc.setTextColor(0);

    if (!includeMetricsTable) {
      return chartY + chartH + 8;
    }

    const tableStartY = chartY + chartH + 10;
    const tableBody = numericMetrics.map((metric, index) => [
      `#${index + 1}`,
      metric.label,
      formatGradeValue(metric.min),
      formatGradeValue(metric.avg),
      formatGradeValue(metric.student),
      formatGradeValue(metric.max),
    ]);

    doc.autoTable({
      startY: tableStartY,
      head: [["Ref.", "Indicador", "Menor", "Média Sala", "Aluno", "Maior"]],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: chartPalette.tableHead },
      alternateRowStyles: { fillColor: chartPalette.tableAlt },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { cellWidth: "auto" },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "center", cellWidth: 20, fontStyle: "bold" },
        5: { halign: "center", cellWidth: 20 },
      },
    });

    return doc.autoTable.previous.finalY;
  };

  const getContrastColor = (hexcolor) => {
    if (!hexcolor) return "#000000";
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) {
      hexcolor = hexcolor
        .split("")
        .map((char) => char + char)
        .join("");
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#FFFFFF";
  };

  const applyThemeColor = (hexColor) => {
    if (!tinycolor) {
      console.error("Biblioteca TinyColor não carregada.");
      return;
    }
    const dark = tinycolor(hexColor).darken(10).toString();
    const light = tinycolor(hexColor).lighten(35).toString();
    const hoverDark = tinycolor(hexColor).setAlpha(0.2).toRgbString();

    document.documentElement.style.setProperty("--theme-color", hexColor);
    document.documentElement.style.setProperty("--theme-color-dark", dark);
    document.documentElement.style.setProperty("--theme-color-light", light);
    document.documentElement.style.setProperty(
      "--theme-color-hover-dark",
      hoverDark,
    );
  };

  const applyAppearance = () => {
    document.body.dataset.theme = state.settings.theme;
    applyThemeColor(state.settings.color);
  };

  const getSidebarCollapsedPreference = () => {
    if (state?.settings?.sidebarCollapsed !== undefined)
      return Boolean(state.settings.sidebarCollapsed);
    return localStorage.getItem("actEducacao_sidebarCollapsed") === "true";
  };

  let sidebarHoverTooltipEl = null;

  const ensureSidebarHoverTooltip = () => {
    if (
      sidebarHoverTooltipEl &&
      document.body.contains(sidebarHoverTooltipEl)
    ) {
      return sidebarHoverTooltipEl;
    }

    sidebarHoverTooltipEl = document.createElement("div");
    sidebarHoverTooltipEl.className = "sidebar-hover-tooltip";
    document.body.appendChild(sidebarHoverTooltipEl);
    return sidebarHoverTooltipEl;
  };

  const hideSidebarHoverTooltip = () => {
    const tooltip = ensureSidebarHoverTooltip();
    tooltip.classList.remove("visible");
  };

  const showSidebarHoverTooltip = (item) => {
    if (!body.classList.contains("sidebar-collapsed")) return;

    const label =
      item?.dataset?.tooltip ||
      item?.title ||
      item?.querySelector("span")?.textContent?.trim();
    if (!label) return;

    const tooltip = ensureSidebarHoverTooltip();
    tooltip.textContent = label;

    const itemRect = item.getBoundingClientRect();
    const spacing = 10;
    const top = itemRect.top + itemRect.height / 2;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${itemRect.right + spacing}px`;
    tooltip.classList.add("visible");

    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth - 8) {
      const fallbackLeft = Math.max(
        8,
        itemRect.left - tooltipRect.width - spacing,
      );
      tooltip.style.left = `${fallbackLeft}px`;
    }
  };

  const applySidebarCollapsedState = () => {
    const isCollapsed = getSidebarCollapsedPreference();
    body.classList.toggle("sidebar-collapsed", isCollapsed);

    if (!isCollapsed) {
      hideSidebarHoverTooltip();
    }

    if (!sidebarToggleBtn) return;

    const icon = sidebarToggleBtn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-angles-left", !isCollapsed);
      icon.classList.toggle("fa-angles-right", isCollapsed);
    }

    sidebarToggleBtn.title = isCollapsed ? "Expandir barra" : "Recolher barra";
    sidebarToggleBtn.dataset.tooltip = sidebarToggleBtn.title;
  };

  const initializeSidebarToggleTooltip = () => {
    if (!sidebarToggleBtn || sidebarToggleBtn.dataset.tooltipBound === "true") {
      return;
    }

    sidebarToggleBtn.addEventListener("mouseenter", () =>
      showSidebarHoverTooltip(sidebarToggleBtn),
    );
    sidebarToggleBtn.addEventListener("mouseleave", hideSidebarHoverTooltip);
    sidebarToggleBtn.addEventListener("click", hideSidebarHoverTooltip);
    sidebarToggleBtn.dataset.tooltipBound = "true";
  };

  const initializeSidebarItemTitles = () => {
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      const label = item.querySelector("span")?.textContent?.trim();
      if (label) {
        item.title = label;
        item.dataset.tooltip = label;
      }

      if (item.dataset.tooltipBound === "true") return;

      item.addEventListener("mouseenter", () => showSidebarHoverTooltip(item));
      item.addEventListener("mouseleave", hideSidebarHoverTooltip);
      item.addEventListener("click", hideSidebarHoverTooltip);
      item.dataset.tooltipBound = "true";
    });

    window.addEventListener("scroll", hideSidebarHoverTooltip, true);
    window.addEventListener("resize", hideSidebarHoverTooltip);
  };

  const toggleSidebarCollapsedState = () => {
    if (!state.settings) state.settings = {};
    state.settings.sidebarCollapsed = !getSidebarCollapsedPreference();
    localStorage.setItem(
      "actEducacao_sidebarCollapsed",
      String(state.settings.sidebarCollapsed),
    );
    applySidebarCollapsedState();
    saveData();
  };

  const getCurrentTerm = (schoolCalendar, dateToCheck = new Date()) => {
    if (!schoolCalendar || !schoolCalendar.terms) return null;
    // Usa a data fornecida para a verificação, não mais 'hoje' fixo
    const checkDateStr = dateToCheck.toISOString().split("T")[0];
    return schoolCalendar.terms.find(
      (term) =>
        term.startDate &&
        term.endDate &&
        checkDateStr >= term.startDate &&
        checkDateStr <= term.endDate,
    );
  };

  // ++ NOVO HELPER ++
  const getDefinitiveGrade = (studentId, courseId, termKey) => {
    const adjustmentKey = `${studentId}_${courseId}_${termKey}`;
    const adjustment = state.gradesAdjustments[adjustmentKey];
    if (adjustment !== undefined && adjustment !== null && adjustment !== "") {
      return parseGradeNumericValue(adjustment);
    }
    const averageKey = `${studentId}_${courseId}_${termKey}`;
    const average = state.calculatedAverages[averageKey];
    if (average !== undefined && average !== null) {
      return parseGradeNumericValue(average);
    }
    return null;
  };

  /**
   * NOVO HELPER: Calcula o resultado final completo de um aluno em um curso.
   * Esta função centraliza a lógica da média final, frequência, ajuste do conselho e situação.
   * CORRIGIDO: Agora verifica se há uma situação manual salva no state.
   * @param {string} studentId - O ID do aluno.
   * @param {object} course - O objeto do curso.
   * @returns {object} Um objeto com { calculatedFinalAverage, finalGrade, yearlyFrequency, situation, situationClass }.
   */
  const getFinalResult = (studentId, course) => {
    const schoolCalendar = state.calendars[course.schoolId];
    if (!schoolCalendar || !schoolCalendar.terms) {
      return {
        calculatedFinalAverage: null,
        finalGrade: null,
        yearlyFrequency: 0,
        situation: "Pendente",
        situationClass: "text-secondary",
      };
    }

    // 1. Calcula a média aritmética de todos os períodos com notas previamente arredondadas
    const terms = schoolCalendar.terms.filter((t) => t.startDate && t.endDate);
    let sumOfGrades = 0;
    let countOfGrades = 0;
    terms.forEach((term) => {
      const termKey = `${term.startDate}|${term.endDate}`;
      const grade = getDefinitiveGrade(studentId, course.id, termKey);
      if (grade !== null) {
        const roundedGrade = roundGradeValue(grade);
        if (roundedGrade === null) return;
        sumOfGrades += roundedGrade;
        countOfGrades++;
      }
    });
    const calculatedFinalAverageRaw =
      countOfGrades > 0 ? sumOfGrades / countOfGrades : null;
    const calculatedFinalAverage =
      calculatedFinalAverageRaw !== null
        ? roundGradeValue(calculatedFinalAverageRaw)
        : null;

    // 2. Obtém o ajuste do conselho, se houver
    const adjustmentKey = `${studentId}_${course.id}`;
    const councilAdjustment = state.finalAdjustments[adjustmentKey];
    const hasCouncilAdjustment =
      councilAdjustment !== undefined &&
      councilAdjustment !== null &&
      councilAdjustment !== "";

    // 3. Define qual nota será usada para determinar a aprovação
    // Se houver nota de conselho, ela prevalece sobre a média calculada para fins de nota final
    const councilAdjustmentValue = hasCouncilAdjustment
      ? parseGradeNumericValue(councilAdjustment)
      : null;
    const finalGrade = hasCouncilAdjustment
      ? roundGradeValue(councilAdjustmentValue)
      : calculatedFinalAverage;
    const finalGradeForStatus = hasCouncilAdjustment
      ? councilAdjustmentValue
      : calculatedFinalAverageRaw;

    // 4. Calcula a frequência anual usando dados consolidados de todas as turmas
    // Get all terms for consolidated attendance calculation
    const allTerms =
      schoolCalendar?.terms?.filter((t) => t.startDate && t.endDate) || [];
    const termStart =
      allTerms.length > 0
        ? allTerms[0].startDate
        : new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const termEnd =
      allTerms.length > 0
        ? allTerms[allTerms.length - 1].endDate
        : new Date(new Date().getFullYear(), 11, 31)
            .toISOString()
            .split("T")[0];

    const consolidatedYearlyData = calculateConsolidatedAttendance(
      studentId,
      course.subjectId,
      termStart,
      termEnd,
      course.schoolId,
    );
    const yearlyFrequency = consolidatedYearlyData.frequency;

    // 5. Determina a situação final com base nas regras padronizadas
    let situation = "Pendente";
    let situationClass = "text-secondary";

    if (finalGrade !== null && finalGradeForStatus !== null) {
      const hasPassingGrade = isBlueGrade(finalGradeForStatus);
      const hasPassingFrequency = yearlyFrequency >= 75;

      if (hasPassingGrade && hasPassingFrequency) {
        // Se passou em tudo
        // Verifica se foi salvo pelo conselho (Média calculada era ruim, mas tem nota de conselho que salvou)
        if (
          (calculatedFinalAverageRaw === null ||
            isRedGrade(calculatedFinalAverageRaw)) &&
          hasCouncilAdjustment
        ) {
          situation = "Aprovado pelo conselho";
        } else {
          situation = "Aprovado";
        }
        situationClass = "grade-success"; // Azul/Verde
      } else {
        // Casos de Reprovação/Retenção
        if (!hasPassingGrade && !hasPassingFrequency) {
          situation = "Retido por frequência e rendimento";
        } else if (!hasPassingGrade) {
          situation = "Retido por rendimento";
        } else if (!hasPassingFrequency) {
          situation = "Retido por frequência";
        }
        situationClass = "grade-danger"; // Vermelho
      }
    }

    // 6. [CORRE�!ÒO] Verifica se há uma situação manual salva (Override) e aplica
    const resultKey = `${studentId}_${course.id}`;
    if (
      state.finalResults &&
      state.finalResults[resultKey] &&
      state.finalResults[resultKey].situation
    ) {
      situation = state.finalResults[resultKey].situation;

      // Atualiza a classe de cor baseada na nova situação selecionada
      if (situation.includes("Aprov") || situation.includes("Ap.")) {
        situationClass = "grade-success";
      } else if (situation.includes("Ret") || situation.includes("Reprov")) {
        situationClass = "grade-danger";
      } else {
        situationClass = "text-secondary";
      }
    }

    return {
      calculatedFinalAverage,
      calculatedFinalAverageRaw,
      finalGrade,
      finalGradeForStatus,
      yearlyFrequency,
      situation,
      situationClass,
      councilAdjustment,
    };
  };

  // ++ NOVO HELPER ++
  // Calcula as faltas e a frequência para o ano letivo inteiro de um aluno em um curso.
  const getYearlyAttendance = (student, course) => {
    const schoolCalendar = state.calendars[course.schoolId];
    if (!schoolCalendar || !schoolCalendar.terms) {
      return {
        totalAbsences: 0,
        totalExcusedAbsences: 0,
        yearlyAbsencePercentage: 0,
      };
    }

    let totalAbsences = 0;
    let totalExcusedAbsences = 0;
    let totalClassesInYear = 0;

    const terms = schoolCalendar.terms.filter((t) => t.startDate && t.endDate);

    terms.forEach((term) => {
      const termAttendance = getTermAttendance(student, course, term);
      totalAbsences += termAttendance.absences;
      totalExcusedAbsences += termAttendance.excusedAbsences;
      totalClassesInYear += termAttendance.totalClassesInTerm || 0;
    });

    const yearlyAbsencePercentage =
      totalClassesInYear > 0 ? (totalAbsences / totalClassesInYear) * 100 : 0;

    return { totalAbsences, totalExcusedAbsences, yearlyAbsencePercentage };
  };

  // ++ NOVO HELPER ++
  const getTermAttendance = (student, course, term) => {
    // Cache para evitar recalcular multiplas vezes
    const cacheKey = `${student.id}_${course.id}_${term.startDate}_${term.endDate}`;
    if (state.termAttendanceCache && state.termAttendanceCache[cacheKey]) {
      return state.termAttendanceCache[cacheKey];
    }

    let absences = 0;
    let excusedAbsences = 0;
    let totalClassesInTerm = 0;

    let currentDate = new Date(`${term.startDate}T12:00:00`);
    const endDate = new Date(`${term.endDate}T12:00:00`);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split("T")[0];
      const preferredClassId = getStudentClassForDate(student, dateString);
      const classCandidates = getStudentClassCandidatesForDate(
        student,
        dateString,
      );

      const candidatesWithPeriods = classCandidates
        .map((classId) => ({
          classId,
          periods: getNumPeriodsForCourseDate(
            classId,
            course.subjectId,
            dateString,
          ),
        }))
        .filter((entry) => entry.periods > 0);

      let selectedClassEntry = null;
      if (preferredClassId) {
        selectedClassEntry = candidatesWithPeriods.find(
          (entry) => entry.classId === preferredClassId,
        );
      }

      if (!selectedClassEntry && candidatesWithPeriods.length > 0) {
        selectedClassEntry = candidatesWithPeriods.reduce((best, current) =>
          current.periods > best.periods ? current : best,
        );
      }

      const studentClassId = selectedClassEntry?.classId || preferredClassId;

      if (!studentClassId) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const studentClass = state.classes.find((c) => c.id === studentClassId);
      if (!studentClass) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const schoolCalendar = state.calendars[studentClass.schoolId];
      const importantDate = schoolCalendar?.importantDates?.find(
        (d) => d.date === dateString,
      );
      const isSchoolDay = importantDate ? importantDate.isSchoolDay : true;

      if (!isSchoolDay) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const numPeriods = selectedClassEntry
        ? selectedClassEntry.periods
        : getNumPeriodsForCourseDate(
            studentClassId,
            course.subjectId,
            dateString,
          );

      if (numPeriods <= 0) {
        const fallbackStatuses = getAttendanceStatusesForStudentOnDate(
          studentClassId,
          dateString,
          student.id,
        );

        if (fallbackStatuses.length > 0) {
          totalClassesInTerm += fallbackStatuses.length;
          fallbackStatuses.forEach((status) => {
            if (status === "absent") absences++;
            if (status === "excused") excusedAbsences++;
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      totalClassesInTerm += numPeriods;

      for (let i = 0; i < numPeriods; i++) {
        const attendanceData = getAttendanceForDate(
          studentClassId,
          course.subjectId,
          dateString,
          i,
        );
        const status = attendanceData[student.id];
        if (status === "absent") absences++;
        if (status === "excused") excusedAbsences++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const absencePercentage =
      totalClassesInTerm > 0 ? (absences / totalClassesInTerm) * 100 : 0;

    const result = {
      absences,
      excusedAbsences,
      absencePercentage,
      totalClassesInTerm,
    };

    // Armazena no cache
    if (!state.termAttendanceCache) {
      state.termAttendanceCache = {};
    }
    state.termAttendanceCache[cacheKey] = result;

    return result;
  };

  const renderPage = (pageId, params = {}) => {
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      let activePage = pageId;
      if (pageId === "manage-class") activePage = "classes";
      if (pageId === "teacher-notes" || pageId === "edit-note")
        activePage = "school-data";
      if (pageId === "tasks" || pageId === "notes") activePage = "organization"; // Remap to parent
      if (pageId === "releases") activePage = "releases";
      item.classList.toggle("active", item.dataset.page === activePage);
    });

    mainContent.innerHTML = "";
    let pageContent = "";

    switch (pageId) {
      case "dashboard":
        pageContent = renderDashboardPage(params);
        break;
      // LINHA ABAIXO CORRIGIDA para passar os parâmetros de data
      case "releases":
        pageContent = renderReleasesPage(params);
        break;
      case "classes":
        pageContent = renderClassesPage();
        break;
      case "manage-class":
        pageContent = renderManageClassPage(params.id);
        break;
      case "school-data":
        pageContent = renderSchoolDataPage(params);
        break;
      case "schedule-grid":
        pageContent = renderScheduleGridPage(params);
        break;
      case "diary":
        pageContent = renderDiaryPage();
        break;
      case "planning":
        pageContent = renderPlanningPage(params);
        break;
      case "organization":
        pageContent = renderOrganizationPage(params);
        break;
      case "reports":
        pageContent = renderReportsPage();
        break;
      case "teacher-notes":
        pageContent = renderTeacherNotesPage(params.teacherId);
        break;
      case "edit-note":
        pageContent = renderNoteEditorPage(params.noteId);
        break;
      default:
        pageContent = `<div class="card p-6 text-center">Página "${pageId}" não encontrada.</div>`;
    }

    mainContent.innerHTML = pageContent;
    attachPageEventListeners(pageId, params);
  };

  const renderGenericListPage = (
    title,
    placeholder,
    itemType,
    headers,
    items,
    itemKeys,
    emptyMessage,
  ) => {
    const tableRows = items
      .map(
        (item) => `
            <tr>
                ${itemKeys.map((key) => `<td>${item[key]}</td>`).join("")}
                <td class="text-right">
                    ${itemType === "teacher" ? `<button class="btn-view-notes text-indigo-500 hover:text-indigo-700 mr-2" data-id="${item.id}" title="Anotações do Professor"><i class="fas fa-book"></i></button>` : ""}
                    ${itemType === "teacher" ? `<button class="btn-view-schedule text-blue-500 hover:text-blue-700 mr-2" data-id="${item.id}" title="Ver Horário"><i class="fas fa-clock"></i></button>` : ""}
                    <button class="btn-edit text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${item.id}" data-type="${itemType}"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete text-red-500 hover:text-red-700" data-id="${item.id}" data-type="${itemType}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`,
      )
      .join("");
    return `<div class="card p-6"><h2 class="text-2xl font-bold mb-4">${title}</h2><div class="inline-add-form flex items-center gap-2 mb-6 p-4 rounded-lg" style="background-color: var(--bg-primary); border: 1px solid var(--border-color);"><input type="text" id="inline-add-input" class="w-full form-input" placeholder="${placeholder}"><button id="btn-inline-save" data-type="${itemType}" class="btn btn-primary flex-shrink-0"><i class="fas fa-plus mr-2"></i>Adicionar</button></div><div class="overflow-x-auto"><table class="min-w-full"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}<th class="text-right">Ações</th></tr></thead><tbody>${items.length > 0 ? tableRows : `<tr><td colspan="${headers.length + 1}" class="text-center py-4 text-secondary">${emptyMessage}</td></tr>`}</tbody></table></div></div>`;
  };

  /**
   * SUBSTITUÍDA: Coleta todos os eventos, agora incluindo o `className` para atividades.
   */
  const getAllEventsForMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const eventsByDate = {}; // Formato: { 'YYYY-MM-DD': [event1, event2] }

    const addEvent = (dateStr, event) => {
      if (!eventsByDate[dateStr]) {
        eventsByDate[dateStr] = [];
      }
      eventsByDate[dateStr].push(event);
    };

    // 1. Coletar eventos do calendário escolar
    for (const schoolId in state.calendars) {
      const school = state.schools.find((s) => s.id === schoolId);
      if (school && state.calendars[schoolId].importantDates) {
        state.calendars[schoolId].importantDates.forEach((d) => {
          const eventDate = new Date(d.date + "T12:00:00");
          if (
            eventDate.getFullYear() === year &&
            eventDate.getMonth() === month
          ) {
            addEvent(d.date, {
              type: "school",
              description: d.description,
              schoolName: school.name,
              isSchoolDay: d.isSchoolDay,
              color: "#FF9800", // Cor para eventos escolares
            });
          }
        });
      }
    }

    // 2. Coletar atividades em sala (homeworks) como eventos
    state.homeworks.forEach((hw) => {
      const dueDate = new Date(hw.dueDate + "T12:00:00");
      if (dueDate.getFullYear() === year && dueDate.getMonth() === month) {
        const course = getUniqueCourses().find(
          (c) => c.classId === hw.classId && c.subjectId === hw.subjectId,
        );
        if (course) {
          const className =
            state.classes.find((c) => c.id === hw.classId)?.name || ""; // Pega o nome da turma
          addEvent(hw.dueDate, {
            type: "homework",
            description: hw.description,
            courseName: course.name, // Nome completo: "Turma - Disciplina"
            className: className, // <-- NOVO: Apenas o nome da turma
            color:
              state.classes.find((c) => c.id === hw.classId)?.color ||
              "#2196F3",
          });
        }
      }
    });

    // 3. Coletar tarefas com data de entrega
    state.tasks.forEach((task) => {
      if (task.dueDate && task.status !== "concluido" && !task.isArchived) {
        const dueDate = new Date(task.dueDate + "T12:00:00");
        if (dueDate.getFullYear() === year && dueDate.getMonth() === month) {
          addEvent(task.dueDate, {
            type: "task",
            description: task.title,
            priority: task.priority,
            color: "#673AB7", // Roxo para tarefas
          });
        }
      }
    });

    return eventsByDate;
  };

  const renderDashboardPage = (params = {}) => {
    const displayDate = params.date ? new Date(params.date) : new Date();
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const eventsOfMonth = getAllEventsForMonth(displayDate);

    // --- Lógica para o Carrossel da Semana ---
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 (Dom) - 6 (Sáb)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - currentDayOfWeek);

    const weekEvents = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dateStr = day.toISOString().split("T")[0];
      const allEvents = getAllEventsForMonth(day);
      if (allEvents[dateStr]) {
        allEvents[dateStr].forEach((event) => {
          weekEvents.push({ date: day, ...event });
        });
      }
    }

    const carouselCardsHtml = weekEvents
      .map((event) => {
        // NOVO: Adiciona o atributo data-date para identificar o dia do card.
        const dateStr = event.date.toISOString().split("T")[0];
        return `
            <div class="week-event-card card p-4 flex-shrink-0 w-64" data-date="${dateStr}">
                <div class="flex items-center mb-2">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3" style="background-color: ${event.color}20; color: ${event.color};">
                        <i class="fas ${event.type === "school" ? "fa-school" : event.type === "task" ? "fa-tasks" : "fa-clipboard-list"}"></i>
                    </div>
                    <div>
                        <p class="font-bold text-sm">${dayNames[event.date.getDay()]}, ${event.date.getDate()}</p>
                        <p class="text-xs text-secondary">${event.type === "school" ? event.schoolName : event.type === "task" ? `Prioridade: ${event.priority}` : event.courseName}</p>
                    </div>
                </div>
                <p class="text-sm text-primary">${event.description}</p>
            </div>
        `;
      })
      .join("");

    const carouselHtml =
      weekEvents.length > 0
        ? `
        <div class="week-carousel-wrapper">
            <div class="week-carousel flex gap-4 pb-4 overflow-x-auto">
                ${carouselCardsHtml}
            </div>
            <button id="carousel-prev" class="carousel-arrow"><i class="fas fa-chevron-left"></i></button>
            <button id="carousel-next" class="carousel-arrow"><i class="fas fa-chevron-right"></i></button>
        </div>
    `
        : `
        <div class="card p-6 text-center text-secondary">
            <i class="fas fa-calendar-check fa-2x mb-3"></i>
            <p>Nenhum evento para esta semana.</p>
        </div>
    `;

    // --- Lógica para o Calendário Mensal ---
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = firstDayOfMonth.getDay();

    let calendarHtml =
      '<table class="calendar-grid w-full"><thead><tr class="calendar-header">';
    dayNames.forEach((day) => (calendarHtml += `<th>${day}</th>`));
    calendarHtml += "</tr></thead><tbody><tr>";

    for (let i = 0; i < startingDay; i++) {
      calendarHtml += "<td></td>";
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isToday = currentDate.toDateString() === new Date().toDateString();
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayEvents = eventsOfMonth[dateStr] || [];

      calendarHtml += `<td class="calendar-day ${isToday ? "is-today" : ""}">`;
      calendarHtml += `<div class="day-number">${day}</div>`;

      dayEvents.forEach((event) => {
        event.date = dateStr;
        const eventClass = `event-${event.type}`;
        const eventData = JSON.stringify(event).replace(/'/g, "&apos;");

        let displayText = event.description;
        let eventTitle = event.description;

        if (event.type === "homework") {
          if (event.className) {
            displayText = `<strong>${event.className}</strong> - ${event.description}`;
          }
          if (event.courseName) {
            eventTitle = `${event.courseName}: ${event.description}`;
          }
        } else if (event.type === "task") {
          displayText = `<strong>Tarefa:</strong> ${event.description}`;
          eventTitle = `Tarefa: ${event.description} (Prioridade: ${event.priority})`;
        } else if (event.type === "school" && event.schoolName) {
          eventTitle = `${event.schoolName}: ${event.description}`;
        }

        calendarHtml += `
                <div class="calendar-event ${eventClass}" 
                     style="border-left-color: ${event.color}" 
                     title="${eventTitle}" 
                     data-event='${eventData}'>
                    ${displayText}
                </div>
            `;
      });
      calendarHtml += "</td>";

      if ((startingDay + day) % 7 === 0) {
        calendarHtml += "</tr><tr>";
      }
    }

    let remainingCells = (7 - ((startingDay + daysInMonth) % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      calendarHtml += "<td></td>";
    }

    calendarHtml += "</tr></tbody></table>";

    const prevMonth = new Date(displayDate);
    prevMonth.setMonth(displayDate.getMonth() - 1);
    const nextMonth = new Date(displayDate);
    nextMonth.setMonth(displayDate.getMonth() + 1);

    return `
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-bold">Eventos da Semana</h2>
                ${carouselHtml}
            </div>
            
            <div class="card p-4">
                <div class="calendar-nav flex justify-between items-center mb-4 px-2">
                    <h3 class="text-xl font-bold">${monthNames[month]} de ${year}</h3>
                    <div class="flex items-center gap-2">
                        <button id="btn-prev-month" class="btn btn-subtle" data-date="${prevMonth.toISOString()}"><i class="fas fa-chevron-left mr-2"></i>Mês anterior</button>
                        <button id="btn-today" class="btn btn-subtle">Hoje</button>
                        <button id="btn-next-month" class="btn btn-subtle" data-date="${nextMonth.toISOString()}">Próximo mês<i class="fas fa-chevron-right ml-2"></i></button>
                    </div>
                </div>
                ${calendarHtml}
            </div>
        </div>
    `;
  };

  /**
   * SUBSTITUÍDA: Abre um modal com os detalhes de um evento do calendário.
   * (Versão com título e estilo atualizados).
   */
  const openEventDetailsModal = (event) => {
    let title = "Detalhes do Evento";
    let descriptionLabel = "Descrição:";
    let referenceLabel = "";
    let referenceValue = "";

    if (event.type === "school") {
      title = "Evento do Calendário Escolar";
      referenceLabel = "Escola:";
      referenceValue = event.schoolName;
    } else if (event.type === "homework") {
      title = event.courseName || "Detalhes da Atividade";
      descriptionLabel = "Atividade:";
      referenceLabel = "Referente a:";
      referenceValue = event.courseName;
    } else if (event.type === "task") {
      title = "Detalhes da Tarefa";
      descriptionLabel = "Tarefa:";
      referenceLabel = "Prioridade:";
      referenceValue = event.priority
        ? event.priority.charAt(0).toUpperCase() + event.priority.slice(1)
        : "Não definida";
    }

    const date = new Date(event.date + "T12:00:00").toLocaleDateString(
      "pt-BR",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    const detailsHtml = `
            <div class="swal-modern-form text-left">
                <div class="swal-modal-details" style="border-left-color: ${event.color || "var(--theme-color)"};">
                    <div class="swal-modern-input-group">
                        <strong class="swal-modern-label">Data:</strong>
                        <p>${date}</p>
                    </div>
                    <div class="swal-modern-input-group">
                        <strong class="swal-modern-label">${descriptionLabel}</strong>
                        <p class="swal-event-description">${event.description}</p>
                    </div>
                    ${
                      referenceLabel && referenceValue
                        ? `
                    <div class="swal-modern-input-group">
                        <strong class="swal-modern-label">${referenceLabel}</strong>
                        <p>${referenceValue}</p>
                    </div>
                    `
                        : ""
                    }
                </div>
            </div>
        `;

    CustomSwal.fire({
      title: title,
      html: detailsHtml,
      showConfirmButton: false,
      showCloseButton: true,
    });
  };

  const getUpcomingHomework = () => {
    const today = new Date().toISOString().split("T")[0];

    return state.homeworks
      .filter((hw) => hw.dueDate >= today)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 10)
      .map((hw) => {
        const course = getUniqueCourses().find(
          (c) => c.classId === hw.classId && c.subjectId === hw.subjectId,
        );
        return { ...hw, courseName: course ? course.name : "Turma/Disciplina" };
      });
  };

  const getUpcomingTasks = () => {
    const priorityOrder = { alta: 1, media: 2, baixa: 3 };
    return state.tasks
      .filter((task) => task.status !== "concluido" && !task.isArchived)
      .sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate) : Infinity;
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 10);
  };

  const renderClassesPage = () => {
    const classCards = state.classes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const school = state.schools.find((s) => s.id === c.schoolId);
        const studentCount = state.students.filter(
          (s) => s.classId === c.id && s.status === "ativo",
        ).length;
        const defaultColor = "#cccccc";
        return `
            <div class="class-card card flex flex-col" style="border-left: 5px solid ${c.color || defaultColor};">
                <div class="flex-grow mb-4">
                    <h3 class="text-lg font-bold truncate" title="${c.name}">${c.name}</h3>
                    <p class="text-sm text-secondary truncate" title="${school?.name || "Sem escola"}">${school?.name || "Sem escola"}</p>
                    <p class="text-sm text-secondary mt-1">${studentCount} aluno(s) ativo(s)</p>
                </div>
                <div class="border-t border-[var(--border-color)] pt-3 -mx-4 px-4">
                    <div class="flex items-center justify-end space-x-2">
                        <button class="btn-export-single-class p-2 text-[var(--theme-color)] hover:text-[var(--theme-color-dark)]" data-id="${c.id}" title="Exportar Turma"><i class="fas fa-file-export fa-fw"></i></button>
                        <button class="btn-manage-class p-2 text-secondary hover:text-primary" data-id="${c.id}" title="Gerenciar Turma"><i class="fas fa-cog fa-fw"></i></button>
                        <button class="btn-edit-class p-2 text-[var(--theme-color)] hover:text-[var(--theme-color-dark)]" data-id="${c.id}" title="Editar Turma"><i class="fas fa-edit fa-fw"></i></button>
                        <button class="btn-delete-class p-2 text-red-500 hover:text-red-700" data-id="${c.id}" title="Excluir Turma"><i class="fas fa-trash fa-fw"></i></button>
                    </div>
                </div>
            </div>`;
      })
      .join("");
    return `<div class="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h2 class="text-2xl font-bold">Turmas</h2>
                <div class="flex items-center gap-2">
                    <button id="btn-export-classes" class="btn btn-subtle"><i class="fas fa-file-export mr-2"></i> Exportar para arquivo</button>
                    <button id="btn-add-class" class="btn btn-primary"><i class="fas fa-plus mr-2"></i> Nova Turma</button>
                </div>
            </div>
            ${state.classes.length > 0 ? `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">${classCards}</div>` : `<div class="card p-6 text-center text-secondary">Nenhuma turma cadastrada.</div>`}`;
  };

  const renderManageClassPage = (classId) => {
    const cls = state.classes.find((c) => c.id === classId);
    if (!cls) return `<p>Turma não encontrada.</p>`;

    const studentsInClass = state.students.filter((s) => s.classId === classId);

    const remanejadosFromClass = state.students
      .map((student) => {
        if (student.classId === classId) return null;

        const movements = Array.isArray(student.classMovements)
          ? student.classMovements
              .filter(
                (movement) =>
                  movement?.type === "remanejamento" &&
                  movement?.fromClassId === classId,
              )
              .sort((a, b) => (a.date < b.date ? 1 : -1))
          : [];

        if (movements.length === 0) return null;

        return {
          ...student,
          __isRemanejadoOrigem: true,
          __originMovement: movements[0],
        };
      })
      .filter(Boolean);

    const students = [...studentsInClass].sort(
      (a, b) =>
        (a.number || 999) - (b.number || 999) || a.name.localeCompare(b.name),
    );

    remanejadosFromClass
      .sort((a, b) => {
        const posA = Number(a.__originMovement?.fromPosition) || 999;
        const posB = Number(b.__originMovement?.fromPosition) || 999;
        return posA - posB || a.name.localeCompare(b.name);
      })
      .forEach((student) => {
        const originalPosition = Number(student.__originMovement?.fromPosition);
        if (Number.isFinite(originalPosition) && originalPosition > 0) {
          const insertIndex = Math.min(
            Math.max(originalPosition - 1, 0),
            students.length,
          );
          students.splice(insertIndex, 0, student);
          return;
        }

        const originalNumber = Number(student.__originMovement?.fromNumber);
        if (Number.isFinite(originalNumber) && originalNumber > 0) {
          const insertIndex = students.findIndex((current) => {
            const currentNumber = current.__isRemanejadoOrigem
              ? Number(current.__originMovement?.fromNumber)
              : Number(current.number);
            return (
              Number.isFinite(currentNumber) && currentNumber > originalNumber
            );
          });

          if (insertIndex >= 0) {
            students.splice(insertIndex, 0, student);
          } else {
            students.push(student);
          }
          return;
        }

        students.push(student);
      });

    const studentRows =
      students
        .map((s) => {
          const isRemanejadoOrigem = !!s.__isRemanejadoOrigem;
          const destinationClass = isRemanejadoOrigem
            ? state.classes.find((c) => c.id === s.__originMovement?.toClassId)
            : null;
          const rowTooltip = isRemanejadoOrigem
            ? `Remanejado para ${destinationClass?.name || "outra turma"}`
            : "";

          const status = isRemanejadoOrigem
            ? "remanejado"
            : s.status || "ativo";
          const rowClass = status !== "ativo" ? "student-inactive" : "";
          const statusBadgeClass = `status-${status}`;
          const statusText = status.charAt(0).toUpperCase() + status.slice(1);
          const displayNumber = isRemanejadoOrigem
            ? (s.__originMovement?.fromNumber ?? "-")
            : s.number || "-";

          return `
            <tr class="${rowClass}" ${rowTooltip ? `title="${rowTooltip}"` : ""}>
                <td class="w-24">${displayNumber}</td>
                <td>
                    ${s.name}
                    ${isRemanejadoOrigem ? `<i class="fas fa-info-circle ml-2 text-secondary" title="${rowTooltip}"></i>` : ""}
                </td>
                <td>
                    ${s.ra || "-"}
                    ${s.ra && !isRemanejadoOrigem ? `<button class="btn-copy-ra ml-2 text-gray-400 hover:text-[var(--theme-color)] transition-colors" data-ra="${s.ra}" title="Copiar RA (sem hífen)"><i class="fas fa-copy"></i></button>` : ""}
                </td>
                <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                <td class="text-center">
                    <input type="checkbox" class="laudo-checkbox form-checkbox h-5 w-5 text-[var(--theme-color)] focus:ring-[var(--theme-color)]" data-student-id="${s.id}" ${s.hasLaudo ? "checked" : ""} ${isRemanejadoOrigem ? "disabled" : ""}>
                </td>
                <td class="text-right">
                    ${
                      isRemanejadoOrigem
                        ? `<span class="text-secondary">�</span>`
                        : `<button class="btn-edit-student text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${s.id}"><i class="fas fa-edit"></i></button>
                  <button class="btn-remanejar-student text-blue-500 hover:text-blue-700 mr-2" data-id="${s.id}" title="Remanejar Aluno"><i class="fas fa-right-left"></i></button>
                    <button class="btn-delete-student text-red-500 hover:text-red-700" data-id="${s.id}"><i class="fas fa-trash"></i></button>`
                    }
                </td>
            </tr>`;
        })
        .join("") ||
      `<tr><td colspan="6" class="text-center py-4 text-secondary">Nenhum aluno cadastrado.</td></tr>`;

    return `
        <div class="flex items-center mb-6">
            <button id="btn-back-to-classes" class="mr-4 text-xl hover:text-[var(--theme-color)]"><i class="fas fa-arrow-left"></i></button>
            <h2 class="text-2xl font-bold">Gerenciando: ${cls.name}</h2>
        </div>
        <div class="grid grid-cols-1 gap-6">
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Alunos (${students.length})</h3>
                    <div class="flex space-x-2">
                        <button id="btn-bulk-add-student" class="btn btn-subtle text-sm"><i class="fas fa-list-ol mr-2"></i> Adicionar em Massa</button>
                        <button id="btn-add-student" class="btn btn-primary text-sm"><i class="fas fa-plus mr-2"></i> Adicionar Aluno</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="w-24">Nº</th>
                                <th>Nome do Aluno</th>
                                <th>RA</th>
                                <th>Status</th>
                                <th class="text-center">Laudo</th>
                                <th class="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>${studentRows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
  };

  /**
   * NOVO: Renderiza a estrutura da aba de configuração de horários.
   */
  const renderSchedulesPage = () => {
    if (state.schools.length === 0) {
      return `<div class="card p-6 text-center">
                <h3 class="text-xl font-bold mb-2">Nenhuma Escola Cadastrada</h3>
                <p class="text-secondary">Por favor, cadastre uma escola na aba "Escolas" para configurar os horários.</p>
            </div>`;
    }

    const schoolOptions = state.schools
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join("");

    return `
        <div id="schedules-page-container">
            <div class="space-y-6">
                <div class="card p-6">
                    <label for="schedules-school-select" class="block text-lg font-bold mb-3">Selecione uma Escola para Configurar</label>
                    <select id="schedules-school-select" class="form-select">
                        <option value="">-- Selecione --</option>
                        ${schoolOptions}
                    </select>
                </div>
                <div id="schedule-config-container">
                    <p class="text-center text-secondary py-4">Selecione uma escola acima para editar os horários de aula (início/fim).</p>
                </div>
            </div>
        </div>`;
  };

  const renderSchoolNotesSettingsPage = () => {
    const minimumBlueGrade = getPassingGradeThreshold();
    const gradeDecimalPlaces = getGradeDecimalPlaces();
    const roundingMode = getGradeRoundingMode();

    return `
        <div class="card p-6 space-y-5">
          <div>
            <h3 class="text-xl font-bold">Notas</h3>
            <p class="text-secondary mt-1">Configure a nota mínima azul e como as médias devem ser arredondadas em todo o sistema.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label for="school-notes-min-blue" class="swal-modern-label">Nota mínima para azul</label>
              <input id="school-notes-min-blue" class="form-input" type="number" min="0" max="10" step="0.1" value="${minimumBlueGrade.toFixed(1)}">
            </div>
            <div>
              <label for="school-notes-decimals" class="swal-modern-label">Casas decimais padrão</label>
              <input id="school-notes-decimals" class="form-input" type="number" min="0" max="4" step="1" value="${gradeDecimalPlaces}">
            </div>
            <div>
              <label for="school-notes-rounding" class="swal-modern-label">Sistema de arredondamento</label>
              <select id="school-notes-rounding" class="form-select">
                <option value="real" ${roundingMode === "real" ? "selected" : ""}>Valor real (sem arredondar)</option>
                <option value="half" ${roundingMode === "half" ? "selected" : ""}>Meio ponto (0,0 ou 0,5)</option>
                <option value="integer" ${roundingMode === "integer" ? "selected" : ""}>Somente inteiro</option>
              </select>
            </div>
            <div class="text-secondary text-sm">
              <p><strong>Regra atual:</strong> notas &ge; ${minimumBlueGrade.toFixed(1)} ficam em azul e abaixo ficam em vermelho.</p>
              <p class="mt-1">As médias serão exibidas com ${gradeDecimalPlaces} casa(s) decimal(is), usando <strong>${roundingMode === "real" ? "valor real (sem arredondar)" : roundingMode === "half" ? "arredondamento de meio ponto (0,0 ou 0,5)" : "somente inteiro (ignora casas decimais)"}</strong>.</p>
            </div>
          </div>

          <div>
            <button id="btn-save-notes-settings" class="btn btn-primary"><i class="fas fa-save mr-2"></i>Salvar configuração</button>
          </div>
        </div>`;
  };

  const renderSchoolDataPage = (params = {}) => {
    const activeTab = params.tab || "schools";

    const getTabContent = (tabId) => {
      switch (tabId) {
        case "schools":
          return renderGenericListPage(
            "Escolas",
            "Nome da Escola",
            "school",
            ["Nome"],
            state.schools,
            ["name"],
            "Nenhuma escola cadastrada.",
          );
        case "teachers":
          return renderGenericListPage(
            "Professores",
            "Nome do Professor",
            "teacher",
            ["Nome"],
            state.teachers,
            ["name"],
            "Nenhum professor cadastrado.",
          );
        case "subjects":
          return renderGenericListPage(
            "Disciplinas",
            "Nome da Disciplina",
            "subject",
            ["Nome"],
            state.subjects,
            ["name"],
            "Nenhuma disciplina cadastrada.",
          );
        case "schedules":
          // Garante que a função existe antes de chamar
          return typeof renderSchedulesPage === "function"
            ? renderSchedulesPage()
            : "";
        case "calendar":
          // ALTERADO: Passando params para manter a escola selecionada
          return renderCalendarPage(params);
        case "notes":
          return renderSchoolNotesSettingsPage();
        default:
          return "";
      }
    };

    return `
            <div id="school-data-page-container">
                <h2 class="text-2xl font-bold mb-4">Dados da Escola</h2>
                <div class="border-b border-gray-200 dark:border-gray-700">
                    <nav id="school-data-tabs" class="flex space-x-4 -mb-px" aria-label="Tabs">
                        <button data-tab="schools" class="page-tab ${activeTab === "schools" ? "active" : ""}"><i class="fas fa-school fa-fw"></i>Escolas</button>
                        <button data-tab="teachers" class="page-tab ${activeTab === "teachers" ? "active" : ""}"><i class="fas fa-chalkboard-teacher fa-fw"></i>Professores</button>
                        <button data-tab="subjects" class="page-tab ${activeTab === "subjects" ? "active" : ""}"><i class="fas fa-book fa-fw"></i>Disciplinas</button>
                        <button data-tab="notes" class="page-tab ${activeTab === "notes" ? "active" : ""}"><i class="fas fa-percent fa-fw"></i>Notas</button>
                        <button data-tab="schedules" class="page-tab ${activeTab === "schedules" ? "active" : ""}"><i class="fas fa-clock fa-fw"></i>Config. Horários</button>
                        <button data-tab="calendar" class="page-tab ${activeTab === "calendar" ? "active" : ""}"><i class="fas fa-calendar-alt fa-fw"></i>Calendário</button>
                    </nav>
                </div>
                <div id="school-data-content" class="pt-6">
                    ${getTabContent(activeTab)}
                </div>
            </div>`;
  };

  const renderOrganizationPage = (params = {}) => {
    const activeTab = params.tab || "tasks";
    return `
        <div id="organization-page-container">
            <h2 class="text-2xl font-bold mb-4">Organização</h2>
            <div class="card p-6">
                <div class="border-b border-gray-200 dark:border-gray-700">
                    <nav id="organization-tabs" class="flex space-x-4 -mb-px" aria-label="Tabs">
                        <button data-tab="tasks" class="page-tab ${activeTab === "tasks" ? "active" : ""}">
                            <i class="fas fa-tasks fa-fw"></i>Tarefas
                        </button>
                        <button data-tab="notes" class="page-tab ${activeTab === "notes" ? "active" : ""}">
                            <i class="fas fa-sticky-note fa-fw"></i>Anotações
                        </button>
                    </nav>
                </div>
                <div id="organization-tab-content" class="pt-6">
                    </div>
            </div>
        </div>`;
  };

  const getPlanningTermsForClass = (classId) => {
    if (!classId) return [];
    const selectedClass = state.classes.find((c) => c.id === classId);
    if (!selectedClass) return [];

    const schoolCalendar = state.calendars[selectedClass.schoolId];
    const termTypeLabel =
      schoolCalendar?.termType === "trimestre" ? "Trimestre" : "Bimestre";
    const validTerms = (schoolCalendar?.terms || []).filter(
      (term) => term?.startDate && term?.endDate,
    );

    if (validTerms.length > 0) {
      return validTerms.map((term) => ({
        value: `${term.startDate}|${term.endDate}`,
        label: `${term.id}º ${termTypeLabel}`,
      }));
    }

    return [1, 2, 3, 4].map((termNumber) => ({
      value: `fallback-${termNumber}`,
      label: `${termNumber}º Bimestre`,
    }));
  };

  const getPlanningCompletionPercent = (planning) => {
    const themes = getPlanningThemes(planning);
    const total = themes.reduce(
      (sum, theme) => sum + getThemeLessons(theme).length,
      0,
    );
    if (total === 0) return 0;
    const completed = themes.reduce(
      (sum, theme) =>
        sum +
        getThemeLessons(theme).filter((lesson) => lesson.completed).length,
      0,
    );
    return Math.round((completed / total) * 100);
  };

  const normalizeAttachments = (attachments = []) => {
    return Array.isArray(attachments)
      ? attachments
          .map((attachment) => String(attachment || "").trim())
          .filter(Boolean)
      : [];
  };

  const getThemeLessons = (theme) => {
    if (!theme || typeof theme !== "object") return [];
    if (Array.isArray(theme.lessons)) return theme.lessons;
    if (Array.isArray(theme.subtopics)) return theme.subtopics;
    return [];
  };

  const getPlanningThemes = (planning) => {
    if (!planning || typeof planning !== "object") return [];

    if (Array.isArray(planning.themes) && planning.themes.length > 0) {
      return planning.themes;
    }

    if (Array.isArray(planning.subtopics) && planning.subtopics.length > 0) {
      return [
        {
          title: planning.title || "Tema 01",
          lessons: planning.subtopics,
        },
      ];
    }

    return [];
  };

  const getThemeCompletionPercent = (theme) => {
    const lessons = getThemeLessons(theme);
    if (lessons.length === 0) return 0;
    const completed = lessons.filter((lesson) => lesson.completed).length;
    return Math.round((completed / lessons.length) * 100);
  };

  const clonePlanningThemes = (planning) => {
    return getPlanningThemes(planning).map((theme) => ({
      title: theme.title || "Sem título",
      lessons: getThemeLessons(theme).map((lesson) => ({
        title: lesson.title || "Sem título",
        completed: Boolean(lesson.completed),
        attachments: normalizeAttachments(
          lesson.attachments || lesson.subsubtopics || [],
        ),
      })),
    }));
  };

  const getPlanningTemplates = () => {
    return (state.planningTemplates || [])
      .filter((planning) => planning && planning.id)
      .sort((a, b) => {
        const aOrder = Number.isFinite(a.order)
          ? a.order
          : Number.POSITIVE_INFINITY;
        const bOrder = Number.isFinite(b.order)
          ? b.order
          : Number.POSITIVE_INFINITY;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });
  };

  const findPlanningRecordById = (planningId) => {
    return (
      (state.plannings || []).find((item) => item.id === planningId) ||
      (state.planningTemplates || []).find((item) => item.id === planningId) ||
      null
    );
  };

  const getPlanningAssociationForClass = (classId, termKey = "") => {
    const associations = state.planningAssociations || [];
    const normalizedTermKey = String(termKey || "").trim();

    // Cada bimestre é independente: quando um período específico é
    // informado, o vínculo só pode valer para aquele período exato (sem
    // herdar o planejamento de outros bimestres da mesma turma).
    if (normalizedTermKey) {
      return (
        associations.find(
          (item) =>
            item.classId === classId &&
            String(item.termKey || "").trim() === normalizedTermKey,
        ) || null
      );
    }

    // Sem período informado: usado apenas como indicativo geral (ex.: dica
    // de "já associado" no seletor de turmas), sem precisão por bimestre.
    return associations.find((item) => item.classId === classId) || null;
  };

  const getAssociatedPlanningForClass = (classId, termKey = "") => {
    const association = getPlanningAssociationForClass(classId, termKey);
    if (!association) return null;
    return (
      (state.planningTemplates || []).find(
        (t) => t.id === association.planningId,
      ) || null
    );
  };

  const getClassesAssociatedToPlanning = (planningId) => {
    return (state.planningAssociations || [])
      .filter((association) => association.planningId === planningId)
      .map((association) =>
        state.classes.find((cls) => cls.id === association.classId),
      )
      .filter(Boolean);
  };

  const normalizePlanningLabelInput = (value, type) => {
    const normalized = String(value || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!normalized) return "";

    const pattern =
      type === "tema" ? /^tema\s*\d*\s*[:.-]?\s*/i : /^aula\s*\d*\s*[:.-]?\s*/i;

    const cleaned = normalized.replace(pattern, "").trim();
    return cleaned || normalized;
  };

  const renderPlanningPage = (params = {}) => {
    const planningItems = getPlanningTemplates();
    const selectedPlanningId = params.planningId || "all";
    const openPlanningIds = new Set(
      Array.isArray(params.openPlanningIds) ? params.openPlanningIds : [],
    );
    if (params.openPlanningId) openPlanningIds.add(params.openPlanningId);

    const openThemeKeys = new Set(
      Array.isArray(params.openThemeKeys) ? params.openThemeKeys : [],
    );
    if (params.openThemeKey) openThemeKeys.add(params.openThemeKey);

    const openAttachmentPanelKeys = new Set(
      Array.isArray(params.openAttachmentPanelKeys)
        ? params.openAttachmentPanelKeys
        : [],
    );
    if (params.openAttachmentPanelKey) {
      openAttachmentPanelKeys.add(params.openAttachmentPanelKey);
    }

    const planningOptionsHtml = planningItems
      .map(
        (planning, planningIndex) =>
          `<option value="${planning.id}" ${selectedPlanningId === planning.id ? "selected" : ""}>${escapeHtml(planning.title || `Planejamento ${String(planningIndex + 1).padStart(2, "0")}`)}</option>`,
      )
      .join("");

    const filteredPlanningItems =
      selectedPlanningId === "all"
        ? planningItems
        : planningItems.filter(
            (planning) => planning.id === selectedPlanningId,
          );

    const planningCardsHtml = filteredPlanningItems
      .map((planning, planningIndex) => {
        const openAttribute = openPlanningIds.has(planning.id) ? "open" : "";
        const themes = getPlanningThemes(planning);
        const themesHtml = themes.length
          ? themes
              .map((theme, themeIndex) => {
                const lessons = getThemeLessons(theme);
                const themeCompletion = getThemeCompletionPercent(theme);
                const themeOpenAttribute = openThemeKeys.has(
                  `${planning.id}::${themeIndex}`,
                )
                  ? "open"
                  : "";
                const lessonsHtml = lessons.length
                  ? lessons
                      .map((lesson, lessonIndex) => {
                        const attachmentCount = normalizeAttachments(
                          lesson.attachments || lesson.subsubtopics || [],
                        ).length;
                        const lessonPanelKey = `${planning.id}-${themeIndex}-${lessonIndex}`;
                        const lessonPanelOpenClass =
                          openAttachmentPanelKeys.has(lessonPanelKey)
                            ? " open"
                            : "";
                        return `
                          <li class="planning-subtopic planning-subtopic-draggable" draggable="true" data-planning-id="${planning.id}" data-subtopic-id="${lessonPanelKey}" data-theme-index="${themeIndex}" data-lesson-index="${lessonIndex}">
                            <div class="planning-subtopic-main">
                              <span class="planning-drag-handle" title="Arrastar aula"><i class="fas fa-grip-vertical"></i></span>
                              <button type="button" class="planning-subtopic-title-btn">Aula ${String(lessonIndex + 1).padStart(2, "0")}: ${escapeHtml(lesson.title || "Sem título")} <span class="planning-subtopic-meta">(${attachmentCount} ${attachmentCount === 1 ? "anexo" : "anexos"})</span></button>
                              <span class="planning-subtopic-actions">
                                <button type="button" class="btn-edit-planning-lesson btn btn-subtle" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" data-lesson-index="${lessonIndex}" title="Editar aula"><i class="fas fa-pen"></i></button>
                                <button type="button" class="btn-delete-planning-lesson btn btn-danger" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" data-lesson-index="${lessonIndex}" title="Excluir aula"><i class="fas fa-trash"></i></button>
                              </span>
                            </div>
                            <div class="planning-attachments-panel${lessonPanelOpenClass}">
                              ${
                                (
                                  lesson.attachments ||
                                  lesson.subsubtopics ||
                                  []
                                ).length > 0
                                  ? `<ul class="planning-subsubtopics-list mt-3">${normalizeAttachments(
                                      lesson.attachments ||
                                        lesson.subsubtopics ||
                                        [],
                                    )
                                      .map(
                                        (attachment, attachmentIndex) =>
                                          `<li class="planning-subsubtopic-item"><span>${attachmentIndex + 1}. ${escapeHtml(attachment)}</span><span class="planning-subsubtopic-actions"><button type="button" class="btn-edit-attachment btn btn-subtle" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" data-lesson-index="${lessonIndex}" data-index="${attachmentIndex}" title="Editar anexo"><i class="fas fa-pen"></i></button><button type="button" class="btn-delete-attachment btn btn-danger" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" data-lesson-index="${lessonIndex}" data-index="${attachmentIndex}" title="Excluir anexo"><i class="fas fa-trash"></i></button></span></li>`,
                                      )
                                      .join("")}</ul>`
                                  : '<p class="text-xs text-secondary mt-3">Nenhum anexo cadastrado.</p>'
                              }
                              <div class="planning-subsubtopic-input-wrap">
                                <input type="text" class="form-input planning-new-attachment-input" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" data-lesson-index="${lessonIndex}" placeholder="Novo anexo" />
                                <button type="button" class="btn btn-subtle btn-add-attachment-inline" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" data-lesson-index="${lessonIndex}">Adicionar anexo</button>
                              </div>
                            </div>
                          </li>
                        `;
                      })
                      .join("")
                  : '<li class="text-secondary">Nenhuma aula cadastrada.</li>';

                return `
                  <details class="planning-accordion-item" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" ${themeOpenAttribute}>
                    <summary>
                      <span><strong>Tema ${String(themeIndex + 1).padStart(2, "0")}: ${escapeHtml(theme.title || "Sem título")}</strong></span>
                      <span class="planning-progress-badge">${themeCompletion}% concluído</span>
                    </summary>
                    <div class="planning-body">
                      <ul class="planning-subtopics-list">${lessonsHtml}</ul>
                      <div class="planning-subtopic-input-wrap">
                        <input type="text" class="form-input planning-subtopic-input planning-new-lesson-input" data-planning-id="${planning.id}" data-theme-index="${themeIndex}" placeholder="Nova aula" />
                        <button type="button" class="btn btn-primary btn-add-planning-lesson-inline" data-planning-id="${planning.id}" data-theme-index="${themeIndex}"><i class="fas fa-plus mr-2"></i>Nova aula</button>
                      </div>
                      <div class="planning-item-actions mt-4">
                        <button type="button" class="btn btn-subtle btn-edit-planning-theme" data-planning-id="${planning.id}" data-theme-index="${themeIndex}">Editar tema</button>
                        <button type="button" class="btn btn-danger btn-delete-planning-theme" data-planning-id="${planning.id}" data-theme-index="${themeIndex}">Excluir tema</button>
                      </div>
                    </div>
                  </details>
                `;
              })
              .join("")
          : '<p class="text-secondary mb-4">Nenhum tema cadastrado.</p>';

        return `
          <details class="planning-accordion-item planning-item-draggable" draggable="true" data-planning-id="${planning.id}" ${openAttribute}>
            <summary>
              <span class="planning-summary-main">
                <span class="planning-drag-handle" title="Arrastar planejamento"><i class="fas fa-grip-vertical"></i></span>
                <span class="planning-title">${escapeHtml(planning.title || `Planejamento ${String(planningIndex + 1).padStart(2, "0")}`)}</span>
              </span>
              <span class="planning-summary-right">
                <span class="planning-progress-badge">${getPlanningCompletionPercent(planning)}% concluído</span>
                <button type="button" class="btn btn-subtle btn-associate-planning" data-planning-id="${planning.id}" title="Associar a turmas"><i class="fas fa-link"></i></button>
              </span>
            </summary>
            <div class="planning-body">
              <div class="planning-item-actions mb-4">
                <button type="button" class="btn btn-subtle btn-edit-planning" data-planning-id="${planning.id}"><i class="fas fa-pen mr-2"></i>Editar planejamento</button>
                <button type="button" class="btn btn-danger btn-delete-planning" data-planning-id="${planning.id}"><i class="fas fa-trash mr-2"></i>Excluir planejamento</button>
                <button type="button" class="btn btn-primary btn-add-planning-theme" data-planning-id="${planning.id}"><i class="fas fa-plus mr-2"></i>Novo tema</button>
              </div>
              <div class="planning-accordion">${themesHtml}</div>
            </div>
          </details>
        `;
      })
      .join("");

    return `
      <div id="planning-page-container" class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <h2 class="text-2xl font-bold">Planejamentos</h2>
          <div class="flex flex-wrap gap-2">
            <button id="btn-print-planning" class="btn btn-subtle" title="Imprimir por turma"><i class="fas fa-print"></i></button>
            <button id="btn-export-planning-json" class="btn btn-subtle" title="Exportar planejamentos em JSON"><i class="fas fa-file-export mr-2"></i>Exportar JSON</button>
            <button id="btn-import-planning-json" class="btn btn-subtle" title="Importar planejamentos em JSON"><i class="fas fa-file-import mr-2"></i>Importar JSON</button>
            <button id="btn-edit-vinculos" class="btn btn-subtle"><i class="fas fa-sitemap mr-2"></i>Editar vínculos</button>
            <button id="btn-add-planning" class="btn btn-primary"><i class="fas fa-plus mr-2"></i>Novo planejamento</button>
          </div>
        </div>
        <input id="planning-json-import-input" type="file" accept=".json,application/json" hidden />
        <div class="card p-6 space-y-4">
          <div>
            <label for="planning-template-select" class="block text-sm font-medium mb-2">Planejamento</label>
            <select id="planning-template-select" class="form-select">
              <option value="all" ${selectedPlanningId === "all" ? "selected" : ""}>Todos os planejamentos</option>
              ${planningOptionsHtml}
            </select>
          </div>
          <p class="text-sm font-medium text-secondary">Banco de planejamentos independente. Cada planejamento pode reunir temas, aulas e anexos em estrutura de accordion.</p>
        </div>
        <div class="planning-accordion space-y-4">
          ${planningCardsHtml || '<div class="card p-6 text-center text-secondary">Nenhum planejamento cadastrado. Clique em "Novo planejamento" para começar.</div>'}
        </div>
      </div>
    `;
  };

  const openPlanningCreateModal = async () => {
    const result = await CustomSwal.fire({
      title: "Novo Modelo de Planejamento",
      html: `
        <div class="swal-modern-form text-left">
          <div class="swal-modern-input-group">
            <label for="planning-title-input" class="swal-modern-label">Tema</label>
            <input id="planning-title-input" class="swal-modern-input" type="text" placeholder="Ex: Geometria plana" />
          </div>
          <p class="text-xs text-secondary">O modelo será criado sem associação com turmas. Você poderá associá-lo depois.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Criar modelo",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      preConfirm: () => {
        const title = document
          .getElementById("planning-title-input")
          ?.value.trim();
        const normalizedTitle = normalizePlanningLabelInput(title, "tema");

        if (!normalizedTitle) {
          Swal.showValidationMessage("Informe um título para o tema.");
          return false;
        }

        return { title: normalizedTitle };
      },
    });

    if (!result.isConfirmed || !result.value) return false;

    const now = new Date().toISOString();
    const currentTemplates = getPlanningTemplates();
    const nextOrder =
      currentTemplates.length > 0
        ? Math.max(...currentTemplates.map((p) => p.order || 0)) + 1
        : 1;

    state.planningTemplates.push({
      id: generateUUID(),
      title: result.value.title,
      themes: [],
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    });

    saveData();
    return true;
  };

  const openEditVinculosModal = async () => {
    const classes = [...(state.classes || [])].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );

    if (classes.length === 0) {
      await CustomSwal.fire("Atenção", "Nenhuma turma cadastrada.", "warning");
      return false;
    }

    const getAssociationViewModels = (classId) => {
      const classTerms = getPlanningTermsForClass(classId);
      return (state.planningAssociations || [])
        .filter((a) => a.classId === classId)
        .map((assoc) => {
          const template = (state.planningTemplates || []).find(
            (t) => t.id === assoc.planningId,
          );
          const termIndex = classTerms.findIndex((t) => t.value === assoc.termKey);
          const foundTerm = termIndex >= 0 ? classTerms[termIndex] : null;
          return {
            id: assoc.id,
            planningTitle: template?.title || "Planejamento removido",
            termLabel: foundTerm?.label || assoc.termKey || "Todos os períodos",
            termOrder: termIndex >= 0 ? termIndex : 999,
            isMissingTemplate: !template,
          };
        });
    };

    const sortAssociationModels = (models, sortValue) => {
      const sorted = [...models];
      sorted.sort((a, b) => {
        switch (sortValue) {
          case "title-desc":
            return String(b.planningTitle || "").localeCompare(String(a.planningTitle || ""));
          case "term-asc":
            return a.termOrder - b.termOrder || String(a.planningTitle || "").localeCompare(String(b.planningTitle || ""));
          case "term-desc":
            return b.termOrder - a.termOrder || String(a.planningTitle || "").localeCompare(String(b.planningTitle || ""));
          case "title-asc":
          default:
            return String(a.planningTitle || "").localeCompare(String(b.planningTitle || ""));
        }
      });
      return sorted;
    };

    const buildVinculosHtml = (models, uncheckedIds = new Set()) => {

      const html = models
        .map((item) => {
          const checkedAttr = uncheckedIds.has(item.id) ? "" : "checked";
          return `
            <label class="vinculos-item ${item.isMissingTemplate ? "is-missing" : ""}">
              <input type="checkbox" class="vinculos-assoc-check" value="${item.id}" ${checkedAttr} />
              <span class="vinculos-item-main">
                <span class="vinculos-item-title">${escapeHtml(item.planningTitle)}</span>
                <span class="vinculos-item-meta">${escapeHtml(item.termLabel)}</span>
              </span>
            </label>
          `;
        })
        .join("");

      return { html, visibleCount: models.length };
    };

    const classOptionsHtml = classes
      .map(
        (cls) =>
          `<option value="${cls.id}">${escapeHtml(cls.name || "-")}</option>`,
      )
      .join("");

    const firstClassId = classes[0]?.id || "";
    const uncheckedByClass = new Map();

    const result = await CustomSwal.fire({
      title: "Editar vínculos",
      html: `
        <div class="swal-modern-form text-left vinculos-modal">
          <div class="vinculos-container">
            <div class="vinculos-column-left">
              <div class="vinculos-controls">
                <div class="swal-modern-input-group mb-0">
                  <label for="vinculos-class-select" class="swal-modern-label">Turma</label>
                  <select id="vinculos-class-select" class="swal-modern-input">
                    ${classOptionsHtml}
                  </select>
                </div>
              </div>

              <div class="vinculos-quick-actions">
                <button type="button" id="vinculos-check-all" class="btn btn-subtle">Marcar todos</button>
                <button type="button" id="vinculos-uncheck-all" class="btn btn-subtle">Desmarcar todos</button>
              </div>

              <div class="vinculos-summary">
                <span class="vinculos-chip">Total: <strong id="vinculos-total">0</strong></span>
                <span class="vinculos-chip">Mantidos: <strong id="vinculos-kept">0</strong></span>
                <span class="vinculos-chip danger">Remover: <strong id="vinculos-removed">0</strong></span>
              </div>
            </div>

            <div class="vinculos-column-right">
              <div id="vinculos-list" class="swal-modern-input-group mb-0">
                <label class="swal-modern-label">Planejamentos vinculados</label>
                <div id="vinculos-list-items" class="planning-copy-options"></div>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const classSelect = document.getElementById("vinculos-class-select");
        const listItems = document.getElementById("vinculos-list-items");
        const totalEl = document.getElementById("vinculos-total");
        const keptEl = document.getElementById("vinculos-kept");
        const removedEl = document.getElementById("vinculos-removed");
        const checkAllBtn = document.getElementById("vinculos-check-all");
        const uncheckAllBtn = document.getElementById("vinculos-uncheck-all");

        if (!classSelect || !listItems) return;

        const renderList = () => {
          const classId = classSelect.value;
          const currentModels = getAssociationViewModels(classId);
          const sortedModels = sortAssociationModels(currentModels, "term-asc");
          const currentUnchecked = uncheckedByClass.get(classId) || new Set();
          const { html, visibleCount } = buildVinculosHtml(
            sortedModels,
            currentUnchecked,
          );

          listItems.innerHTML = html;

          listItems.querySelectorAll(".vinculos-assoc-check").forEach((checkbox) => {
            checkbox.addEventListener("change", (event) => {
              const set = uncheckedByClass.get(classId) || new Set();
              const assocId = event.currentTarget.value;
              if (event.currentTarget.checked) {
                set.delete(assocId);
              } else {
                set.add(assocId);
              }
              uncheckedByClass.set(classId, set);
              updateSummary();
            });
          });

          updateSummary(visibleCount);
        };

        const updateSummary = (visibleCount = null) => {
          const classId = classSelect.value;
          const total = getAssociationViewModels(classId).length;
          const unchecked = (uncheckedByClass.get(classId) || new Set()).size;
          const kept = Math.max(total - unchecked, 0);

          if (totalEl) totalEl.textContent = String(total);
          if (keptEl) keptEl.textContent = String(kept);
          if (removedEl) removedEl.textContent = String(unchecked);
        };

        classSelect.addEventListener("change", () => {
          renderList();
        });

        document.querySelector(".swal2-popup")?.classList.add("vinculos-modal-popup");

        checkAllBtn?.addEventListener("click", () => {
          const classId = classSelect.value;
          uncheckedByClass.set(classId, new Set());
          renderList();
        });

        uncheckAllBtn?.addEventListener("click", () => {
          const classId = classSelect.value;
          const allIds = getAssociationViewModels(classId).map((item) => item.id);
          uncheckedByClass.set(classId, new Set(allIds));
          renderList();
        });

        renderList();
      },
      preConfirm: () => {
        // Considera os vínculos desmarcados em TODAS as turmas percorridas
        // pelo usuário (não somente a turma selecionada no momento do clique
        // em "Salvar"), garantindo precisão por bimestre/turma.
        const uncheckedIds = new Set();
        uncheckedByClass.forEach((idsSet) => {
          idsSet.forEach((id) => uncheckedIds.add(id));
        });
        return { uncheckedIds: Array.from(uncheckedIds) };
      },
    });

    if (!result.isConfirmed || !result.value) return false;

    const { uncheckedIds } = result.value;
    if (uncheckedIds.length === 0) {
      await CustomSwal.fire({
        icon: "info",
        title: "Nenhuma alteração",
        text: "Nenhum vínculo foi desmarcado para remoção.",
      });
      return false;
    }

    const confirmResult = await CustomSwal.fire({
      title: "Confirmar remoção",
      html: `<p>Deseja remover <strong>${uncheckedIds.length}</strong> vínculo(s) de planejamento?</p><p class="text-secondary text-sm mt-2">Esta ação não pode ser desfeita.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!confirmResult.isConfirmed) return false;

    state.planningAssociations = (state.planningAssociations || []).filter(
      (a) => !uncheckedIds.includes(a.id),
    );
    saveData();
    return true;
  };

  const openAssociatePlanningModal = async (planningId) => {
    const template = (state.planningTemplates || []).find(
      (t) => t.id === planningId,
    );
    if (!template) return false;

    const classes = [...(state.classes || [])].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );

    if (classes.length === 0) {
      await CustomSwal.fire(
        "Atenção",
        "Cadastre ao menos uma turma para associar o planejamento.",
        "warning",
      );
      return false;
    }

    const periodOptionsByIndex = [];
    classes.forEach((cls) => {
      const terms = getPlanningTermsForClass(cls.id);
      terms.forEach((term, index) => {
        if (!periodOptionsByIndex[index]) {
          periodOptionsByIndex[index] = {
            value: String(index),
            label: term.label || `${index + 1}º Período`,
          };
        }
      });
    });

    const periodOptionsHtml = periodOptionsByIndex
      .map(
        (option) =>
          `<option value="${option.value}">${escapeHtml(option.label)}</option>`,
      )
      .join("");

    const normalizeSearchText = (value = "") =>
      String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const classItems = classes.map((cls) => {
      const currentAssociation = getPlanningAssociationForClass(cls.id);
      const currentTemplate = currentAssociation
        ? (state.planningTemplates || []).find(
            (t) => t.id === currentAssociation.planningId,
          ) || null
        : null;
      const isCurrentlyAssociated =
        currentAssociation?.planningId === planningId;

      return {
        id: cls.id,
        name: cls.name || "-",
        isCurrentlyAssociated,
        currentTemplateTitle:
          currentTemplate && !isCurrentlyAssociated
            ? currentTemplate.title || "Sem título"
            : "",
      };
    });

    const result = await CustomSwal.fire({
      title: `Associar "${escapeHtml(template.title || "Sem título")}"`,
      html: `
        <div class="swal-modern-form text-left planning-picker-modal">
          <div class="swal-modern-input-group">
            <label for="planning-association-period" class="swal-modern-label">Período</label>
            <select id="planning-association-period" class="swal-modern-input">
              ${periodOptionsHtml}
            </select>
          </div>

          <div class="planning-picker-grid">
            <div class="planning-picker-col">
              <div class="planning-picker-panel-header">
                <label for="planning-association-search" class="swal-modern-label">Turmas disponíveis</label>
                <button type="button" id="planning-association-add-filtered" class="btn btn-subtle">Adicionar visíveis</button>
              </div>
              <div class="swal-modern-input-group mb-0 planning-picker-search-wrap">
                <input id="planning-association-search" class="swal-modern-input" type="text" placeholder="Digite para buscar turma..." autocomplete="off" />
                <div id="planning-association-dropdown" class="planning-search-dropdown"></div>
              </div>
              <small id="planning-association-available-count" class="text-xs text-secondary">Disponíveis: 0</small>
            </div>

            <div class="planning-picker-col">
              <div class="planning-picker-selected-head">
                <label class="swal-modern-label">Turmas vinculadas</label>
                <button type="button" id="planning-association-clear" class="btn btn-subtle">Remover todos</button>
              </div>
              <div id="planning-association-selected" class="planning-selected-list"></div>
              <small id="planning-association-selected-count" class="text-xs text-secondary">Selecionados: 0</small>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Associar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "planning-picker-popup",
        htmlContainer: "planning-picker-html",
        confirmButton: "btn planning-picker-btn-confirm",
        cancelButton: "btn planning-picker-btn-cancel",
      },
      didOpen: () => {
        const searchInput = document.getElementById(
          "planning-association-search",
        );
        const dropdownEl = document.getElementById(
          "planning-association-dropdown",
        );
        const selectedListEl = document.getElementById(
          "planning-association-selected",
        );
        const availableCountEl = document.getElementById(
          "planning-association-available-count",
        );
        const selectedCountEl = document.getElementById(
          "planning-association-selected-count",
        );
        const clearBtn = document.getElementById("planning-association-clear");
        const addFilteredBtn = document.getElementById(
          "planning-association-add-filtered",
        );
        const confirmBtn = Swal.getConfirmButton();

        const selectedIds = new Set(
          classItems
            .filter((item) => item.isCurrentlyAssociated)
            .map((item) => item.id),
        );

        const updateConfirmState = () => {
          if (!confirmBtn) return;
          confirmBtn.disabled = selectedIds.size === 0;
        };

        const getFilteredAvailable = (query = "") => {
          const normalizedQuery = normalizeSearchText(query);
          return classItems.filter((item) => {
            if (selectedIds.has(item.id)) return false;
            const searchText = normalizeSearchText(
              `${item.name} ${item.currentTemplateTitle}`,
            );
            return !normalizedQuery || searchText.includes(normalizedQuery);
          });
        };

        const renderSelected = () => {
          const selectedItems = classItems.filter((item) =>
            selectedIds.has(item.id),
          );

          if (selectedListEl) {
            if (selectedItems.length === 0) {
              selectedListEl.innerHTML =
                '<div class="planning-search-empty">Nenhuma turma selecionada.</div>';
            } else {
              selectedListEl.innerHTML = selectedItems
                .map(
                  (item) => `
                    <div class="planning-selected-item" data-selected-class-id="${escapeHtml(item.id)}">
                      <span><strong>${escapeHtml(item.name)}</strong></span>
                      <button type="button" class="btn btn-subtle planning-selected-remove" data-id="${escapeHtml(item.id)}" title="Remover turma"><i class="fas fa-times"></i></button>
                    </div>
                  `,
                )
                .join("");
            }
          }

          if (selectedCountEl) {
            selectedCountEl.textContent = `Selecionados: ${selectedItems.length}`;
          }

          updateConfirmState();
        };

        const renderDropdown = () => {
          const availableItems = getFilteredAvailable(searchInput?.value || "");

          if (dropdownEl) {
            if (availableItems.length === 0) {
              dropdownEl.innerHTML =
                '<div class="planning-search-empty">Nenhum resultado disponível.</div>';
            } else {
              dropdownEl.innerHTML = availableItems
                .slice(0, 50)
                .map(
                  (item) => `
                    <button type="button" class="planning-search-option" data-id="${escapeHtml(item.id)}">
                      <span>
                        <strong>${escapeHtml(item.name)}</strong>
                        ${item.currentTemplateTitle ? `<small class="text-secondary">(atual: ${escapeHtml(item.currentTemplateTitle)})</small>` : ""}
                      </span>
                      <i class="fas fa-plus"></i>
                    </button>
                  `,
                )
                .join("");
            }
          }

          if (availableCountEl) {
            availableCountEl.textContent = `Disponíveis: ${availableItems.length}`;
          }

          if (addFilteredBtn) {
            addFilteredBtn.disabled = availableItems.length === 0;
          }
        };

        searchInput?.addEventListener("input", renderDropdown);

        searchInput?.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const firstResultBtn = dropdownEl?.querySelector(
            ".planning-search-option",
          );
          firstResultBtn?.click();
        });

        dropdownEl?.addEventListener("click", (event) => {
          const addBtn = event.target.closest(".planning-search-option");
          if (!addBtn) return;

          const classId = addBtn.dataset.id;
          if (!classId) return;

          selectedIds.add(classId);
          renderSelected();
          renderDropdown();
          searchInput?.focus();
        });

        selectedListEl?.addEventListener("click", (event) => {
          const removeBtn = event.target.closest(".planning-selected-remove");
          if (!removeBtn) return;

          const classId = removeBtn.dataset.id;
          if (!classId) return;

          selectedIds.delete(classId);
          renderSelected();
          renderDropdown();
        });

        addFilteredBtn?.addEventListener("click", () => {
          getFilteredAvailable(searchInput?.value || "").forEach((item) => {
            selectedIds.add(item.id);
          });
          renderSelected();
          renderDropdown();
        });

        clearBtn?.addEventListener("click", () => {
          selectedIds.clear();
          renderSelected();
          renderDropdown();
        });

        renderSelected();
        renderDropdown();
      },
      preConfirm: () => {
        const classIds = Array.from(
          document.querySelectorAll("[data-selected-class-id]"),
        )
          .map((item) => item.dataset.selectedClassId)
          .filter(Boolean);

        if (classIds.length === 0) {
          Swal.showValidationMessage("Selecione ao menos uma turma.");
          return false;
        }

        const periodSelection =
          document.getElementById("planning-association-period")?.value ||
          "0";

        return { classIds, periodSelection };
      },
    });

    if (!result.isConfirmed || !result.value) return false;

    const targets = [];
    result.value.classIds.forEach((classId) => {
      const classTerms = getPlanningTermsForClass(classId);
      const selectedPeriodIndex = Number(result.value.periodSelection);
      const termKey =
        classTerms[selectedPeriodIndex]?.value || classTerms[0]?.value || "";
      const termLabel =
        classTerms[selectedPeriodIndex]?.label ||
        classTerms[0]?.label ||
        "";

      targets.push({ classId, termKey, termLabel });
    });

    const conflicts = targets
      .map(({ classId, termKey, termLabel }) => {
        const existing = getPlanningAssociationForClass(classId, termKey);
        if (!existing || existing.planningId === template.id) return null;
        const cls = state.classes.find((c) => c.id === classId);
        const existingTemplate = (state.planningTemplates || []).find(
          (t) => t.id === existing.planningId,
        );
        return {
          className: cls?.name || "Turma",
          termLabel,
          existingTitle: existingTemplate?.title || "Sem título",
        };
      })
      .filter(Boolean);

    if (conflicts.length > 0) {
      const conflictsHtml = conflicts
        .map(
          (c) =>
            `<li>${escapeHtml(c.className)}${c.termLabel ? ` (${escapeHtml(c.termLabel)})` : ""} — atualmente: <b>${escapeHtml(c.existingTitle)}</b></li>`,
        )
        .join("");
      const confirmReplace = await CustomSwal.fire({
        title: "Substituir planejamento já associado?",
        icon: "warning",
        html: `
          <div class="swal-modern-form text-left">
            <p class="text-secondary">As turmas abaixo já possuem um planejamento associado para o período selecionado. Associar este planejamento substituirá o vínculo atual:</p>
            <ul class="text-sm">${conflictsHtml}</ul>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Substituir",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
      });
      if (!confirmReplace.isConfirmed) return false;
    }

    const now = new Date().toISOString();
    targets.forEach(({ classId, termKey }) => {
      state.planningAssociations = (state.planningAssociations || []).filter(
        (association) =>
          !(
            association.classId === classId &&
            String(association.termKey || "").trim() ===
              String(termKey || "").trim()
          ),
      );

      state.planningAssociations.push({
        id: generateUUID(),
        classId,
        termKey: termKey || "",
        planningId: template.id,
        createdAt: now,
        updatedAt: now,
      });
    });

    saveData();
    return true;
  };

  const openPlanningEditModal = async (planning) => {
    if (!planning) return false;

    const result = await CustomSwal.fire({
      title: "Editar Tema",
      html: `
        <div class="swal-modern-form text-left">
          <div class="swal-modern-input-group">
            <label for="planning-edit-title-input" class="swal-modern-label">Tema</label>
            <input id="planning-edit-title-input" class="swal-modern-input" type="text" value="${escapeHtml(planning.title || "")}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const title = document
          .getElementById("planning-edit-title-input")
          .value.trim();
        const normalizedTitle = normalizePlanningLabelInput(title, "tema");

        if (!normalizedTitle) {
          Swal.showValidationMessage("Informe um título para o tema.");
          return false;
        }
        return { title: normalizedTitle };
      },
    });

    if (!result.isConfirmed || !result.value) return false;

    planning.title = result.value.title;
    planning.updatedAt = new Date().toISOString();
    saveData();
    return true;
  };

  const openPlanningThemeEditModal = async (theme) => {
    if (!theme) return false;

    const result = await CustomSwal.fire({
      title: "Editar Tema",
      html: `
        <div class="swal-modern-form text-left">
          <div class="swal-modern-input-group">
            <label for="planning-edit-theme-input" class="swal-modern-label">Tema</label>
            <input id="planning-edit-theme-input" class="swal-modern-input" type="text" value="${escapeHtml(theme.title || "")}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const title = document
          .getElementById("planning-edit-theme-input")
          .value.trim();
        const normalizedTitle = normalizePlanningLabelInput(title, "tema");

        if (!normalizedTitle) {
          Swal.showValidationMessage("Informe um título para o tema.");
          return false;
        }
        return { title: normalizedTitle };
      },
    });

    if (!result.isConfirmed || !result.value) return false;

    theme.title = result.value.title;
    return true;
  };

  const openPlanningLessonEditModal = async (lesson) => {
    if (!lesson) return false;

    const result = await CustomSwal.fire({
      title: "Editar Aula",
      html: `
        <div class="swal-modern-form text-left">
          <div class="swal-modern-input-group">
            <label for="planning-edit-lesson-input" class="swal-modern-label">Aula</label>
            <input id="planning-edit-lesson-input" class="swal-modern-input" type="text" value="${escapeHtml(lesson.title || "")}" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const title = document
          .getElementById("planning-edit-lesson-input")
          .value.trim();
        const normalizedTitle = normalizePlanningLabelInput(title, "aula");

        if (!normalizedTitle) {
          Swal.showValidationMessage("Informe um título para a aula.");
          return false;
        }
        return { title: normalizedTitle };
      },
    });

    if (!result.isConfirmed || !result.value) return false;

    lesson.title = result.value.title;
    return true;
  };

  const openSelectPlanningTemplatesModal = async ({
    title,
    description = "",
    items = [],
    confirmButtonText = "Confirmar",
    layout = "default",
    availableTitle = "Opções disponíveis",
    selectedTitle = "Escolhas selecionadas",
    addFilteredText = "Adicionar visíveis",
    clearSelectedText = "Remover todos",
  }) => {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const normalizeSearchText = (value = "") =>
      String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (layout === "dual-dropdown") {
      const result = await CustomSwal.fire({
        title,
        html: `
          <div class="swal-modern-form text-left planning-picker-modal">
            ${description ? `<p class="text-secondary">${description}</p>` : ""}
            <div class="planning-picker-grid">
              <div class="planning-picker-col">
                <div class="planning-picker-panel-header">
                  <label for="planning-select-search" class="swal-modern-label">${escapeHtml(availableTitle)}</label>
                  <button type="button" id="planning-add-filtered" class="btn btn-subtle">${escapeHtml(addFilteredText)}</button>
                </div>
                <div class="swal-modern-input-group mb-0 planning-picker-search-wrap">
                  <input id="planning-select-search" class="swal-modern-input" type="text" placeholder="Digite para buscar..." autocomplete="off" />
                  <div id="planning-search-dropdown" class="planning-search-dropdown"></div>
                </div>
                <small id="planning-available-count" class="text-xs text-secondary">Disponíveis: 0</small>
              </div>
              <div class="planning-picker-col">
                <div class="planning-picker-selected-head">
                  <label class="swal-modern-label">${escapeHtml(selectedTitle)}</label>
                  <button type="button" id="planning-clear-selected" class="btn btn-subtle">${escapeHtml(clearSelectedText)}</button>
                </div>
                <div id="planning-selected-list" class="planning-selected-list"></div>
                <small id="planning-selected-count" class="text-xs text-secondary">Selecionados: 0</small>
              </div>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText: "Cancelar",
        customClass: {
          popup: "planning-picker-popup",
          htmlContainer: "planning-picker-html",
          confirmButton: "btn planning-picker-btn-confirm",
          cancelButton: "btn planning-picker-btn-cancel",
        },
        didOpen: () => {
          const searchInput = document.getElementById("planning-select-search");
          const dropdownEl = document.getElementById("planning-search-dropdown");
          const selectedListEl = document.getElementById("planning-selected-list");
          const availableCountEl = document.getElementById("planning-available-count");
          const selectedCountEl = document.getElementById("planning-selected-count");
          const clearBtn = document.getElementById("planning-clear-selected");
          const addFilteredBtn = document.getElementById("planning-add-filtered");
          const confirmBtn = Swal.getConfirmButton();

          const selectedIds = new Set();

          const updateConfirmState = () => {
            if (!confirmBtn) return;
            confirmBtn.disabled = selectedIds.size === 0;
          };

          const getLabel = (item, index = 0) =>
            item.title || `Planejamento ${String(index + 1).padStart(2, "0")}`;

          const getFilteredAvailable = (query = "") => {
            const normalizedQuery = normalizeSearchText(query);
            return items.filter((item) => {
              if (selectedIds.has(item.id)) return false;
              const text = normalizeSearchText(
                `${item.title || ""} ${item.meta || ""}`,
              );
              return !normalizedQuery || text.includes(normalizedQuery);
            });
          };

          const renderSelected = () => {
            const selectedItems = items.filter((item) => selectedIds.has(item.id));

            if (selectedListEl) {
              if (selectedItems.length === 0) {
                selectedListEl.innerHTML =
                  '<div class="planning-search-empty">Nenhum planejamento selecionado.</div>';
              } else {
                selectedListEl.innerHTML = selectedItems
                  .map(
                    (item, index) => `
                      <div class="planning-selected-item" data-selected-item-id="${escapeHtml(item.id)}">
                        <span><strong>${escapeHtml(getLabel(item, index))}</strong></span>
                        <button type="button" class="btn btn-subtle planning-selected-remove" data-id="${escapeHtml(item.id)}" title="Remover da seleção"><i class="fas fa-times"></i></button>
                      </div>
                    `,
                  )
                  .join("");
              }
            }

            if (selectedCountEl) {
              selectedCountEl.textContent = `Selecionados: ${selectedItems.length}`;
            }

            updateConfirmState();
          };

          const renderDropdown = () => {
            const query = searchInput?.value || "";
            const availableItems = getFilteredAvailable(query);

            if (dropdownEl) {
              if (availableItems.length === 0) {
                dropdownEl.innerHTML =
                  '<div class="planning-search-empty">Nenhum resultado disponível.</div>';
              } else {
                dropdownEl.innerHTML = availableItems
                  .slice(0, 30)
                  .map(
                    (item, index) => `
                      <button type="button" class="planning-search-option" data-id="${escapeHtml(item.id)}">
                        <span><strong>${escapeHtml(getLabel(item, index))}</strong></span>
                        <i class="fas fa-plus"></i>
                      </button>
                    `,
                  )
                  .join("");
              }
            }

            if (availableCountEl) {
              availableCountEl.textContent = `Disponíveis: ${availableItems.length}`;
            }

            if (addFilteredBtn) {
              addFilteredBtn.disabled = availableItems.length === 0;
            }
          };

          searchInput?.addEventListener("input", () => {
            renderDropdown();
          });

          searchInput?.addEventListener("focus", () => {
            renderDropdown();
          });

          searchInput?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const firstResultBtn = dropdownEl?.querySelector(
              ".planning-search-option",
            );
            firstResultBtn?.click();
          });

          dropdownEl?.addEventListener("click", (event) => {
            const addBtn = event.target.closest(".planning-search-option");
            if (!addBtn) return;

            const itemId = addBtn.dataset.id;
            if (!itemId) return;

            selectedIds.add(itemId);
            renderSelected();
            renderDropdown();
            searchInput?.focus();
          });

          selectedListEl?.addEventListener("click", (event) => {
            const removeBtn = event.target.closest(".planning-selected-remove");
            if (!removeBtn) return;

            const itemId = removeBtn.dataset.id;
            if (!itemId) return;

            selectedIds.delete(itemId);
            renderSelected();
            renderDropdown();
          });

          addFilteredBtn?.addEventListener("click", () => {
            getFilteredAvailable(searchInput?.value || "").forEach((item) => {
              selectedIds.add(item.id);
            });
            renderSelected();
            renderDropdown();
          });

          clearBtn?.addEventListener("click", () => {
            selectedIds.clear();
            renderSelected();
            renderDropdown();
          });

          renderSelected();
          renderDropdown();
        },
        preConfirm: () => {
          const selectedIds = Array.from(
            document.querySelectorAll("[data-selected-item-id]"),
          )
            .map((item) => item.dataset.selectedItemId)
            .filter(Boolean);

          if (selectedIds.length === 0) {
            Swal.showValidationMessage(
              "Selecione ao menos um planejamento.",
            );
            return false;
          }

          return selectedIds;
        },
      });

      if (!result.isConfirmed || !result.value) return [];
      return result.value;
    }

    const optionsHtml = items
      .map(
        (item, index) => `
          <label class="planning-copy-option">
            <input type="checkbox" class="planning-template-select-item" value="${escapeHtml(item.id)}" checked />
            <span><strong>${escapeHtml(item.title || `Planejamento ${String(index + 1).padStart(2, "0")}`)}</strong>${item.meta ? ` <small class="text-secondary">(${escapeHtml(item.meta)})</small>` : ""}</span>
          </label>
        `,
      )
      .join("");

    const result = await CustomSwal.fire({
      title,
      html: `
        <div class="swal-modern-form text-left">
          ${description ? `<p class="text-secondary">${description}</p>` : ""}
          <div class="swal-modern-input-group mb-0">
            <label for="planning-select-search" class="swal-modern-label">Buscar planejamento</label>
            <input id="planning-select-search" class="swal-modern-input" type="text" placeholder="Digite parte do título..." />
            <small id="planning-visible-count" class="text-xs text-secondary">Exibindo ${items.length} de ${items.length}</small>
          </div>
          <div class="vinculos-quick-actions">
            <button type="button" id="planning-select-all" class="btn btn-subtle">Marcar todos</button>
            <button type="button" id="planning-unselect-all" class="btn btn-subtle">Desmarcar todos</button>
          </div>
          <div class="planning-copy-options">${optionsHtml}</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const searchInput = document.getElementById("planning-select-search");
        const visibleCountEl = document.getElementById("planning-visible-count");
        const optionLabels = Array.from(
          document.querySelectorAll(".planning-copy-options .planning-copy-option"),
        );

        const renderSearch = () => {
          const query = normalizeSearchText(searchInput?.value || "");
          let visibleCount = 0;

          optionLabels.forEach((label) => {
            const normalizedText = normalizeSearchText(label.textContent || "");
            const matches = !query || normalizedText.includes(query);
            label.style.display = matches ? "" : "none";
            if (matches) visibleCount += 1;
          });

          if (visibleCountEl) {
            visibleCountEl.textContent = `Exibindo ${visibleCount} de ${optionLabels.length}`;
          }
        };

        const toggleAll = (checked) => {
          optionLabels.forEach((label) => {
            if (label.style.display === "none") return;
            const input = label.querySelector(".planning-template-select-item");
            if (input) input.checked = checked;
          });
        };

        document
          .getElementById("planning-select-all")
          ?.addEventListener("click", () => toggleAll(true));
        document
          .getElementById("planning-unselect-all")
          ?.addEventListener("click", () => toggleAll(false));
        searchInput?.addEventListener("input", renderSearch);
        renderSearch();
      },
      preConfirm: () => {
        const selectedIds = Array.from(
          document.querySelectorAll(".planning-template-select-item:checked"),
        ).map((input) => input.value);

        if (selectedIds.length === 0) {
          Swal.showValidationMessage(
            "Selecione ao menos um planejamento.",
          );
          return false;
        }

        return selectedIds;
      },
    });

    if (!result.isConfirmed || !result.value) return [];
    return result.value;
  };

  const exportPlanningTemplatesJson = async () => {
    const templates = getPlanningTemplates();
    if (templates.length === 0) {
      await CustomSwal.fire(
        "Atenção",
        "Não há planejamentos para exportar.",
        "info",
      );
      return false;
    }

    const selectedTemplateIds = await openSelectPlanningTemplatesModal({
      title: "Exportar Planejamentos",
      description: `Total disponível: <b>${templates.length}</b>`,
      items: templates.map((template, index) => ({
        id: template.id,
        title:
          template.title ||
          `Planejamento ${String(index + 1).padStart(2, "0")}`,
      })),
      confirmButtonText: "Exportar",
      layout: "dual-dropdown",
      selectedTitle: "Escolhas para exportação",
    });

    if (selectedTemplateIds.length === 0) return false;

    const selectedTemplates = templates.filter((template) =>
      selectedTemplateIds.includes(template.id),
    );

    const payload = {
      exportType: "planning-template-bank",
      exportedAt: new Date().toISOString(),
      app: "actEducacao",
      templates: selectedTemplates.map((template, templateIndex) => ({
        id: template.id,
        title: template.title || `Planejamento ${String(templateIndex + 1).padStart(2, "0")}`,
        order: template.order || templateIndex + 1,
        themes: getPlanningThemes(template).map((theme, themeIndex) => ({
          title: theme.title || `Tema ${String(themeIndex + 1).padStart(2, "0")}`,
          lessons: getThemeLessons(theme).map((lesson) => ({
            title: lesson.title || "Sem título",
            completed: false,
            attachments: normalizeAttachments(
              lesson.attachments || lesson.subsubtopics || [],
            ),
          })),
        })),
      })),
    };

    const fileName = `Planejamentos_${selectedTemplates.length}itens_${new Date().toISOString().split("T")[0]}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  };

  const parsePlanningTemplatesImportFile = async (file) => {
    if (!file) return null;

    const normalizeImportedTemplate = (rawTemplate, index = 0) => {
      if (!rawTemplate || typeof rawTemplate !== "object") return null;

      const title = normalizePlanningLabelInput(rawTemplate.title, "tema");
      if (!title) return null;

      const rawThemes = Array.isArray(rawTemplate.themes)
        ? rawTemplate.themes
        : [
            {
              title: "Tema 01",
              lessons: Array.isArray(rawTemplate.subtopics)
                ? rawTemplate.subtopics
                : [],
            },
          ];

      const themes = rawThemes
        .map((rawTheme, themeIndex) => {
          const themeTitle = normalizePlanningLabelInput(
            rawTheme?.title || `Tema ${String(themeIndex + 1).padStart(2, "0")}`,
            "tema",
          );

          const rawLessons = Array.isArray(rawTheme?.lessons)
            ? rawTheme.lessons
            : Array.isArray(rawTheme?.subtopics)
              ? rawTheme.subtopics
              : [];

          const lessons = rawLessons
            .map((rawLesson) => {
              const lessonTitle = normalizePlanningLabelInput(
                rawLesson?.title,
                "aula",
              );
              if (!lessonTitle) return null;

              return {
                title: lessonTitle,
                completed: false,
                attachments: normalizeAttachments(
                  rawLesson?.attachments || rawLesson?.subsubtopics || [],
                ),
              };
            })
            .filter(Boolean);

          if (!themeTitle && lessons.length === 0) return null;

          return {
            title: themeTitle || `Tema ${String(themeIndex + 1).padStart(2, "0")}`,
            lessons,
          };
        })
        .filter(Boolean);

      return {
        importId: `${rawTemplate?.id || "planning"}-${index}`,
        title,
        order: Number(rawTemplate.order) || index + 1,
        themes,
      };
    };

    try {
      const parsed = JSON.parse(await file.text());

      const importedTemplatesSource = Array.isArray(parsed?.templates)
        ? parsed.templates
        : Array.isArray(parsed?.plannings)
          ? parsed.plannings
          : null;

      if (!importedTemplatesSource) {
        throw new Error("invalid-format");
      }

      const importedTemplates = importedTemplatesSource
        .map((item, index) => normalizeImportedTemplate(item, index))
        .filter(Boolean);

      if (importedTemplates.length === 0) {
        throw new Error("empty");
      }

      return {
        importedTemplates,
        sourceLabel: parsed?.class?.name || parsed?.app || "Arquivo externo",
      };
    } catch (_error) {
      await CustomSwal.fire(
        "Erro",
        "Arquivo incompatível. Selecione um JSON de planejamentos válido.",
        "error",
      );
      return null;
    }
  };

  const importPlanningTemplatesPayload = ({ importedTemplates }) => {
    if (!Array.isArray(importedTemplates) || importedTemplates.length === 0) {
      return { imported: 0, skipped: 0 };
    }

    const now = new Date().toISOString();

    let nextOrder =
      (state.planningTemplates || []).reduce(
        (max, item) => Math.max(max, Number(item?.order) || 0),
        0,
      ) + 1;

    let importedCount = 0;
    let skippedCount = 0;

    importedTemplates.forEach((template) => {
      const normalizedTitle = normalizePlanningLabelInput(template?.title, "tema");
      if (!normalizedTitle) {
        skippedCount += 1;
        return;
      }

      const normalizedThemes = Array.isArray(template?.themes)
        ? template.themes
            .map((theme, themeIndex) => {
              const themeTitle = normalizePlanningLabelInput(
                theme?.title || `Tema ${String(themeIndex + 1).padStart(2, "0")}`,
                "tema",
              );

              const lessons = Array.isArray(theme?.lessons)
                ? theme.lessons
                    .map((lesson) => {
                      const lessonTitle = normalizePlanningLabelInput(
                        lesson?.title,
                        "aula",
                      );
                      if (!lessonTitle) return null;

                      return {
                        title: lessonTitle,
                        completed: false,
                        attachments: normalizeAttachments(
                          lesson?.attachments || lesson?.subsubtopics || [],
                        ),
                      };
                    })
                    .filter(Boolean)
                : [];

              if (!themeTitle && lessons.length === 0) return null;

              return {
                title:
                  themeTitle || `Tema ${String(themeIndex + 1).padStart(2, "0")}`,
                lessons,
              };
            })
            .filter(Boolean)
        : [];

      state.planningTemplates.push({
        id: generateUUID(),
        title: normalizedTitle,
        themes: normalizedThemes,
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
      });

      nextOrder += 1;
      importedCount += 1;
    });

    return { imported: importedCount, skipped: skippedCount };
  };

  const openPlanningPrintModal = async (classId, subjectId, termKey) => {
    const classes = [...(state.classes || [])].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );
    const shouldChooseClass = !classId;

    if (shouldChooseClass && classes.length === 0) {
      await CustomSwal.fire(
        "Atenção",
        "Cadastre ao menos uma turma para imprimir o planejamento.",
        "warning",
      );
      return;
    }

    const initialClassId = classId || classes[0]?.id || "";

    const getTermOptionsHtml = (selectedClassId, selectedTermKey = "") => {
      const termOptions = getPlanningTermsForClass(selectedClassId);
      const defaultTermKey = selectedTermKey || termOptions[0]?.value || "";

      if (termOptions.length === 0) {
        return {
          html: '<option value="">Nenhum período encontrado</option>',
          selectedTermKey: "",
        };
      }

      return {
        html: termOptions
          .map(
            (termOption) => `
              <option value="${termOption.value}" ${termOption.value === defaultTermKey ? "selected" : ""}>
                ${escapeHtml(termOption.label || "Período")}
              </option>
            `,
          )
          .join(""),
        selectedTermKey: defaultTermKey,
      };
    };

    const initialTermMeta = getTermOptionsHtml(initialClassId, termKey || "");

    const refreshPrintContextFields = () => {
      const classSelect = document.getElementById("planning-print-class-select");
      const termSelect = document.getElementById("planning-print-term-select");
      if (!classSelect || !termSelect) return;

      const selectedClassId = classSelect.value || "";
      const termMeta = getTermOptionsHtml(selectedClassId, "");

      termSelect.innerHTML = termMeta.html;
      termSelect.value = termMeta.selectedTermKey;
    };

    const result = await CustomSwal.fire({
      title: "Imprimir Planejamento",
      html: `
        <div class="text-left space-y-3">
          ${
            shouldChooseClass
              ? `
                <div class="swal-modern-input-group">
                  <label class="swal-modern-label" for="planning-print-class-select">Turma</label>
                  <select id="planning-print-class-select" class="swal-modern-select">
                    ${classes
                      .map(
                        (cls) => `
                          <option value="${cls.id}" ${cls.id === initialClassId ? "selected" : ""}>
                            ${escapeHtml(cls.name || "Turma")}
                          </option>
                        `,
                      )
                      .join("")}
                  </select>
                </div>
              `
              : ""
          }
          <div class="swal-modern-input-group">
            <label class="swal-modern-label" for="planning-print-term-select">Período</label>
            <select id="planning-print-term-select" class="swal-modern-select">
              ${initialTermMeta.html}
            </select>
          </div>
          <label class="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-[var(--stripe-color)]">
            <input type="radio" name="print-option" value="completo" checked />
            <span><strong>Completo</strong><br><span class="text-sm text-secondary">Mostrar todos os temas e aulas</span></span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-[var(--stripe-color)]">
            <input type="radio" name="print-option" value="concluidos" />
            <span><strong>Temas Concluídos</strong><br><span class="text-sm text-secondary">Apenas temas com 100% concluído</span></span>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-[var(--stripe-color)]">
            <input type="radio" name="print-option" value="nao-abordados" />
            <span><strong>Temas Não Abordados</strong><br><span class="text-sm text-secondary">Apenas temas com 0% concluído</span></span>
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Gerar PDF",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const classSelect = document.getElementById("planning-print-class-select");
        if (!classSelect) return;
        classSelect.addEventListener("change", refreshPrintContextFields);
      },
      preConfirm: () => {
        const selectedClassId = shouldChooseClass
          ? document.getElementById("planning-print-class-select")?.value || ""
          : classId || "";
        const selectedTermKey =
          document.getElementById("planning-print-term-select")?.value || "";
        const selected = document.querySelector(
          'input[name="print-option"]:checked',
        )?.value;

        if (!selectedClassId) {
          CustomSwal.showValidationMessage("Selecione uma turma para imprimir.");
          return false;
        }

        if (!selectedTermKey) {
          CustomSwal.showValidationMessage("Selecione um período para imprimir.");
          return false;
        }

        return {
          selectedClassId,
          option: selected || "completo",
          selectedTermKey,
        };
      },
    });

    if (!result.isConfirmed) return;

    const { selectedClassId, option, selectedTermKey } = result.value || {};
    await generatePlanningPDF(selectedClassId, selectedTermKey, option);
  };

  const generatePlanningPDF = async (
    classId,
    termKey,
    option = "completo",
  ) => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color || "#4CAF50";
    const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const classData = state.classes.find((c) => c.id === classId);
    const school = state.schools.find((s) => s.id === classData?.schoolId);
    const planningView = buildPlanningViewModel(classId, termKey, "");
    const planningViews = planningView ? [planningView] : [];
    const termLabel = sanitizePdfText(classData?.name || "Turma");

    const optionLabelMap = {
      completo: "Completo",
      concluidos: "Temas Concluidos",
      "nao-abordados": "Temas Nao Abordados",
    };
    const optionLabel = optionLabelMap[option] || optionLabelMap.completo;

    const filteredPlannings = planningViews.filter((item) => {
      const completion = item?.planningCompletion ?? 0;
      if (option === "completo") return true;
      if (option === "concluidos") return completion === 100;
      if (option === "nao-abordados") return completion === 0;
      return true;
    });

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${classData?.name || "Turma"} - ${termLabel}`,
        data.settings.margin.left,
        footerY,
      );
      doc.text("Sistema actEducacao", pageWidth / 2, footerY, {
        align: "center",
      });
      doc.text(
        `Pagina ${data.pageNumber}`,
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    const title = `Planejamento de aula - ${sanitizePdfText(classData?.name || "Turma")} (${termLabel})`;
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(title, pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(
      `Escola: ${sanitizePdfText(school?.name || "Nao informada")}`,
      14,
      22,
    );
    doc.text(`Turma: ${termLabel}`, 14, 27);
    doc.text(`Tipo: ${optionLabel}`, pageWidth - 14, 27, { align: "right" });

    if (filteredPlannings.length === 0) {
      doc.setFontSize(11);
      doc.text("Nenhum planejamento associado para esta turma.", 14, 42);
      drawFooter({
        settings: { margin: { left: 14, right: 14 } },
        pageNumber: 1,
      });
      doc.save(
        `Planejamento_${sanitizePdfText(classData?.name || "Turma").replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
      );
      await CustomSwal.fire(
        "Sucesso!",
        "PDF gerado e baixado com sucesso.",
        "success",
      );
      return;
    }

    const totalLessonsInPdf = filteredPlannings.reduce(
      (sum, item) => sum + (item?.totalLessons || 0),
      0,
    );
    const completedLessonsInPdf = filteredPlannings.reduce(
      (sum, item) => sum + (item?.totalCompletedLessons || 0),
      0,
    );
    const completionPercentInPdf =
      totalLessonsInPdf > 0
        ? Math.round((completedLessonsInPdf / totalLessonsInPdf) * 100)
        : 0;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(
      `Conteudo ministrado: ${completedLessonsInPdf}/${totalLessonsInPdf} (${completionPercentInPdf}%)`,
      14,
      38,
    );
    doc.setFont(undefined, "normal");

    const tableBody = [];
    filteredPlannings.forEach((planningItem) => {
      const themedProgress = planningItem?.themeViewModels || [];

      themedProgress.forEach((themeProgress, themeIndex) => {
        const { theme, lessons, completionPercent: themeCompletion } =
          themeProgress;
        const themeLabel = `Tema ${String(themeIndex + 1).padStart(2, "0")}: ${sanitizePdfText(theme.title || "Sem titulo")}`;
        const lessonsToRender = lessons || [];

        if (lessonsToRender.length === 0) {
          tableBody.push([themeLabel, "-", `${themeCompletion}%`, "-", "-"]);
          return;
        }

        lessonsToRender.forEach((lessonViewModel) => {
          const lesson = lessonViewModel.lesson || {};
          const lessonIndex = Number(lessonViewModel.lessonIndex || 0);
          const lessonDone = Boolean(lessonViewModel.completed);
          const lessonLabel = `Aula ${String(lessonIndex + 1).padStart(2, "0")}: ${sanitizePdfText(lesson?.title || "Sem titulo")}`;
          const attachments = normalizeAttachments(
            lesson?.attachments || lesson?.subsubtopics || [],
          )
            .map((a) => sanitizePdfText(a))
            .filter(Boolean);

          tableBody.push([
            themeLabel,
            lessonDone ? `OK ${lessonLabel}` : lessonLabel,
            `${themeCompletion}%`,
            lessonDone ? "Ministrado" : "Pendente",
            attachments.length > 0 ? attachments.join(" / ") : "-",
          ]);
        });
      });
    });

    doc.autoTable({
      startY: 42,
      head: [["Tema", "Aula", "% Ministrado", "Status", "Anexos"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: themeColor },
      alternateRowStyles: { fillColor: "#dadada" },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { top: 28 },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const row = data.row.raw;
        if (!Array.isArray(row)) return;

        const aulaCell = String(row[1] || "");
        if (data.column.index === 1 && aulaCell.startsWith("OK ")) {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = "bold";
        }

        const statusCell = String(row[3] || "");
        if (data.column.index === 3) {
          if (statusCell === "Ministrado") {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = "bold";
          }
          if (statusCell === "Pendente") {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      didDrawPage: drawFooter,
    });

    doc.save(
      `Planejamento_${sanitizePdfText(classData?.name || "Turma").replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
    );

    await CustomSwal.fire(
      "Sucesso!",
      "PDF gerado e baixado com sucesso.",
      "success",
    );
  };

  const renderNotesPage = (isEmbedded = false) => {
    const teacherOptions = state.teachers
      .map((t) => `<option value="${t.id}">${t.name}</option>`)
      .join("");

    const content = `
            <div id="notes-page-container" class="space-y-6">
                ${!isEmbedded ? '<h2 class="text-2xl font-bold">Anotações</h2>' : ""}
                <div class="card p-6">
                     <div class="flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <label for="notes-teacher-select" class="block text-sm font-medium mb-1 text-secondary">Selecione o Professor</label>
                            <select id="notes-teacher-select" class="form-select w-full md:w-80">
                                <option value="">-- Selecione para começar --</option>
                                ${teacherOptions}
                            </select>
                        </div>
                        <button id="btn-add-note" class="btn btn-primary" disabled><i class="fas fa-plus mr-2"></i> Nova Anotação</button>
                    </div>
                </div>
                <div id="notes-list-container">
                    <div class="card p-6 text-center text-secondary">
                        <i class="fas fa-arrow-up fa-2x mb-4"></i>
                        <p>Selecione um professor para visualizar as anotações.</p>
                    </div>
                </div>
            </div>`;
    return content;
  };

  const renderTeacherNotesPage = (teacherId) => {
    const teacher = state.teachers.find((t) => t.id === teacherId);
    if (!teacher) return `<p>Professor não encontrado.</p>`;

    const teacherNotes = state.notes
      .filter((n) => n.teacherId === teacherId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const noteRows =
      teacherNotes
        .map(
          (note) => `
            <tr>
                <td>${note.title}</td>
                <td>${new Date(note.date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                <td class="text-right">
                    <button class="btn-edit-note-metadata text-blue-500 hover:text-blue-700 mr-2" data-id="${note.id}" title="Editar Título/Data">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-edit-note-content text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${note.id}" title="Editar Conteúdo (Caderno)">
                        <i class="fas fa-book-open"></i>
                    </button>
                    <button class="btn-delete-note text-red-500 hover:text-red-700" data-id="${note.id}" title="Excluir Anotação">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `,
        )
        .join("") ||
      `<tr><td colspan="3" class="text-center py-4 text-secondary">Nenhuma anotação encontrada.</td></tr>`;

    return `
            <div class="flex items-center mb-6">
                <button id="btn-back-to-teachers" class="mr-4 text-xl hover:text-[var(--theme-color)]"><i class="fas fa-arrow-left"></i></button>
                <h2 class="text-2xl font-bold">Anotações de: ${teacher.name}</h2>
            </div>
            <div class="card p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Minhas Anotações</h3>
                    <button id="btn-add-note" class="btn btn-primary" data-teacher-id="${teacherId}"><i class="fas fa-plus mr-2"></i> Nova Anotação</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead><tr><th>Título</th><th>Data</th><th class="text-right">Ações</th></tr></thead>
                        <tbody>${noteRows}</tbody>
                    </table>
                </div>
            </div>
        `;
  };
  const renderNoteEditorPage = (noteId) => {
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return `<p>Anotação não encontrada.</p>`;

    const fromPage = document.querySelector(
      '.sidebar-item[data-page="organization"].active',
    )
      ? "organization"
      : "school-data";

    return `
            <div class="flex items-center justify-between mb-6">
                 <div class="flex items-center">
                    <button id="btn-back-to-notes" class="mr-4 text-xl hover:text-[var(--theme-color)]" data-teacher-id="${note.teacherId}" data-from="${fromPage}"><i class="fas fa-arrow-left"></i></button>
                    <h2 class="text-2xl font-bold">Editando: ${note.title}</h2>
                </div>
                <button id="btn-save-note" class="btn btn-primary" data-note-id="${noteId}"><i class="fas fa-save mr-2"></i> Salvar Conteúdo</button>
            </div>
            <div class="card p-4">
                <div id="note-editor" style="min-height: 400px;"></div>
            </div>
        `;
  };

  const getUniqueCourses = () => {
    const courseMap = new Map();

    // Adiciona schedules da grade atual
    state.schedules.forEach((schedule) => {
      const key = `${schedule.classId}|${schedule.subjectId}`;
      if (!courseMap.has(key)) {
        const cls = state.classes.find((c) => c.id === schedule.classId);
        const subject = state.subjects.find((s) => s.id === schedule.subjectId);
        if (cls && subject) {
          courseMap.set(key, {
            id: key,
            name: `${cls.name} - ${subject.name}`,
            classId: cls.id,
            subjectId: subject.id,
            schoolId: cls.schoolId,
          });
        }
      }
    });

    // Adiciona schedules de todas as versões da grade horária
    if (state.gradesHorarias && Array.isArray(state.gradesHorarias)) {
      state.gradesHorarias.forEach((grade) => {
        if (grade.schedules && Array.isArray(grade.schedules)) {
          grade.schedules.forEach((schedule) => {
            const key = `${schedule.classId}|${schedule.subjectId}`;
            if (!courseMap.has(key)) {
              const cls = state.classes.find((c) => c.id === schedule.classId);
              const subject = state.subjects.find(
                (s) => s.id === schedule.subjectId,
              );
              if (cls && subject) {
                courseMap.set(key, {
                  id: key,
                  name: `${cls.name} - ${subject.name}`,
                  classId: cls.id,
                  subjectId: subject.id,
                  schoolId: cls.schoolId,
                });
              }
            }
          });
        }
      });
    }

    return Array.from(courseMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  };

  const getScheduledDatesForTerm = (course, termStartDate, termEndDate) => {
    if (!termStartDate || !termEndDate || !course) return [];

    const schoolCalendar = state.calendars[course.schoolId];
    const importantDatesMap = new Map(
      schoolCalendar?.importantDates.map((d) => [d.date, d]),
    );

    const classDates = [];
    let currentDate = new Date(termStartDate + "T12:00:00");
    const endDate = new Date(termEndDate + "T12:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split("T")[0];

      // Obtém a versão da grade vigente NESTA data específica
      const gradeVigente = getGradeHorariaVigente(dateString);

      // Usa os schedules da versão vigente, ou schedules atuais se não houver versão
      let schedulesToUse = state.schedules;
      if (
        gradeVigente &&
        gradeVigente.schedules &&
        gradeVigente.schedules.length > 0
      ) {
        schedulesToUse = gradeVigente.schedules;
      }

      const courseSchedules = schedulesToUse.filter(
        (s) => s.classId === course.classId && s.subjectId === course.subjectId,
      );
      const periodsByDay = courseSchedules.reduce((acc, s) => {
        acc[s.dayOfWeek] = (acc[s.dayOfWeek] || 0) + 1;
        return acc;
      }, {});

      const numPeriods = periodsByDay[dayOfWeek];
      const importantDate = importantDatesMap.get(dateString);
      const isSchoolDay = importantDate ? importantDate.isSchoolDay : true;

      if (numPeriods > 0) {
        classDates.push({
          date: dateString,
          isSchoolDay: isSchoolDay,
          description: importantDate ? importantDate.description : null,
          isPastOrToday: currentDate <= today,
          numPeriods: numPeriods,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return classDates;
  };

  /**
   * Retorna o histórico de turmas pelas quais um aluno passou.
   * Considera alunos que foram transferidos via state.transferHistory.
   */
  const getStudentClassHistory = (studentId) => {
    const student = state.students.find((s) => s.id === studentId);
    if (!student) return [];

    const history = [];

    const movements = (
      Array.isArray(student.classMovements)
        ? student.classMovements
        : (state.transferHistory || []).filter((t) => t.studentId === studentId)
    )
      .filter(
        (m) => m?.fromClassId && m?.toClassId && (m?.date || m?.transferDate),
      )
      .map((m) => ({
        fromClassId: m.fromClassId,
        toClassId: m.toClassId,
        date: m.date || m.transferDate,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    if (movements.length === 0) {
      if (student.classId) {
        history.push({
          classId: student.classId,
          fromDate: null,
          toDate: null,
        });
      }
      return history;
    }

    history.push({
      classId: movements[0].fromClassId,
      fromDate: null,
      toDate: movements[0].date,
    });

    for (let i = 0; i < movements.length - 1; i++) {
      history.push({
        classId: movements[i].toClassId,
        fromDate: movements[i].date,
        toDate: movements[i + 1].date,
      });
    }

    history.push({
      classId: movements[movements.length - 1].toClassId,
      fromDate: movements[movements.length - 1].date,
      toDate: null,
    });

    return history;
  };

  /**
   * Verifica se um aluno estava em uma determinada turma em uma data específica.
   */
  const wasStudentInClassOnDate = (studentId, classId, date) => {
    const history = getStudentClassHistory(studentId);
    const checkDate = new Date(date);

    for (const period of history) {
      if (period.classId !== classId) continue;

      const fromDate = period.fromDate ? new Date(period.fromDate) : null;
      const toDate = period.toDate ? new Date(period.toDate) : null;

      const afterFrom = !fromDate || checkDate >= fromDate;
      const beforeTo = !toDate || checkDate < toDate;

      if (afterFrom && beforeTo) {
        return true;
      }
    }

    return false;
  };

  /**
   * Calcula frequência consolidada de um aluno em um período, considerando TODAS as turmas pelas quais passou.
   */
  const calculateConsolidatedAttendance = (
    studentId,
    subjectId,
    termStart,
    termEnd,
    schoolId,
  ) => {
    const classHistory = getStudentClassHistory(studentId);
    let totalAbsences = 0;
    let totalClasses = 0;

    // Para cada turma pela qual o aluno passou
    classHistory.forEach((period) => {
      const classId = period.classId;

      // Encontra o curso (turma + disciplina)
      const course = getUniqueCourses().find(
        (c) => c.classId === classId && c.subjectId === subjectId,
      );

      if (!course) return;

      // Obtém as datas de aula para esse período
      const classDates = getScheduledDatesForTerm(course, termStart, termEnd);
      const schoolDays = classDates.filter((d) => d.isSchoolDay);

      schoolDays.forEach((d) => {
        // Verifica se o aluno estava nesta turma nesta data
        if (!wasStudentInClassOnDate(studentId, classId, d.date)) {
          return;
        }

        for (let i = 0; i < d.numPeriods; i++) {
          totalClasses += 1;

          const gradeVigente = getGradeHorariaVigente(d.date);
          const versaoSuffix = gradeVigente ? `_v${gradeVigente.versao}` : "";

          const keyWithVersion = `${classId}_${subjectId}_${d.date}_${i}${versaoSuffix}`;
          const keyOld = `${classId}_${subjectId}_${d.date}_${i}`;
          const attendanceStatus =
            state.attendance[keyWithVersion]?.[studentId] ??
            state.attendance[keyOld]?.[studentId];

          if (attendanceStatus === "absent") totalAbsences++;
        }
      });
    });

    const frequency =
      totalClasses > 0
        ? ((totalClasses - totalAbsences) / totalClasses) * 100
        : 100;
    return { absences: totalAbsences, totalClasses, frequency };
  };

  const renderDiaryPage = () => {
    const courseOptions = getUniqueCourses()
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
    return `
            <div id="diary-page-container">
                <div class="card p-6">
                    <div class="flex flex-wrap items-start gap-4 mb-4">
                        <h2 class="text-2xl font-bold">Diário de Classe</h2>
                      <div class="flex-grow">
                        <div class="flex flex-wrap items-center gap-4">
                            <select id="diary-course-select" class="form-select w-auto flex-grow">
                                <option value="">Selecione Turma e Disciplina...</option>
                                ${courseOptions}
                            </select>
                            <div id="term-selector-container" class="flex-grow"></div>
                        </div>
                        <label class="mt-2 inline-flex items-center text-sm text-secondary">
                        <input id="diary-active-only-toggle" type="checkbox" class="form-checkbox mr-2" checked>
                        Exibir apenas alunos ativos
                        </label>
                        </div>
                    </div>
                     <div id="class-info-container" class="w-full text-right font-semibold text-secondary mb-4 space-x-6"></div>
                     <div id="diary-actions-container-top" class="text-right mb-4"></div>
                    
                    <div class="border-b border-color">
                        <nav id="diary-tabs" class="flex flex-wrap" aria-label="Tabs">
                            <button data-tab="attendance" class="page-tab active"><i class="fas fa-calendar-check fa-fw"></i>Frequência</button>
                            <button data-tab="content" class="page-tab"><i class="fas fa-book-open fa-fw"></i>Registro de Aulas</button>
                            <button data-tab="homework" class="page-tab"><i class="fas fa-pencil-ruler fa-fw"></i>Atividades em Sala</button>
                          <button data-tab="occurrences" class="page-tab"><i class="fas fa-triangle-exclamation fa-fw"></i>Ocorrências</button>
                            <button data-tab="assessments" class="page-tab"><i class="fas fa-award fa-fw"></i>Avaliações</button>
                            <button data-tab="bulletins" class="page-tab"><i class="fas fa-graduation-cap fa-fw"></i>Boletins</button>
                        </nav>
                    </div>

                    <div id="diary-tab-content" class="pt-6">
                        <p class="text-center text-secondary">Selecione uma turma, disciplina e período para carregar os dados.</p>
                    </div>

                    <div id="diary-actions-container-bottom" class="mt-6"></div>
                </div>
            </div>`;
  };

  const generateAttendanceGrid = (course, classDates, options = {}) => {
    const onlyActive = options.onlyActive !== false;
    const studentsInClass = getDiaryStudentsForClass(
      course.classId,
      onlyActive,
    );

    const remanejadosFromClass = onlyActive
      ? []
      : state.students
          .map((student) => {
            if (student.classId === course.classId) return null;

            const movements = Array.isArray(student.classMovements)
              ? student.classMovements
                  .filter(
                    (movement) =>
                      movement?.type === "remanejamento" &&
                      movement?.fromClassId === course.classId,
                  )
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
              : [];

            if (movements.length === 0) return null;

            return {
              ...student,
              __isRemanejadoOrigem: true,
              __originMovement: movements[0],
            };
          })
          .filter(Boolean);

    const students = [...studentsInClass];

    remanejadosFromClass
      .sort((a, b) => {
        const posA = Number(a.__originMovement?.fromPosition) || 999;
        const posB = Number(b.__originMovement?.fromPosition) || 999;
        return posA - posB || a.name.localeCompare(b.name);
      })
      .forEach((student) => {
        const originalPosition = Number(student.__originMovement?.fromPosition);
        if (Number.isFinite(originalPosition) && originalPosition > 0) {
          const insertIndex = Math.min(
            Math.max(originalPosition - 1, 0),
            students.length,
          );
          students.splice(insertIndex, 0, student);
          return;
        }

        const originalNumber = Number(student.__originMovement?.fromNumber);
        if (Number.isFinite(originalNumber) && originalNumber > 0) {
          const insertIndex = students.findIndex((current) => {
            const currentNumber = current.__isRemanejadoOrigem
              ? Number(current.__originMovement?.fromNumber)
              : Number(current.number);
            return (
              Number.isFinite(currentNumber) && currentNumber > originalNumber
            );
          });

          if (insertIndex >= 0) {
            students.splice(insertIndex, 0, student);
          } else {
            students.push(student);
          }
          return;
        }

        students.push(student);
      });

    if (students.length === 0) {
      return {
        gridHtml: `<p class="text-center text-secondary">Nenhum aluno encontrado para os filtros selecionados.</p>`,
        actionsHtml: "",
      };
    }
    if (classDates.length === 0) {
      return {
        gridHtml: `<p class="text-center text-secondary">Nenhuma aula encontrada para o período selecionado.</p>`,
        actionsHtml: "",
      };
    }

    const headers = classDates
      .flatMap((d) => {
        const dateParts = d.date.split("-");
        const formattedDate = `${dateParts[2]}/${dateParts[1]}`;
        const dayClass = d.isSchoolDay ? "date-header" : "non-school-day";
        const title = d.description
          ? `${d.description} (Não Letivo)`
          : d.isSchoolDay
            ? "Clique para ações / Filtre faltas"
            : "Dia Não Letivo";
        const filterIcon = d.isSchoolDay
          ? `<i class="fas fa-filter filter-icon" data-date-col="${d.date}" title="Filtrar faltas"></i>`
          : "";

        let dayHeaders = [];
        for (let i = 0; i < d.numPeriods; i++) {
          const periodLabel = d.numPeriods > 1 ? ` (${i + 1})` : "";
          dayHeaders.push(
            `<th class="${dayClass}" data-date-col="${d.date}" title="${title}">${formattedDate}${periodLabel} ${filterIcon}</th>`,
          );
        }
        return dayHeaders;
      })
      .join("");

    const footerCells = classDates
      .flatMap((d) => {
        let dayFooters = [];
        for (let i = 0; i < d.numPeriods; i++) {
          dayFooters.push(`<td data-total-absent-for="${d.date}_${i}">0</td>`);
        }
        return dayFooters;
      })
      .join("");

    const presentFooterCells = classDates
      .flatMap((d) => {
        let dayFooters = [];
        for (let i = 0; i < d.numPeriods; i++) {
          dayFooters.push(`<td data-total-present-for="${d.date}_${i}">0</td>`);
        }
        return dayFooters;
      })
      .join("");

    const studentRows = students
      .map((student) => {
        const isRemanejadoOrigem = !!student.__isRemanejadoOrigem;
        const movementToCurrentClass = Array.isArray(student.classMovements)
          ? [...student.classMovements]
              .filter(
                (movement) =>
                  movement?.type === "remanejamento" &&
                  movement?.toClassId === course.classId,
              )
              .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
          : null;

        const displayNumber = isRemanejadoOrigem
          ? (student.__originMovement?.fromNumber ?? "-")
          : student.number || "-";
        const studentStatus = isRemanejadoOrigem
          ? "remanejado"
          : student.status || "ativo";
        const rowTitle = isRemanejadoOrigem
          ? "Aluno remanejado (turma de origem)"
          : studentStatus !== "ativo"
            ? `${student.name} (${studentStatus})`
            : student.name;
        const displayName = abbreviateStudentName(student.name);
        const rowClass = studentStatus !== "ativo" ? "student-inactive" : "";

        return `<tr data-student-row-id="${student.id}" class="${rowClass}">
                        <td class="student-name" title="${rowTitle}"><span class="font-bold text-secondary mr-2">${displayNumber}</span>${displayName}</td>
                        ${classDates
                          .flatMap((d) => {
                            let dayCells = [];
                            for (let i = 0; i < d.numPeriods; i++) {
                              if (!d.isSchoolDay) {
                                dayCells.push(
                                  `<td><div class="attendance-cell disabled" title="${d.description || "Dia não letivo"}"><i class="fas fa-ban"></i></div></td>`,
                                );
                              } else {
                                // Obtém versão vigente da grade para a data
                                const gradeVigente = getGradeHorariaVigente(
                                  d.date,
                                );
                                const versaoSuffix = gradeVigente
                                  ? `_v${gradeVigente.versao}`
                                  : "";

                                // Tenta buscar com versão, se não encontrar, busca sem versão (dados antigos)
                                const attendanceKeyWithVersion = `${course.classId}_${course.subjectId}_${d.date}_${i}${versaoSuffix}`;
                                const attendanceKeyOld = `${course.classId}_${course.subjectId}_${d.date}_${i}`;
                                const savedStatus =
                                  state.attendance[attendanceKeyWithVersion]?.[
                                    student.id
                                  ] ??
                                  state.attendance[attendanceKeyOld]?.[
                                    student.id
                                  ];
                                const status =
                                  savedStatus !== undefined
                                    ? savedStatus
                                    : "unset";
                                const statusText = {
                                  present: "P",
                                  absent: "F",
                                  excused: "J",
                                  unset: "",
                                }[status];

                                const transferDate = isRemanejadoOrigem
                                  ? student.__originMovement?.date
                                  : movementToCurrentClass?.date;
                                const lockByTransfer = transferDate
                                  ? isRemanejadoOrigem
                                    ? d.date >= transferDate
                                    : d.date < transferDate
                                  : false;
                                const lockClass = lockByTransfer
                                  ? " disabled"
                                  : "";
                                const lockTitle = lockByTransfer
                                  ? isRemanejadoOrigem
                                    ? "Frequência bloqueada após a data de remanejamento na turma de origem."
                                    : "Frequência bloqueada antes da data de remanejamento na turma de destino."
                                  : "";
                                const displayText = lockByTransfer
                                  ? '<i class="fas fa-lock"></i>'
                                  : statusText;

                                dayCells.push(
                                  `<td><div class="attendance-cell${lockClass}" data-status="${status}" data-student-id="${student.id}" data-date="${d.date}" data-period-index="${i}" ${lockTitle ? `title="${lockTitle}"` : ""}>${displayText}</div></td>`,
                                );
                              }
                            }
                            return dayCells;
                          })
                          .join("")}
                        <td class="freq-col" data-freq-cell-id="${student.id}">-</td>
                    </tr>`;
      })
      .join("");

    const gridHtml = `<div id="filter-status-container" class="hidden"></div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full attendance-table">
                                <thead>
                                    <tr>
                                        <th class="student-name">Aluno</th>
                                        ${headers}
                                        <th class="freq-col">% Faltas</th>
                                    </tr>
                                </thead>
                                <tbody>${studentRows}</tbody>
                                <tfoot>
                                    <tr>
                                        <td><strong>Total de Faltas</strong></td>
                                        ${footerCells}
                                        <td></td>
                                    </tr>
                                  <tr>
                                    <td><strong>Alunos Presentes</strong></td>
                                    ${presentFooterCells}
                                    <td></td>
                                  </tr>
                                </tfoot>
                            </table>
                        </div>`;
    const actionsHtml = `<div class="flex justify-between items-center mt-6">
                                <div class="flex items-center space-x-6">
                                    <div class="flex items-center"><div class="w-4 h-4 rounded-full bg-[#4CAF50] mr-2"></div><span>Presente (P)</span></div>
                                    <div class="flex items-center"><div class="w-4 h-4 rounded-full bg-[#f44336] mr-2"></div><span>Falta (F)</span></div>
                                    <div class="flex items-center"><div class="w-4 h-4 rounded-full bg-[#2196F3] mr-2"></div><span>Justificado (J)</span></div>
                                     <div class="flex items-center"><div class="w-4 h-4 rounded-full bg-[var(--disabled-cell-bg)] border border-gray-400 mr-2"></div><span>Não Letivo</span></div>
                                </div>
                                <button id="btn-save-attendance" class="btn btn-primary"><i class="fas fa-save mr-2"></i>Salvar Frequência</button>
                            </div>`;
    return { gridHtml, actionsHtml };
  };

  /**
   * CORRE�!ÒO: A função agora lê o status da frequência diretamente dos elementos da tela (DOM),
   * garantindo que o cálculo seja refeito em tempo real sempre que uma célula é alterada,
   * em vez de depender do estado salvo que só é atualizado ao clicar em "Salvar".
   */
  const updateAttendanceCalculations = (course, classDates) => {
    if (!mainContent.querySelector(".attendance-table")) return; // Sai se a tabela não estiver na página

    const today = new Date().toISOString().split("T")[0];
    const pastOrTodaySchoolDates = classDates.filter(
      (d) => d.isSchoolDay && d.date <= today,
    );
    const totalClassesGiven = pastOrTodaySchoolDates.reduce(
      (total, day) => total + day.numPeriods,
      0,
    );

    const studentRows = mainContent.querySelectorAll(
      "tbody tr[data-student-row-id]",
    );

    studentRows.forEach((row) => {
      const studentId = row.dataset.studentRowId;
      let studentAbsences = 0;

      // Itera pelas datas para encontrar as células relevantes para este aluno
      pastOrTodaySchoolDates.forEach((d) => {
        for (let i = 0; i < d.numPeriods; i++) {
          // Lê o status diretamente do atributo data-status da célula no DOM
          const cell = mainContent.querySelector(
            `.attendance-cell[data-student-id="${studentId}"][data-date="${d.date}"][data-period-index="${i}"]`,
          );
          if (cell && cell.dataset.status === "absent") {
            studentAbsences++;
          }
        }
      });

      const freqCell = row.querySelector(`[data-freq-cell-id="${studentId}"]`);
      if (freqCell) {
        if (totalClassesGiven > 0) {
          const absencePercent = (studentAbsences / totalClassesGiven) * 100;
          freqCell.textContent = `${absencePercent.toFixed(0)}%`;

          freqCell.classList.remove("freq-warning", "freq-danger");
          if (absencePercent > 50) {
            freqCell.classList.add("freq-danger");
          } else if (absencePercent > 25) {
            freqCell.classList.add("freq-warning");
          }
        } else {
          freqCell.textContent = "0%";
          freqCell.classList.remove("freq-warning", "freq-danger");
        }
      }
    });

    // Atualiza os totais do rodapé (faltas por dia)
    classDates.forEach((d) => {
      for (let i = 0; i < d.numPeriods; i++) {
        const totalAbsentCell = mainContent.querySelector(
          `[data-total-absent-for="${d.date}_${i}"]`,
        );
        const totalPresentCell = mainContent.querySelector(
          `[data-total-present-for="${d.date}_${i}"]`,
        );
        if (totalAbsentCell || totalPresentCell) {
          let dailyAbsences = 0;
          let dailyPresents = 0;
          if (d.isSchoolDay) {
            // Soma faltas e presenças para este dia/aula a partir do DOM
            studentRows.forEach((row) => {
              const studentId = row.dataset.studentRowId;
              const cell = mainContent.querySelector(
                `.attendance-cell[data-student-id="${studentId}"][data-date="${d.date}"][data-period-index="${i}"]`,
              );
              if (cell) {
                if (cell.dataset.status === "absent") {
                  dailyAbsences++;
                } else if (cell.dataset.status === "present") {
                  dailyPresents++;
                }
              }
            });
          }
          if (totalAbsentCell) {
            totalAbsentCell.textContent =
              dailyAbsences > 0 ? dailyAbsences : "-";
          }
          if (totalPresentCell) {
            totalPresentCell.textContent =
              dailyPresents > 0 ? dailyPresents : "-";
          }
        }
      }
    });
  };

  const normalizePlanningHistoryText = (value = "") => {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getContentHistoryByClassTerm = (classId, termKey, subjectId = "") => {
    const [termStartDate, termEndDate] = String(termKey || "").split("|");
    if (!termStartDate || !termEndDate) return [];

    const prefix = `${classId}_`;
    const suffix = `_${termStartDate}_${termEndDate}`;

    return Object.entries(state.content || {})
      .filter(([key]) => {
        if (!key.startsWith(prefix) || !key.endsWith(suffix)) return false;
        if (!subjectId) return true;
        return key === `${classId}_${subjectId}_${termStartDate}_${termEndDate}`;
      })
      .flatMap(([, content]) => Object.values(content?.dailyRecords || {}))
      .map((record) =>
        normalizePlanningHistoryText(
          `${record?.content || ""}\n${record?.observations || ""}`,
        ),
      )
      .filter(Boolean);
  };

  const buildPlanningViewModel = (classId, termKey, subjectId = "") => {
    const planning = getAssociatedPlanningForClass(classId, termKey);
    if (!planning) return null;

    const historyEntries = getContentHistoryByClassTerm(classId, termKey, subjectId);
    const themes = getPlanningThemes(planning);

    const themeViewModels = themes.map((theme, themeIndex) => {
      const lessons = getThemeLessons(theme).map((lesson, lessonIndex) => {
        const lessonTitle = String(lesson?.title || "").trim();
        const normalizedLessonTitle = normalizePlanningHistoryText(lessonTitle);
        const doneByHistory =
          normalizedLessonTitle &&
          historyEntries.some((entry) => entry.includes(normalizedLessonTitle));
        const lessonDone = Boolean(lesson.completed || doneByHistory);

        const attachments = normalizeAttachments(
          lesson.attachments || lesson.subsubtopics || [],
        ).map((attachment, attachmentIndex) => {
          const normalizedAttachment = normalizePlanningHistoryText(attachment);
          const attachmentDone =
            normalizedAttachment &&
            historyEntries.some((entry) => entry.includes(normalizedAttachment));
          return {
            id: `${themeIndex}-${lessonIndex}-${attachmentIndex}`,
            title: attachment,
            completed: Boolean(attachmentDone),
          };
        });

        return {
          id: `${themeIndex}-${lessonIndex}`,
          title: lessonTitle || "Sem título",
          completed: lessonDone,
          attachments,
          lesson,
          lessonIndex,
        };
      });

      const totalLessons = lessons.length;
      const completedLessons = lessons.filter((lesson) => lesson.completed).length;
      const completionPercent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        index: themeIndex,
        title: theme.title || `Tema ${String(themeIndex + 1).padStart(2, "0")}`,
        completionPercent,
        lessons,
        totalLessons,
        completedLessons,
        theme,
      };
    });

    const totalLessons = themeViewModels.reduce(
      (sum, theme) => sum + theme.totalLessons,
      0,
    );
    const totalCompletedLessons = themeViewModels.reduce(
      (sum, theme) => sum + theme.completedLessons,
      0,
    );
    const planningCompletion =
      totalLessons > 0
        ? Math.round((totalCompletedLessons / totalLessons) * 100)
        : 0;

    return {
      planning,
      themeViewModels,
      totalLessons,
      totalCompletedLessons,
      planningCompletion,
    };
  };

  const openViewPlanningModal = async (classId, termKey, subjectId = "") => {
    const planningView = buildPlanningViewModel(classId, termKey, subjectId);
    if (!planningView) {
      await CustomSwal.fire({
        icon: "info",
        title: "Nenhum planejamento associado",
        text: "Esta turma não possui planejamento associado para o período selecionado.",
      });
      return;
    }

    const { planning, themeViewModels, planningCompletion } = planningView;

    const themesHtml =
      themeViewModels
        .map((theme) => {
          const lessonsHtml = theme.lessons.length
            ? theme.lessons
                .map((lesson, lessonIndex) => {
                  const lessonStatusClass = lesson.completed
                    ? "is-completed"
                    : "is-pending";
                  const attachmentsHtml = lesson.attachments.length
                    ? `<div class="planning-link-anexos planning-view-anexos">${lesson.attachments
                        .map(
                          (attachment, attachmentIndex) => `
                            <div class="planning-view-anexo-item ${attachment.completed ? "is-completed" : "is-pending"}">
                              <i class="fas ${attachment.completed ? "fa-check-circle" : "fa-circle"}"></i>
                              <span>${attachmentIndex + 1}. ${escapeHtml(attachment.title)}</span>
                            </div>
                          `,
                        )
                        .join("")}</div>`
                    : "";

                  return `
                    <div class="planning-link-aula-container">
                      <div class="planning-link-aula-item planning-view-item ${lessonStatusClass}">
                        <i class="fas ${lesson.completed ? "fa-check-circle" : "fa-circle"}"></i>
                        <span>Aula ${String(lessonIndex + 1).padStart(2, "0")}: ${escapeHtml(lesson.title)}</span>
                      </div>
                      ${attachmentsHtml}
                    </div>
                  `;
                })
                .join("")
            : '<span class="text-secondary text-sm">Nenhuma aula cadastrada.</span>';

          return `
            <details class="planning-link-tema">
              <summary>
                <strong>Tema ${String(theme.index + 1).padStart(2, "0")}: ${escapeHtml(theme.title || "Sem título")}</strong>
                <span class="planning-progress-badge">${theme.completionPercent}% concluído</span>
              </summary>
              <div class="planning-link-aulas-wrap">
                <div class="planning-link-aulas">${lessonsHtml}</div>
              </div>
            </details>
          `;
        })
        .join("") || `<p class="text-secondary">Nenhum tema cadastrado.</p>`;

    await CustomSwal.fire({
      title: `${escapeHtml(planning.title || "Planejamento")} - ${planningCompletion}% concluído`,
      html: `<div class="planning-link-modal-body planning-view-modal-body">${themesHtml}</div>`,
      confirmButtonText: "Fechar",
      showCancelButton: false,
      customClass: {
        popup: "planning-link-modal-popup planning-view-modal-popup",
        htmlContainer: "planning-link-modal-html planning-view-modal-html",
        confirmButton: "btn planning-view-btn-close",
      },
    });
  };

  const openPlanningLinkModal = async (
    classId,
    subjectId,
    termKey,
    onConfirm,
  ) => {
    const planning = getAssociatedPlanningForClass(classId, termKey);
    if (!planning) {
      await CustomSwal.fire({
        icon: "info",
        title: "Nenhum planejamento",
        text: "Não há planejamento associado para esta turma.",
      });
      return;
    }

    const accordionsHtml = getPlanningThemes(planning)
      .map((theme, themeIndex) => {
        const lessonsHtml = getThemeLessons(theme)
          .map((lesson, lessonIndex) => {
            const lessonLabel = `Aula ${String(lessonIndex + 1).padStart(2, "0")}: ${escapeHtml(lesson.title || "Sem título")}`;
            const attachmentsHtml = normalizeAttachments(
              lesson.attachments || lesson.subsubtopics || [],
            )
              .map(
                (attachment, attachmentIndex) => `
                  <label class="planning-link-anexo-item">
                    <input type="checkbox" class="planning-link-anexo-check" value="${escapeHtml(attachment)}" />
                    <span>${attachmentIndex + 1}. ${escapeHtml(attachment)}</span>
                  </label>
                `,
              )
              .join("");

            return `<div class="planning-link-aula-container">
              <label class="planning-link-aula-item">
                <input type="checkbox" class="planning-link-aula-check" value="${escapeHtml(lesson.title || "")}" data-theme-label="${escapeHtml(theme.title || `Tema ${String(themeIndex + 1).padStart(2, "0")}`)}" />
                <span>${lessonLabel}</span>
              </label>
              ${attachmentsHtml ? `<div class="planning-link-anexos">${attachmentsHtml}</div>` : ""}
            </div>`;
          })
          .join("");

        return `<details class="planning-link-tema">
          <summary><strong>Tema ${String(themeIndex + 1).padStart(2, "0")}: ${escapeHtml(theme.title || "Sem título")}</strong></summary>
          <div class="planning-link-aulas-wrap">
            <div class="planning-link-aulas">${lessonsHtml || '<span class="text-secondary text-sm">Nenhuma aula cadastrada.</span>'}</div>
          </div>
        </details>`;
      })
      .join("");

    const result = await CustomSwal.fire({
      title: "Vincular ao Planejamento",
      html: `<div class="planning-link-modal-body">${accordionsHtml}</div>`,
      customClass: {
        popup: "planning-link-modal-popup",
        htmlContainer: "planning-link-modal-html",
        confirmButton: "btn planning-link-btn-confirm",
        cancelButton: "btn planning-link-btn-cancel",
      },
      showCancelButton: true,
      confirmButtonText: "Inserir",
      cancelButtonText: "Cancelar",
      didOpen: (popup) => {
        const temas = Array.from(popup.querySelectorAll(".planning-link-tema"));

        temas.forEach((temaAtual) => {
          temaAtual.addEventListener("toggle", () => {
            if (!temaAtual.open) return;

            temas.forEach((outroTema) => {
              if (outroTema !== temaAtual) {
                outroTema.open = false;
              }
            });

            const scrollContainer = popup.querySelector(
              ".planning-link-modal-html",
            );
            if (scrollContainer) {
              // Força recálculo para a barra de rolagem refletir a nova altura.
              scrollContainer.scrollTop = scrollContainer.scrollTop;
            }
          });
        });
      },
      preConfirm: () => {
        const aulas = Array.from(
          Swal.getPopup().querySelectorAll(".planning-link-aula-check:checked"),
        ).map((cb) => ({
          themeLabel: decodeHtmlEntities(cb.dataset.themeLabel || ""),
          title: decodeHtmlEntities(cb.value),
        }));
        const anexos = Array.from(
          Swal.getPopup().querySelectorAll(
            ".planning-link-anexo-check:checked",
          ),
        ).map((cb) => decodeHtmlEntities(cb.value));
        if (aulas.length === 0 && anexos.length === 0) {
          Swal.showValidationMessage("Selecione ao menos uma aula ou anexo.");
          return false;
        }

        const groupedAulas = aulas.reduce((groups, aula) => {
          const existingGroup = groups.find(
            (group) => group.themeLabel === aula.themeLabel,
          );

          if (existingGroup) {
            existingGroup.titles.push(aula.title);
          } else {
            groups.push({
              themeLabel: aula.themeLabel,
              titles: [aula.title],
            });
          }

          return groups;
        }, []);

        return { aulas: groupedAulas, anexos };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    onConfirm(result.value);
  };

  const generateContentGrid = (
    course,
    classDates,
    termStartDate,
    termEndDate,
  ) => {
    const schoolDays = classDates.filter((d) => d.isSchoolDay);
    if (schoolDays.length === 0) {
      return {
        gridHtml: `<p class="text-center text-secondary py-8">Nenhuma aula letiva encontrada para o período selecionado.</p>`,
        actionsHtml: "",
      };
    }

    const termKey = `${course.classId}_${course.subjectId}_${termStartDate}_${termEndDate}`;
    const termContent = state.content[termKey] || { dailyRecords: {} };

    const rows = schoolDays
      .flatMap((d) => {
        const dateRows = [];
        for (let i = 0; i < d.numPeriods; i++) {
          // Obtém versão vigente da grade para a data
          const gradeVigente = getGradeHorariaVigente(d.date);
          const versaoSuffix = gradeVigente ? `_v${gradeVigente.versao}` : "";

          // Tenta buscar com versão, se não encontrar, busca sem versão (dados antigos)
          const lessonKeyWithVersion = `${d.date}_${i}${versaoSuffix}`;
          const lessonKeyOld = `${d.date}_${i}`;
          const dayRecord = termContent.dailyRecords[lessonKeyWithVersion] ||
            termContent.dailyRecords[lessonKeyOld] || {
              content: "",
              observations: "",
            };
          const formattedDate = new Date(
            d.date + "T12:00:00",
          ).toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          });
          const periodBadge =
            d.numPeriods > 1
              ? `<span class="dobradinha-badge">${i + 1}ª aula</span>`
              : "";

          let autoObservation = d.description ? `${d.description}` : "";
          let finalObservation = dayRecord.observations;
          if (autoObservation && !finalObservation.includes(autoObservation)) {
            finalObservation = `${autoObservation}\n${finalObservation}`.trim();
          }

          dateRows.push(`
                <tr>
                    <td class="whitespace-nowrap align-top pt-5 font-medium">
                      <div>${formattedDate} ${periodBadge}</div>
                      <button class="btn-link-planning-content" title="Vincular ao Planejamento"
                        data-class-id="${course.classId}"
                        data-subject-id="${course.subjectId}"
                        data-term-key="${termStartDate}|${termEndDate}"
                        data-date="${d.date}"
                        data-period-index="${i}">
                        <i class="fas fa-link"></i>
                      </button>
                    </td>
                    <td><textarea class="form-textarea" data-date="${d.date}" data-period-index="${i}" data-field="content" placeholder="Descreva o conteúdo da aula...">${dayRecord.content}</textarea></td>
                    <td><textarea class="form-textarea" data-date="${d.date}" data-period-index="${i}" data-field="observations" placeholder="Observações...">${finalObservation}</textarea></td>
                </tr>`);
        }
        return dateRows;
      })
      .join("");

    const gridHtml = `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr>
                            <th class="w-[160px]">Data</th>
                            <th>Conteúdo Ministrado</th>
                            <th>Observações</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;

    const planningTermKey = `${termStartDate}|${termEndDate}`;
    const actionsHtml = `
      <div class="flex flex-wrap items-center justify-between mt-6 gap-2">
        <div>
          <button class="btn btn-subtle btn-view-planning" data-class-id="${course.classId}" data-subject-id="${course.subjectId}" data-term-key="${planningTermKey}"><i class="fas fa-book-open mr-2"></i>Ver planejamento</button>
        </div>
        <div>
          <button class="btn btn-primary btn-save-content"><i class="fas fa-save mr-2"></i>Salvar Registros</button>
        </div>
      </div>`;

    return { gridHtml, actionsHtml };
  };

  const renderCalendarPage = (params = {}) => {
    if (state.schools.length === 0) {
      return `<div class="card p-6 text-center">
                <h3 class="text-xl font-bold mb-2">Nenhuma Escola Cadastrada</h3>
                <p class="text-secondary">Por favor, cadastre uma escola na aba "Escolas" para gerenciar o calendário.</p>
            </div>`;
    }

    // ALTERADO: Marca a escola como selected se params.schoolId existir
    const schoolOptions = state.schools
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === params.schoolId ? "selected" : ""}>${s.name}</option>`,
      )
      .join("");

    // ALTERADO: Gera o conteúdo inicial se a escola já estiver selecionada
    const initialContent = params.schoolId
      ? generateCalendarContentHTML(params.schoolId)
      : "";

    return `
        <div id="calendar-page-container">
            <div class="space-y-6">
                <div class="card p-6">
                    <label for="calendar-school-select" class="block text-lg font-bold mb-3">Selecione uma Escola</label>
                    <select id="calendar-school-select" class="form-select">
                        <option value="">-- Selecione --</option>
                        ${schoolOptions}
                    </select>
                </div>
                <div id="calendar-content-wrapper">${initialContent}</div>
            </div>
        </div>`;
  };

  const generateCalendarContentHTML = (schoolId) => {
    if (!schoolId) return "";

    const schoolCalendar = state.calendars[schoolId] || {
      termType: "bimestre",
      terms: [],
      importantDates: [],
      scheduleConfig: {
        morning: { periodsPerDay: 5, periods: [] },
        afternoon: { periodsPerDay: 0, periods: [] },
      },
    };
    const { termType, terms, importantDates } = schoolCalendar;

    const termCount = termType === "bimestre" ? 4 : 3;
    const termTypeName = termType === "bimestre" ? "Bimestre" : "Trimestre";

    let termInputsHTML = "";
    for (let i = 1; i <= termCount; i++) {
      const termData = terms.find((t) => t.id === i) || {
        startDate: "",
        endDate: "",
      };
      termInputsHTML += `
            <div class="grid grid-cols-[1fr,auto,auto] gap-3 items-center">
                <label for="term-start-${i}" class="font-semibold text-secondary">${i}º ${termTypeName}</label>
                <input type="date" id="term-start-${i}" class="form-input" data-term-id="${i}" data-field="startDate" value="${termData.startDate}">
                <input type="date" id="term-end-${i}" class="form-input" data-term-id="${i}" data-field="endDate" value="${termData.endDate}">
            </div>`;
    }

    const sortedDates = importantDates.sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const importantDatesListHTML = sortedDates
      .map((d) => {
        const formattedDate = new Date(d.date + "T12:00:00").toLocaleDateString(
          "pt-BR",
        );
        const schoolDayText = d.isSchoolDay ? "Sim" : "Não";
        const schoolDayClass = d.isSchoolDay
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800";
        return `
            <tr>
                <td>${formattedDate}</td>
                <td class="break-words">${d.description}</td>
                <td><span class="px-2 py-1 text-xs font-semibold rounded-full ${schoolDayClass}">${schoolDayText}</span></td>
                <td class="text-right">
                    <button class="btn-edit-date text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] p-1 mr-1" data-id="${d.id}" title="Editar Data">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-date text-red-500 hover:text-red-700 p-1" data-id="${d.id}" title="Excluir Data">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
      })
      .join("");

    return `
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div class="card p-6">
                <h3 class="text-xl font-bold mb-4">Períodos Letivos</h3>
                <div class="flex items-center gap-6 mb-6">
                    <label class="flex items-center cursor-pointer"><input type="radio" name="termType" value="bimestre" class="form-radio mr-2" ${termType === "bimestre" ? "checked" : ""}> Bimestres</label>
                    <label class="flex items-center cursor-pointer"><input type="radio" name="termType" value="trimestre" class="form-radio mr-2" ${termType === "trimestre" ? "checked" : ""}> Trimestres</label>
                </div>
                <div id="terms-container" class="space-y-4 mb-6">${termInputsHTML}</div>
                <div class="text-right">
                    <button id="btn-save-terms" class="btn btn-primary">Salvar Períodos</button>
                </div>
            </div>
            <div class="card p-6">
                <h3 class="text-xl font-bold mb-4">Datas Importantes</h3>
                <form id="form-add-date" class="grid grid-cols-1 md:grid-cols-[auto,1fr,auto,auto] gap-3 items-end mb-6 p-4 rounded-lg" style="background-color: var(--bg-primary); border: 1px solid var(--border-color);">
                    <div>
                        <label for="new-date-input" class="block text-sm font-medium text-secondary">Data</label>
                        <input type="date" id="new-date-input" class="form-input mt-1" required>
                    </div>
                    <div>
                        <label for="new-desc-input" class="block text-sm font-medium text-secondary">Descrição</label>
                        <input type="text" id="new-desc-input" class="form-input mt-1" placeholder="Ex: Conselho de Classe" required>
                    </div>
                    <div class="flex items-center h-[42px] pt-5">
                         <label class="flex items-center cursor-pointer"><input type="checkbox" id="new-is-school-day-input" class="form-checkbox h-4 w-4 rounded mr-2" checked>Dia Letivo</label>
                    </div>
                    <button type="submit" class="btn btn-primary h-[42px]">Adicionar</button>
                </form>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead><tr><th class="w-1/4">Data</th><th>Evento</th><th class="w-1/6">Letivo?</th><th class="w-1/6 text-right">Ação</th></tr></thead>
                        <tbody id="important-dates-list">
                            ${sortedDates.length > 0 ? importantDatesListHTML : `<tr><td colspan="4" class="text-center py-4 text-secondary">Nenhuma data importante cadastrada.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
  };

  const renderScheduleGridPage = (params = {}) => {
    if (state.schools.length === 0) {
      return `<div class="card p-6 text-center"><h3 class="text-xl font-bold mb-2">Nenhuma Escola Cadastrada</h3><p class="text-secondary">Por favor, cadastre uma escola para gerenciar a grade horária.</p></div>`;
    }
    if (state.teachers.length === 0) {
      return `<div class="card p-6 text-center"><h3 class="text-xl font-bold mb-2">Nenhum Professor Cadastrado</h3><p class="text-secondary">Por favor, cadastre um professor para montar uma grade horária.</p></div>`;
    }

    const schoolOptions = state.schools
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === params.schoolId ? "selected" : ""}>${s.name}</option>`,
      )
      .join("");

    // Mostra versão vigente e cria seletor de versões
    const today = new Date().toISOString().split("T")[0];
    const currentVersion = state.gradesHorarias?.find(
      (v) => today >= v.dataInicio && today <= v.dataFim,
    );

    // Cria opções do seletor de versões
    const versionOptions =
      state.gradesHorarias && state.gradesHorarias.length > 0
        ? state.gradesHorarias
            .map((v) => {
              const inicio = new Date(
                v.dataInicio + "T12:00:00",
              ).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              });
              const fim = new Date(v.dataFim + "T12:00:00").toLocaleDateString(
                "pt-BR",
                { day: "2-digit", month: "2-digit" },
              );
              const isCurrent =
                currentVersion && v.versao === currentVersion.versao;
              return `<option value="${v.versao}" ${params.versao && params.versao == v.versao ? "selected" : !params.versao && isCurrent ? "selected" : ""}>
                Versão ${v.versao} (${inicio} - ${fim})${isCurrent ? " - VIGENTE" : ""}
            </option>`;
            })
            .join("")
        : "";

    const versionSelector =
      state.gradesHorarias && state.gradesHorarias.length > 0
        ? `<div class="flex items-center gap-2">
            <label class="text-sm font-medium text-secondary">Visualizar Versão:</label>
            <select id="version-select" class="form-select w-auto">
                <option value="">Versão inicial</option>
                ${versionOptions}
            </select>
           </div>`
        : '<span class="text-sm text-secondary"><i class="fas fa-info-circle mr-1"></i>Nenhuma versão criada. A versão inicial será usada.</span>';

    return `
        <div id="schedule-grid-page-container" class="space-y-6">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-bold">Grade Horária</h2>
                    ${versionSelector}
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-print-teacher-schedule" class="btn btn-subtle"><i class="fas fa-file-pdf mr-2"></i>Gerar PDF da Grade</button>
                    <button id="btn-manage-versions" class="btn btn-subtle"><i class="fas fa-history mr-2"></i>Gerenciar Versões</button>
                </div>
            </div>
            <div class="card p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="grid-school-select" class="block text-lg font-bold mb-3">1. Selecione a Escola</label>
                        <select id="grid-school-select" class="form-select">
                            <option value="">-- Selecione --</option>
                            ${schoolOptions}
                        </select>
                    </div>
                    <div id="grid-teacher-selector-container"></div>
                </div>
            </div>
            <div id="final-schedule-grid-container" class="overflow-x-auto"></div>
        </div>`;
  };

  const renderScheduleConfig = (schoolId) => {
    const calendar = state.calendars[schoolId] || {};
    const config = calendar.scheduleConfig || {
      morning: { periodsPerDay: 5, periods: [] },
      afternoon: { periodsPerDay: 0, periods: [] },
    };

    const generatePeriodInputs = (periodType) => {
      const periodConfig = config[periodType] || {
        periodsPerDay: 0,
        periods: [],
      };
      let inputs = "";
      for (let i = 0; i < periodConfig.periodsPerDay; i++) {
        const period = periodConfig.periods[i] || {
          startTime: "",
          endTime: "",
        };
        inputs += `
                <div class="flex items-center gap-2">
                    <label class="w-20 text-secondary">Aula ${i + 1}</label>
                    <input type="time" class="form-input" value="${period.startTime || ""}" data-period-type="${periodType}" data-period-index="${i}" data-field="startTime">
                    <input type="time" class="form-input" value="${period.endTime || ""}" data-period-type="${periodType}" data-period-index="${i}" data-field="endTime">
                </div>`;
      }
      return inputs;
    };

    return `
        <div class="card p-6">
            <div class="border-b border-color">
                <nav id="config-tabs" class="flex space-x-4" aria-label="Tabs">
                    <button data-tab="morning" class="page-tab active"><i class="fas fa-sun fa-fw"></i>Manhã</button>
                    <button data-tab="afternoon" class="page-tab"><i class="fas fa-moon fa-fw"></i>Tarde</button>
                </nav>
            </div>

            <div id="morning_tab_content" class="tab-content py-4">
                <h3 class="text-lg font-bold mb-3">Horários do Período da Manhã</h3>
                <label for="periods-per-day-morning" class="block font-medium mb-1">Aulas por dia:</label>
                <input type="number" id="periods-per-day-morning" class="form-input w-24 mb-4" value="${config.morning.periodsPerDay}" min="0" max="15" data-period-type-control="morning">
                <div class="space-y-2" id="morning-period-inputs">${generatePeriodInputs("morning")}</div>
            </div>

            <div id="afternoon_tab_content" class="tab-content hidden py-4">
                <h3 class="text-lg font-bold mb-3">Horários do Período da Tarde</h3>
                <label for="periods-per-day-afternoon" class="block font-medium mb-1">Aulas por dia:</label>
                <input type="number" id="periods-per-day-afternoon" class="form-input w-24 mb-4" value="${config.afternoon.periodsPerDay}" min="0" max="15" data-period-type-control="afternoon">
                <div class="space-y-2" id="afternoon-period-inputs">${generatePeriodInputs("afternoon")}</div>
            </div>
            
            <div class="text-right mt-4">
                <button id="btn-save-config" class="btn btn-primary">Salvar Configurações</button>
            </div>
        </div>`;
  };

  const renderScheduleGrid = (schoolId, teacherId, versao = null) => {
    const calendar = state.calendars[schoolId];
    if (!calendar || !calendar.scheduleConfig) {
      return `<div class="card p-6 text-center"><p class="text-red-500">A configuração de horários da escola precisa ser definida primeiro na página "Config. Horários".</p></div>`;
    }

    const config = calendar.scheduleConfig;

    // Determina quais schedules usar: da versão específica ou atual
    let schedulesToUse = state.schedules;
    let versionInfo = "";
    if (versao) {
      const version = state.gradesHorarias?.find((v) => v.versao == versao);
      if (version) {
        schedulesToUse = version.schedules || [];
        const inicio = new Date(
          version.dataInicio + "T12:00:00",
        ).toLocaleDateString("pt-BR");
        const fim = new Date(version.dataFim + "T12:00:00").toLocaleDateString(
          "pt-BR",
        );
        const today = new Date().toISOString().split("T")[0];
        const isCurrent =
          today >= version.dataInicio && today <= version.dataFim;
        versionInfo = `<div class="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 p-4 rounded mb-4">
          <div class="flex items-start">
            <i class="fas fa-history text-blue-600 mr-3 mt-1"></i>
            <div>
              <p class="font-bold text-blue-800 dark:text-blue-200">Editando Versão ${versao}${isCurrent ? " (VIGENTE)" : ""}</p>
              <p class="text-sm text-blue-700 dark:text-blue-300">Período: ${inicio} - ${fim}</p>
              ${version.descricao ? `<p class="text-xs text-blue-600 dark:text-blue-400 mt-1">${version.descricao}</p>` : ""}
              <p class="text-xs text-blue-600 dark:text-blue-400 mt-2">
                <i class="fas fa-info-circle mr-1"></i>
                Alterações nesta grade afetarão apenas esta versão. A grade atual permanece inalterada.
              </p>
            </div>
          </div>
        </div>`;
      }
    }

    const school = state.schools.find((s) => s.id === schoolId);
    const teacher = state.teachers.find((t) => t.id === teacherId);

    const teacherSchedules = schedulesToUse.filter(
      (s) => s.teacherId === teacherId,
    );
    const days = [
      { d: 1, n: "Segunda" },
      { d: 2, n: "Terça" },
      { d: 3, n: "Quarta" },
      { d: 4, n: "Quinta" },
      { d: 5, n: "Sexta" },
      { d: 6, n: "Sábado" },
    ];

    const generateGridForPeriod = (periodType) => {
      const periodConfig = config[periodType];
      if (
        !periodConfig ||
        periodConfig.periodsPerDay === 0 ||
        !periodConfig.periods ||
        periodConfig.periods.length === 0 ||
        periodConfig.periods.some((p) => !p.startTime || !p.endTime)
      ) {
        return `<div class="text-center py-4 text-secondary">Nenhum horário configurado para o período da ${periodType === "morning" ? "manhã" : "tarde"}.</div>`;
      }

      const header = days.map((day) => `<th>${day.n}</th>`).join("");
      const bodyRows = periodConfig.periods
        .map((period, index) => {
          const cells = days
            .map((day) => {
              const schedule = teacherSchedules.find(
                (s) =>
                  s.dayOfWeek === day.d && s.startTime === period.startTime,
              );

              if (schedule) {
                // CASO 1: �0 uma aula com turma e disciplina definidas
                if (schedule.classId && schedule.subjectId) {
                  const cls = state.classes.find(
                    (c) => c.id === schedule.classId,
                  );
                  const subject = state.subjects.find(
                    (s) => s.id === schedule.subjectId,
                  );
                  const bgColor = cls?.color || "#dddddd";
                  const textColor = getContrastColor(bgColor);

                  return `
                            <td>
                                <div class="schedule-cell"
                                     style="background-color: ${bgColor}; color: ${textColor};"
                                     data-schedule-id="${schedule.id}"
                                     data-day-of-week="${day.d}"
                                     data-start-time="${period.startTime}"
                                     data-end-time="${period.endTime}">
                                    <span class="font-bold">${cls?.name || "..."}</span>
                                    <span class="text-sm">${subject?.name || "..."}</span>
                                </div>
                            </td>`;
                }
                // CASO 2: �0 apenas um texto visual
                else if (schedule.visualText) {
                  return `
                            <td>
                                <div class="schedule-cell"
                                     style="background-color: var(--bg-primary); border: 1px dashed var(--border-color); color: var(--text-secondary);"
                                     data-schedule-id="${schedule.id}"
                                     data-day-of-week="${day.d}"
                                     data-start-time="${period.startTime}"
                                     data-end-time="${period.endTime}">
                                    <span class="font-semibold text-center p-1">${schedule.visualText}</span>
                                </div>
                            </td>`;
                }
              }

              // Célula vazia padrão
              return `
                    <td>
                        <div class="schedule-cell empty"
                             data-day-of-week="${day.d}"
                             data-start-time="${period.startTime}"
                             data-end-time="${period.endTime}">
                            <i class="fas fa-plus text-secondary"></i>
                        </div>
                    </td>`;
            })
            .join("");
          return `<tr><td class="font-semibold">${period.startTime} - ${period.endTime}</td>${cells}</tr>`;
        })
        .join("");

      return `
            <table class="w-full schedule-grid">
                <thead><tr><th>Horário</th>${header}</tr></thead>
                <tbody>${bodyRows}</tbody>
            </table>`;
    };

    return `
        <div class="card p-6">
            ${versionInfo}
        <div class="schedule-print-header hidden">
          <h1 class="schedule-print-teacher">${teacher?.name || "Professor não informado"}</h1>
          <p class="schedule-print-school">${school?.name || "Escola não informada"}</p>
        </div>
            <h3 class="text-xl font-bold mb-4">3. Monte a Grade do Professor</h3>
            <p class="mb-4 text-secondary">Clique em uma célula vazia para adicionar uma aula, ou em uma aula existente para editar/remover.</p>

             <div class="border-b border-color">
                <nav id="grid-tabs" class="flex space-x-4" aria-label="Tabs">
                    <button data-tab="morning" class="page-tab active"><i class="fas fa-sun fa-fw"></i>Manhã</button>
                    <button data-tab="afternoon" class="page-tab"><i class="fas fa-moon fa-fw"></i>Tarde</button>
                </nav>
            </div>

            <div id="morning_grid_content" class="tab-content py-4">${generateGridForPeriod("morning")}</div>
            <div id="afternoon_grid_content" class="tab-content hidden py-4">${generateGridForPeriod("afternoon")}</div>
        </div>`;
  };

  const getHomeworksWithDetails = (courseId, termStart, termEnd) => {
    if (!courseId || !termStart || !termEnd) return [];
    const [classId, subjectId] = courseId.split("|");
    return state.homeworks
      .filter(
        (hw) =>
          hw.classId === classId &&
          hw.subjectId === subjectId &&
          hw.assignedDate >= termStart &&
          hw.assignedDate <= termEnd,
      )
      .map((hw) => {
        const className =
          state.classes.find((c) => c.id === hw.classId)?.name || "N/D";
        const subjectName =
          state.subjects.find((s) => s.id === hw.subjectId)?.name || "N/D";
        return { ...hw, className, subjectName };
      })
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  };

  const renderHomeworkList = (courseId, termStart, termEnd) => {
    const homeworks = getHomeworksWithDetails(courseId, termStart, termEnd);
    const homeworkRows = homeworks
      .map((hw) => {
        const formattedAssignedDate = new Date(
          hw.assignedDate + "T12:00:00",
        ).toLocaleDateString("pt-BR");
        const formattedDueDate = new Date(
          hw.dueDate + "T12:00:00",
        ).toLocaleDateString("pt-BR");
        return `
            <tr>
                <td class="whitespace-normal">${hw.description}</td>
                <td class="whitespace-nowrap">${formattedAssignedDate}</td>
                <td class="whitespace-nowrap">${formattedDueDate}</td>
                <td class="text-right">
                     <button class="btn-edit-homework text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${hw.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-homework text-red-500 hover:text-red-700" data-id="${hw.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
      })
      .join("");

    const gridHtml = `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Data Solicitação</th>
                            <th>Data Entrega</th>
                            <th class="text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                         ${homeworks.length > 0 ? homeworkRows : `<tr><td colspan="4" class="text-center py-4 text-secondary">Nenhuma atividade cadastrada para esta turma no período selecionado.</td></tr>`}
                    </tbody>
                </table>
            </div>`;

    const actionsHtml = `<div class="text-right">
                                <button id="btn-add-homework" class="btn btn-primary"><i class="fas fa-plus mr-2"></i>Nova Atividade</button>
                            </div>`;

    return { gridHtml, actionsHtml };
  };

  const getOccurrencesWithDetails = (courseId, termStart, termEnd) => {
    if (!courseId || !termStart || !termEnd) return [];
    const [classId, subjectId] = courseId.split("|");
    return (state.occurrences || [])
      .filter(
        (occurrence) =>
          occurrence.classId === classId &&
          occurrence.subjectId === subjectId &&
          occurrence.occurrenceDate >= termStart &&
          occurrence.occurrenceDate <= termEnd,
      )
      .map((occurrence) => {
        const className =
          state.classes.find((c) => c.id === occurrence.classId)?.name || "N/D";
        const subjectName =
          state.subjects.find((s) => s.id === occurrence.subjectId)?.name ||
          "N/D";

        const involvedStudentIds = Array.isArray(occurrence.involvedStudentIds)
          ? occurrence.involvedStudentIds
          : [];
        const involvedStudentNames = involvedStudentIds
          .map(
            (studentId) =>
              state.students.find((student) => student.id === studentId)?.name,
          )
          .filter(Boolean);

        return {
          ...occurrence,
          className,
          subjectName,
          involvedStudentIds,
          involvedStudentNames,
          sentToPrincipal: !!occurrence.sentToPrincipal,
        };
      })
      .sort((a, b) => new Date(b.occurrenceDate) - new Date(a.occurrenceDate));
  };

  const renderOccurrencesList = (courseId, termStart, termEnd) => {
    const occurrences = getOccurrencesWithDetails(courseId, termStart, termEnd);

    const rows = occurrences
      .map((occurrence) => {
        const formattedDate = new Date(
          occurrence.occurrenceDate + "T12:00:00",
        ).toLocaleDateString("pt-BR");
        const studentsPreview =
          occurrence.involvedStudentNames.length > 0
            ? occurrence.involvedStudentNames.slice(0, 2).join(", ") +
              (occurrence.involvedStudentNames.length > 2
                ? ` +${occurrence.involvedStudentNames.length - 2}`
                : "")
            : "Não informado";
        const directionStatus = occurrence.sentToPrincipal
          ? '<span class="status-badge bg-red-100 text-red-700">Encaminhado</span>'
          : '<span class="status-badge bg-gray-100 text-gray-700">Não</span>';

        return `
            <tr>
                <td class="whitespace-nowrap">${formattedDate}</td>
                <td class="whitespace-normal">${studentsPreview}</td>
                <td class="whitespace-nowrap">${directionStatus}</td>
                <td class="whitespace-normal">${occurrence.description}</td>
                <td class="text-right whitespace-nowrap">
                  <button class="btn-view-occurrence text-blue-500 hover:text-blue-700 mr-2" data-id="${occurrence.id}" title="Visualizar"><i class="fas fa-eye"></i></button>
                    <button class="btn-edit-occurrence text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${occurrence.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-occurrence text-red-500 hover:text-red-700" data-id="${occurrence.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
      })
      .join("");

    const gridHtml = `
            <div class="card p-4">
                <div class="mb-3">
                    <h3 class="text-base font-bold">Ocorrências de Indisciplina</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="w-32">Data da Aula</th>
                            <th class="w-60">Alunos Envolvidos</th>
                            <th class="w-40">Direção</th>
                                <th>Descrição</th>
                                <th class="text-right w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                           ${occurrences.length > 0 ? rows : `<tr><td colspan="5" class="text-center py-4 text-secondary">Nenhuma ocorrência cadastrada para esta turma no período selecionado.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>`;

    const actionsHtml = `<div class="text-right">
                                <button id="btn-add-occurrence" class="btn btn-primary"><i class="fas fa-triangle-exclamation mr-2"></i>Nova Ocorrência</button>
                            </div>`;

    return { gridHtml, actionsHtml };
  };

  const renderTasksPage = (params = {}) => {
    const view = params.view || "kanban";
    const recurrenceLabels = {
      daily: "Diária",
      weekly: "Semanal",
      monthly: "Mensal",
      yearly: "Anual",
    };
    const getRecurrenceLabel = (task) =>
      recurrenceLabels[task.recurrence] || "";
    // Filtra as tarefas baseado na visualização atual
    let displayTasks = [];
    if (view === "archived") {
      displayTasks = state.tasks.filter((t) => t.isArchived);
    } else {
      displayTasks = state.tasks.filter((t) => !t.isArchived);
    }

    const renderKanbanView = () => {
      const columns = {
        a_fazer: { title: "A Fazer", tasks: [] },
        em_andamento: { title: "Em Andamento", tasks: [] },
        concluido: { title: "Concluído", tasks: [] },
      };

      displayTasks.forEach((task) => {
        if (columns[task.status]) {
          columns[task.status].tasks.push(task);
        }
      });

      const columnHtml = Object.keys(columns)
        .map((statusKey) => {
          const column = columns[statusKey];
          const taskCardsHtml = column.tasks
            .map(
              (task) => `
                    <div class="kanban-card" draggable="true" data-task-id="${task.id}">
                        <div class="flex justify-between items-start">
                             <p class="kanban-card-title">${task.title}</p>
                             <button class="btn-edit-task text-sm text-secondary hover:text-primary p-1 -mt-1 -mr-1"><i class="fas fa-pencil-alt"></i></button>
                        </div>
                        <div class="flex items-center justify-between mt-2">
                             <div class="flex items-center gap-2">
                                <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                                ${task.tags.map((tag) => `<span class="tag-badge">${tag}</span>`).join("")}
                                ${getRecurrenceLabel(task) ? `<span class="tag-badge"><i class="fas fa-repeat mr-1"></i>${getRecurrenceLabel(task)}</span>` : ""}
                             </div>
                             ${task.dueDate ? `<span class="task-due-date"><i class="fas fa-calendar-alt mr-1"></i>${new Date(task.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>` : ""}
                        </div>
                    </div>
                `,
            )
            .join("");

          return `
                    <div class="kanban-column" data-status="${statusKey}">
                        <h3 class="kanban-column-title">${column.title} (${column.tasks.length})</h3>
                        <div class="kanban-cards">${taskCardsHtml}</div>
                    </div>
                `;
        })
        .join("");

      return `<div class="kanban-board">${columnHtml}</div>`;
    };

    const renderTableView = () => {
      const sortedTasks = [...displayTasks].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );

      const tableRows = sortedTasks
        .map(
          (task) => `
                <tr data-task-id="${task.id}">
                    <td>
                        <p class="font-semibold">${task.title}</p>
                        <p class="text-sm text-secondary">${task.description.substring(0, 100)}</p>
                    </td>
                    <td><span class="status-badge status-${task.status.replace("_", "")}">${task.status.replace("_", " ")}</span></td>
                    <td><span class="priority-badge priority-${task.priority}">${task.priority}</span></td>
                    <td>${task.dueDate ? new Date(task.dueDate + "T12:00:00").toLocaleDateString("pt-BR") : "N/D"}</td>
                    <td>${getRecurrenceLabel(task) || "N/D"}</td>
                    <td>${task.tags.join(", ")}</td>
                    <td class="text-right">
                        ${
                          task.isArchived
                            ? `<button class="btn-restore-task text-green-500 hover:text-green-700 mr-2" data-id="${task.id}" title="Restaurar"><i class="fas fa-trash-restore"></i></button>`
                            : `<button class="btn-edit-task text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${task.id}"><i class="fas fa-edit"></i></button>`
                        }
                        <button class="btn-delete-task text-red-500 hover:text-red-700" data-id="${task.id}" title="Excluir Definitivamente"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `,
        )
        .join("");

      return `
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th>Título/Descrição</th>
                                <th>Status</th>
                                <th>Prioridade</th>
                                <th>Prazo</th>
                                <th>Recorrência</th>
                                <th>Tags</th>
                                <th class="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                              ${sortedTasks.length > 0 ? tableRows : `<tr><td colspan="7" class="text-center text-secondary py-4">Nenhuma tarefa encontrada.</td></tr>`}
                        </tbody>
                    </table>
                </div>`;
    };

    const renderTodoView = () => {
      const sortedTasks = [...displayTasks].sort(
        (a, b) =>
          (a.status === "concluido" ? 1 : -1) -
            (b.status === "concluido" ? 1 : -1) ||
          new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      );
      const tasksHtml = sortedTasks
        .map(
          (task) => `
                <li class="todo-item ${task.status === "concluido" ? "completed" : ""}" data-task-id="${task.id}">
                    <input type="checkbox" class="form-checkbox" data-id="${task.id}" ${task.status === "concluido" ? "checked" : ""}>
                    <div class="todo-content">
                         <span class="todo-title">${task.title}</span>
                         <div class="todo-tags">
                            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                            ${task.tags.map((tag) => `<span class="tag-badge">${tag}</span>`).join("")}
                           ${getRecurrenceLabel(task) ? `<span class="tag-badge"><i class="fas fa-repeat mr-1"></i>${getRecurrenceLabel(task)}</span>` : ""}
                         </div>
                    </div>
                    <button class="btn-edit-task text-secondary hover:text-primary ml-4" data-id="${task.id}"><i class="fas fa-edit"></i></button>
                </li>
            `,
        )
        .join("");

      return `<ul class="todo-list"> ${displayTasks.length > 0 ? tasksHtml : `<li class="text-center text-secondary py-4">Nenhuma tarefa encontrada.</li>`} </ul>`;
    };

    let viewContent;
    if (view === "archived") {
      // Arquivadas só exibe em tabela para facilitar a gestão
      viewContent = renderTableView();
    } else {
      switch (view) {
        case "table":
          viewContent = renderTableView();
          break;
        case "todo":
          viewContent = renderTodoView();
          break;
        case "kanban":
        default:
          viewContent = renderKanbanView();
          break;
      }
    }

    return `
            <div id="tasks-page-container" class="space-y-6">
                <div class="flex flex-wrap justify-between items-center gap-4">
                    <div class="tasks-view-switcher">
                        <button class="tasks-view-btn ${view === "todo" ? "active" : ""}" data-view="todo" title="Visualização To-Do"><i class="fas fa-check-square mr-2"></i>Lista</button>
                        <button class="tasks-view-btn ${view === "kanban" ? "active" : ""}" data-view="kanban" title="Visualização Kanban"><i class="fas fa-columns mr-2"></i>Kanban</button>
                        <button class="tasks-view-btn ${view === "table" ? "active" : ""}" data-view="table" title="Visualização em Tabela"><i class="fas fa-list mr-2"></i>Tabela</button>
                        <button class="tasks-view-btn ${view === "archived" ? "active" : ""}" data-view="archived" title="Tarefas Arquivadas"><i class="fas fa-archive mr-2"></i>Arquivadas</button>
                    </div>
                    <button id="btn-add-task" class="btn btn-primary"><i class="fas fa-plus mr-2"></i> Nova Tarefa</button>
                </div>
                <div id="tasks-content-container">
                    ${viewContent}
                </div>
            </div>
        `;
  };

  /**
   * NOVO HELPER: Aplica ou remove a classe 'grade-danger' a um elemento
   * com base no valor da nota.
   */
  /**
   * ATUALIZADO: Aplica ou remove as classes 'grade-danger' (vermelho) e 'grade-success' (azul)
   * a um elemento com base no valor da nota.
   */
  const applyGradeStyles = (element, value) => {
    const numericValue = parseGradeNumericValue(value);
    if (element) {
      // Limpa as classes de nota existentes primeiro
      element.classList.remove("grade-danger", "grade-success");

      if (numericValue !== null) {
        if (isRedGrade(numericValue)) {
          element.classList.add("grade-danger");
        } else {
          element.classList.add("grade-success");
        }
      }
    }
  };

  const renderAssessmentsPage = (course, classDates, termKey, options = {}) => {
    const onlyActive = options.onlyActive !== false;
    // MODIFICADO: Lógica para renderizar a tela do 5º Conselho (Resultado Final)
    if (termKey === "5th-council") {
      const schoolCalendar = state.calendars[course.schoolId];
      if (
        !schoolCalendar ||
        !schoolCalendar.terms ||
        schoolCalendar.terms.length === 0
      ) {
        return {
          gridHtml:
            '<p class="text-center text-secondary">Os períodos letivos (Bimestres/Trimestres) não foram cadastrados para esta escola. Configure em "Dados da Escola > Calendário".</p>',
          actionsHtml: "",
        };
      }

      const students = getDiaryStudentsForClass(course.classId, onlyActive);

      if (students.length === 0) {
        return {
          gridHtml:
            '<p class="text-center text-secondary">Nenhum aluno encontrado para os filtros selecionados.</p>',
          actionsHtml: "",
        };
      }

      const terms = schoolCalendar.terms
        .filter((t) => t.startDate && t.endDate)
        .sort((a, b) => a.id - b.id);
      const termTypeName =
        schoolCalendar.termType === "bimestre" ? "Bim." : "Trim.";

      const tableHeaders = terms
        .map((term) => `<th>${term.id}º ${termTypeName}</th>`)
        .join("");

      // Opções possíveis para o combobox (Texto Completo)
      const situationOptions = [
        "Aprovado",
        "Aprovado pelo conselho",
        "Retido por frequência",
        "Retido por rendimento",
        "Retido por frequência e rendimento",
      ];

      const studentRows = students
        .map((student) => {
          // Usa a função central para obter os dados calculados
          const result = getFinalResult(student.id, course);

          const termGradeCells = terms
            .map((term) => {
              const grade = getDefinitiveGrade(
                student.id,
                course.id,
                `${term.startDate}|${term.endDate}`,
              );
              const gradeDisplay =
                grade !== null ? formatGradeValue(grade) : "--";
              const gradeClass =
                grade !== null
                  ? isRedGrade(grade)
                    ? "grade-danger"
                    : "grade-success"
                  : "";
              return `<td class="font-bold text-center ${gradeClass}">${gradeDisplay}</td>`;
            })
            .join("");

          const finalAverageDisplay =
            result.calculatedFinalAverage !== null
              ? formatGradeValue(result.calculatedFinalAverage)
              : "--";
          const finalAverageClass =
            result.calculatedFinalAverageRaw !== null
              ? isRedGrade(result.calculatedFinalAverageRaw)
                ? "grade-danger"
                : "grade-success"
              : "";
          const finalFrequencyClass =
            result.yearlyFrequency < 75 ? "grade-danger" : "grade-success";
          const adjustmentValue =
            result.councilAdjustment !== undefined &&
            result.councilAdjustment !== null
              ? result.councilAdjustment
              : "";

          // Lógica de recuperação do status salvo ou calculado
          const savedResultKey = `${student.id}_${course.id}`;
          const savedSituation = state.finalResults[savedResultKey]?.situation;

          // Prioridade: Salvo > Calculado > Pendente
          let currentSituation = savedSituation || result.situation;

          // Define a cor do texto do select baseado na situação ATUAL (Azul ou Vermelho)
          let selectColorClass = "text-secondary";
          if (
            currentSituation.includes("Aprovado") ||
            currentSituation.includes("Ap.")
          ) {
            selectColorClass = "text-blue-700 font-bold"; // Azul
          } else if (
            currentSituation.includes("Retido") ||
            currentSituation.includes("Ret.")
          ) {
            selectColorClass = "text-red-600 font-bold"; // Vermelho
          }

          // Gera o HTML das opções do select
          // Nota: data-full-text ajuda o JS a restaurar o texto original ao clicar
          const optionsHtml = situationOptions
            .map(
              (opt) =>
                `<option value="${opt}" ${currentSituation === opt ? "selected" : ""}>${opt}</option>`,
            )
            .join("");

          // Adiciona a opção "Pendente" se for o caso atual e não estiver na lista padrão
          const pendenteHtml =
            currentSituation === "Pendente"
              ? '<option value="Pendente" selected>Pendente</option>'
              : "";
          return `
            <tr data-student-id="${student.id}" class="${(student.status || "ativo") !== "ativo" ? "student-inactive" : ""}">
                <td class="student-name" title="${student.name}"><span class="font-bold text-secondary mr-2">${student.number || "-"}</span>${student.name}</td>
                ${termGradeCells}
                <td class="font-bold text-center ${finalAverageClass}" data-result="calculated-average">${finalAverageDisplay}</td>
                <td>
                    <input type="number"
                       class="form-input council-adjustment-input text-center p-1"
                       min="0" max="10" step="0.1"
                       placeholder="-"
                       data-student-id="${student.id}"
                       data-course-id="${course.id}"
                       value="${adjustmentValue}">
                </td>
                <td class="font-bold text-center ${finalFrequencyClass}" data-result="yearly-frequency">${result.yearlyFrequency.toFixed(0)}%</td>
                <td class="text-center">
                    <select class="form-select final-situation-select text-sm p-1 ${selectColorClass}" 
                            data-student-id="${student.id}" 
                            data-course-id="${course.id}">
                        ${pendenteHtml}
                        ${optionsHtml}
                    </select>
                </td>
            </tr>`;
        })
        .join("");

      const gridHtml = `
        <div class="p-4 mb-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
            <h3 class="font-bold text-lg">Conselho de Classe Final</h3>
            <p class="text-secondary text-sm">Esta tela apresenta a média final e a situação do aluno. A coluna "Ajuste Final" permite inserir uma nova nota. A <b>Situação Final</b> é calculada automaticamente, mas você pode alterá-la manualmente na lista.</p>
        </div>
        <div class="overflow-x-auto mt-2">
            <table class="min-w-full">
                <thead>
                    <tr>
                        <th class="student-name">Aluno</th>
                        ${tableHeaders}
                        <th class="text-center">Média Final</th>
                        <th class="text-center w-28">Ajuste Final</th>
                        <th class="text-center">Frequência Anual</th>
                        <th class="text-center w-48">Situação Final</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.length > 0 ? studentRows : '<tr><td colspan="100%" class="text-center py-4">Nenhum aluno encontrado para os filtros selecionados.</td></tr>'}
                </tbody>
            </table>
        </div>`;

      return {
        gridHtml: gridHtml,
        actionsHtml: `
        <div class="text-right mt-6">
            <button id="btn-export-assessments-excel" class="btn btn-export-excel"><i class="fas fa-file-excel mr-2"></i>Gerar Excel</button>
        </div>`,
      };
    }

    // Lógica original para renderizar avaliações de um bimestre/trimestre (MANTIDA IGUAL)
    const courseId = course.id;
    const students = getDiaryStudentsForClass(course.classId, onlyActive);

    const assessmentsForTerm = state.assessments.filter(
      (a) =>
        a.classId === course.classId &&
        a.subjectId === course.subjectId &&
        a.termKey === termKey,
    );

    const settingsKey = `${courseId}_${termKey}`;
    const currentSettings = state.assessmentSettings[settingsKey] || {
      averageType: "ponderada",
    };

    const headerHtml = `
    <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div class="flex items-center gap-6">
            <strong class="text-secondary">Tipo de Média:</strong>
            <label class="flex items-center cursor-pointer">
                <input type="radio" name="averageType" value="ponderada" class="form-radio" ${currentSettings.averageType === "ponderada" ? "checked" : ""}>
                <span class="ml-2">Ponderada</span>
            </label>
            <label class="flex items-center cursor-pointer">
                <input type="radio" name="averageType" value="aritmetica" class="form-radio" ${currentSettings.averageType === "aritmetica" ? "checked" : ""}>
                <span class="ml-2">Aritmética</span>
            </label>
        </div>
        <button id="btn-add-assessment" class="btn btn-primary"><i class="fas fa-plus mr-2"></i>Cadastrar Avaliação</button>
    </div>`;

    let assessmentsListHtml =
      '<p class="text-secondary mb-4">Nenhuma avaliação cadastrada para este período.</p>';
    if (assessmentsForTerm.length > 0) {
      assessmentsListHtml = `<div class="mb-4 flex flex-wrap items-start gap-2">${assessmentsForTerm
        .map(
          (a) => `
        <div class="inline-flex items-center gap-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-2">
            <span class="font-semibold">${a.title}</span>
            <span class="text-xs text-secondary">(Peso: ${a.weight})</span>
            <button class="btn-edit-assessment text-secondary hover:text-primary p-1 text-xs" data-id="${a.id}"><i class="fas fa-edit"></i></button>
            <button class="btn-delete-assessment text-red-500 hover:text-red-700 p-1 text-xs" data-id="${a.id}"><i class="fas fa-trash"></i></button>
        </div>
    `,
        )
        .join("")}</div>`;
    }

    const tableHeaders = assessmentsForTerm
      .map(
        (a) => `
    <th title="Peso: ${a.weight}">${a.title}</th>`,
      )
      .join("");

    const studentRows = students
      .map((student) => {
        const gradeInputs = assessmentsForTerm
          .map((assessment) => {
            const gradeKey = `${student.id}_${assessment.id}`;
            const gradeValue =
              state.grades[gradeKey] !== undefined
                ? state.grades[gradeKey]
                : "";
            const gradeClass =
              gradeValue !== ""
                ? isRedGrade(parseFloat(gradeValue))
                  ? "grade-danger"
                  : "grade-success"
                : "";
            return `
            <td>
                  <input type="text"
                       class="form-input grade-input text-center p-1 ${gradeClass}"
                    inputmode="decimal"
                    autocomplete="off"
                       data-student-id="${student.id}"
                       data-assessment-id="${assessment.id}"
                       value="${gradeValue}">
            </td>`;
          })
          .join("");

        const adjustmentKey = `${student.id}_${courseId}_${termKey}`;
        const adjustmentValue =
          state.gradesAdjustments[adjustmentKey] !== undefined
            ? state.gradesAdjustments[adjustmentKey]
            : "";
        const adjustmentClass =
          adjustmentValue !== ""
            ? isRedGrade(parseFloat(adjustmentValue))
              ? "grade-danger"
              : "grade-success"
            : "";

        const averageKey = `${student.id}_${courseId}_${termKey}`;
        const calculatedAverage = state.calculatedAverages[averageKey];
        const averageDisplay =
          calculatedAverage !== undefined && calculatedAverage !== null
            ? formatGradeValue(calculatedAverage)
            : "--";
        const averageClass =
          calculatedAverage !== undefined && calculatedAverage !== null
            ? isRedGrade(calculatedAverage)
              ? "grade-danger"
              : "grade-success"
            : "";

        const [termStartDate, termEndDate] = termKey.split("|");
        const liveAttendance =
          termStartDate && termEndDate
            ? getTermAttendance(student, course, {
                startDate: termStartDate,
                endDate: termEndDate,
              })
            : null;

        const attendanceKey = `${student.id}_${courseId}_${termKey}`;
        const savedAttendance = state.termAttendance[attendanceKey];
        const attendanceToDisplay = liveAttendance || savedAttendance;
        return `
        <tr data-student-id="${student.id}" class="${(student.status || "ativo") !== "ativo" ? "student-inactive" : ""}">
          <td class="student-name" title="${student.name}"><span class="font-bold text-secondary mr-2">${student.number || "-"}</span>${student.name}</td>
            ${gradeInputs}
            <td class="font-bold text-center ${averageClass}" data-result="final-average">${averageDisplay}</td>
            <td><input type="text" class="form-input adjustment-input text-center p-1 ${adjustmentClass}" inputmode="decimal" autocomplete="off" value="${adjustmentValue}" data-student-id="${student.id}"></td>
            <td data-result="absences">${attendanceToDisplay ? attendanceToDisplay.absences : "--"}</td>
            <td data-result="excused-absences">${attendanceToDisplay ? attendanceToDisplay.excusedAbsences : "--"}</td>
            <td data-result="absence-percentage">${attendanceToDisplay ? attendanceToDisplay.absencePercentage.toFixed(0) + "%" : "--"}</td>
        </tr>`;
      })
      .join("");

    const tableHtml = `
    <div class="overflow-x-auto mt-2">
        <table class="min-w-full">
            <thead>
                <tr>
                    <th class="student-name">Aluno</th>
                    ${tableHeaders}
                    <th class="text-center">Média Final</th>
                    <th>Ajuste</th>
                    <th>Faltas</th>
                    <th>Justif.</th>
                    <th>% Aus.</th>
                </tr>
            </thead>
            <tbody>
              ${students.length > 0 ? studentRows : '<tr><td colspan="100%" class="text-center py-4">Nenhum aluno encontrado para os filtros selecionados.</td></tr>'}
            </tbody>
        </table>
    </div>`;

    const actionsHtml = `
    <div class="flex flex-wrap justify-end gap-3 mt-6">
      <button id="btn-export-assessments-excel" class="btn btn-export-excel"><i class="fas fa-file-excel mr-2"></i>Gerar Excel</button>
      <button id="btn-calculate-averages" class="btn btn-primary" ${assessmentsForTerm.length === 0 ? "disabled" : ""}><i class="fas fa-calculator mr-2"></i>Calcular Médias e Faltas</button>
    </div>`;

    const fullHtml = headerHtml + assessmentsListHtml + tableHtml;

    return {
      gridHtml: fullHtml,
      actionsHtml: actionsHtml,
    };
  };

  const generateAssessmentsExcel = async (course, termKey, options = {}) => {
    const onlyActive = options.onlyActive !== false;
    if (typeof XLSX === "undefined") {
      CustomSwal.fire(
        "Erro",
        "A biblioteca para gerar arquivos Excel (XLSX) não foi carregada.",
        "error",
      );
      return;
    }

    if (!course || !termKey) {
      CustomSwal.fire(
        "Atenção",
        "Selecione turma, disciplina e período antes de gerar o Excel.",
        "warning",
      );
      return;
    }

    const isFinalCouncil = termKey === "5th-council";
    const classInfo = state.classes.find((c) => c.id === course.classId);
    const subjectInfo = state.subjects.find((s) => s.id === course.subjectId);
    const schoolInfo = state.schools.find((s) => s.id === course.schoolId);
    const schoolCalendar = state.calendars[course.schoolId];
    const students = getDiaryStudentsForClass(course.classId, onlyActive).sort(
      (a, b) =>
        (a.number || 999) - (b.number || 999) || a.name.localeCompare(b.name),
    );

    if (students.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Nenhum aluno encontrado para os filtros selecionados.",
        "info",
      );
      return;
    }

    const sanitizeSheetName = (name) =>
      String(name || "Avaliações")
        .replace(/[\\/*?:\[\]]/g, "-")
        .substring(0, 31) || "Avaliações";

    const sanitizeFilePart = (value) =>
      String(value || "avaliacoes")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "") || "avaliacoes";

    const normalizeHexColor = (hex) => {
      const clean = String(hex || "")
        .trim()
        .replace("#", "");
      if (clean.length === 3) {
        return clean
          .split("")
          .map((char) => char + char)
          .join("")
          .toUpperCase();
      }
      if (/^[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
      return "4CAF50";
    };

    const decimalPlaces = getGradeDecimalPlaces();
    const gradeNumFmt =
      decimalPlaces > 0 ? `0.${"0".repeat(decimalPlaces)}` : "0";
    const themeHex = normalizeHexColor(state.settings?.color || "#4CAF50");
    const borderColor = "D1D5DB";
    const zebraHex = "F3F4F6";
    const metaFillHex = "F9FAFB";
    const titleFillHex = "E8F5E9";
    const successHex = "1D4ED8";
    const dangerHex = "DC2626";
    const neutralHex = "6B7280";
    const border = {
      top: { style: "thin", color: { rgb: borderColor } },
      bottom: { style: "thin", color: { rgb: borderColor } },
      left: { style: "thin", color: { rgb: borderColor } },
      right: { style: "thin", color: { rgb: borderColor } },
    };

    const workbook = XLSX.utils.book_new();
    const rows = [];
    const merges = [];
    const cellStyles = new Map();

    const setCellStyle = (rowIndex, colIndex, style) => {
      cellStyles.set(`${rowIndex}:${colIndex}`, style);
    };

    const pushMergedRow = (label, totalColumns, style) => {
      const rowIndex = rows.length;
      rows.push([label, ...Array(Math.max(0, totalColumns - 1)).fill("")]);
      if (totalColumns > 1) {
        merges.push({
          s: { r: rowIndex, c: 0 },
          e: { r: rowIndex, c: totalColumns - 1 },
        });
      }
      setCellStyle(rowIndex, 0, style);
    };

    const buildRegularAverage = (
      studentId,
      assessmentsForTerm,
      averageType,
    ) => {
      let totalWeight = 0;
      let sumOfGrades = 0;
      let sumOfWeightedGrades = 0;
      let gradesEntered = 0;

      assessmentsForTerm.forEach((assessment) => {
        const grade = parseGradeNumericValue(
          state.grades[`${studentId}_${assessment.id}`],
        );
        if (grade === null) return;
        sumOfGrades += grade;
        sumOfWeightedGrades += grade * assessment.weight;
        totalWeight += assessment.weight;
        gradesEntered++;
      });

      if (gradesEntered === 0) return null;
      const rawAverage =
        averageType === "ponderada"
          ? totalWeight > 0
            ? sumOfWeightedGrades / totalWeight
            : null
          : sumOfGrades / gradesEntered;
      return rawAverage === null ? null : roundGradeValue(rawAverage);
    };

    const buildSituationStyle = (situation) => {
      const text = String(situation || "");
      if (text.includes("Aprovado") || text.includes("Ap.")) {
        return { font: { color: { rgb: successHex }, bold: true } };
      }
      if (text.includes("Retido") || text.includes("Ret.")) {
        return { font: { color: { rgb: dangerHex }, bold: true } };
      }
      return { font: { color: { rgb: neutralHex } } };
    };

    let headers = [];
    let columnWidths = [];
    let sheetName = "Avaliações";
    let exportLabel = "Avaliações";
    let extraMetaRows = [];
    let dataRows = [];

    if (isFinalCouncil) {
      const terms = (schoolCalendar?.terms || [])
        .filter((term) => term.startDate && term.endDate)
        .sort((a, b) => a.id - b.id);
      const termTypeName =
        schoolCalendar?.termType === "bimestre" ? "Bim." : "Trim.";

      headers = [
        "Aluno",
        ...terms.map((term) => `${term.id}º ${termTypeName}`),
        "Média Final",
        "Ajuste Final",
        "Frequência Anual",
        "Situação Final",
      ];
      columnWidths = [
        { wch: 34 },
        ...terms.map(() => ({ wch: 12 })),
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 24 },
      ];
      sheetName = "5º Conselho";
      exportLabel = "5º Conselho Final";
      extraMetaRows = [
        `Período: ${exportLabel}`,
        `Critério de aprovação por nota: ${formatPassingGradeThresholdPtBr()}`,
      ];
      dataRows = students.map((student) => {
        const result = getFinalResult(student.id, course);
        const termGrades = terms.map((term) =>
          getDefinitiveGrade(
            student.id,
            course.id,
            `${term.startDate}|${term.endDate}`,
          ),
        );
        const finalAverage = result.calculatedFinalAverage;
        const yearlyFrequency = Number(result.yearlyFrequency?.toFixed(0) || 0);
        const adjustment = parseGradeNumericValue(result.councilAdjustment);

        return {
          values: [
            `${student.number || "-"} - ${student.name}`,
            ...termGrades,
            finalAverage,
            adjustment,
            `${yearlyFrequency}%`,
            result.situation,
          ],
          numericGradeColumns: new Set([
            ...termGrades.map((_, index) => index + 1),
            terms.length + 1,
            terms.length + 2,
          ]),
          situationColumn: headers.length - 1,
          frequencyColumn: headers.length - 2,
          frequencyMode: "presence",
        };
      });
    } else {
      const assessmentsForTerm = state.assessments.filter(
        (assessment) =>
          assessment.classId === course.classId &&
          assessment.subjectId === course.subjectId &&
          assessment.termKey === termKey,
      );
      const settingsKey = `${course.id}_${termKey}`;
      const currentSettings = state.assessmentSettings[settingsKey] || {
        averageType: "ponderada",
      };
      const averageLabel =
        currentSettings.averageType === "ponderada"
          ? "Ponderada"
          : "Aritmética";

      headers = [
        "Aluno",
        ...assessmentsForTerm.map(
          (assessment) => `${assessment.title} (Peso: ${assessment.weight})`,
        ),
        "Média Final",
        "Ajuste",
        "Faltas",
        "Justif.",
        "% Aus.",
      ];
      columnWidths = [
        { wch: 34 },
        ...assessmentsForTerm.map((assessment) => ({
          wch: Math.max(14, Math.min(28, assessment.title.length + 10)),
        })),
        { wch: 14 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
      ];

      const selectedTerm = (schoolCalendar?.terms || []).find(
        (term) => `${term.startDate}|${term.endDate}` === termKey,
      );
      exportLabel = selectedTerm
        ? `${selectedTerm.id}º ${schoolCalendar?.termType === "bimestre" ? "Bimestre" : "Trimestre"}`
        : "Período";
      sheetName = exportLabel;
      extraMetaRows = [
        `Período: ${exportLabel}`,
        `Tipo de média: ${averageLabel}`,
        `Avaliações cadastradas: ${assessmentsForTerm.length}`,
      ];

      dataRows = students.map((student) => {
        const gradeValues = assessmentsForTerm.map((assessment) =>
          parseGradeNumericValue(
            state.grades[`${student.id}_${assessment.id}`],
          ),
        );
        const calculatedAverage = buildRegularAverage(
          student.id,
          assessmentsForTerm,
          currentSettings.averageType,
        );
        const adjustment = parseGradeNumericValue(
          state.gradesAdjustments[`${student.id}_${course.id}_${termKey}`],
        );
        const [termStartDate, termEndDate] = termKey.split("|");
        const attendance = getTermAttendance(student, course, {
          startDate: termStartDate,
          endDate: termEndDate,
        });

        return {
          values: [
            `${student.number || "-"} - ${student.name}`,
            ...gradeValues,
            calculatedAverage,
            adjustment,
            attendance.absences,
            attendance.excusedAbsences,
            `${attendance.absencePercentage.toFixed(0)}%`,
          ],
          numericGradeColumns: new Set([
            ...gradeValues.map((_, index) => index + 1),
            assessmentsForTerm.length + 1,
            assessmentsForTerm.length + 2,
          ]),
          frequencyColumn: headers.length - 1,
          frequencyMode: "absence",
        };
      });
    }

    const totalColumns = headers.length;
    const schoolYear =
      schoolCalendar?.terms
        ?.find((term) => term.startDate)
        ?.startDate?.split("-")[0] || new Date().getFullYear();

    pushMergedRow(`Diário de Classe - ${exportLabel}`, totalColumns, {
      fill: { patternType: "solid", fgColor: { rgb: titleFillHex } },
      font: { bold: true, sz: 14, color: { rgb: themeHex } },
      alignment: { horizontal: "left", vertical: "center" },
      border,
    });
    pushMergedRow(
      `Turma: ${classInfo?.name || "-"} | Disciplina: ${subjectInfo?.name || "-"}`,
      totalColumns,
      {
        fill: { patternType: "solid", fgColor: { rgb: metaFillHex } },
        font: { bold: true },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      },
    );
    pushMergedRow(
      `Escola: ${schoolInfo?.name || "-"} | Ano Letivo: ${schoolYear}`,
      totalColumns,
      {
        fill: { patternType: "solid", fgColor: { rgb: metaFillHex } },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      },
    );
    extraMetaRows.forEach((metaRow) => {
      pushMergedRow(metaRow, totalColumns, {
        fill: { patternType: "solid", fgColor: { rgb: metaFillHex } },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      });
    });
    pushMergedRow(
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      totalColumns,
      {
        fill: { patternType: "solid", fgColor: { rgb: metaFillHex } },
        font: { italic: true, color: { rgb: neutralHex } },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      },
    );

    rows.push([]);

    const headerRowIndex = rows.length;
    rows.push(headers);

    dataRows.forEach((rowData, dataIndex) => {
      const rowIndex = rows.length;
      rows.push(rowData.values);

      rowData.values.forEach((value, colIndex) => {
        const isGradeColumn = rowData.numericGradeColumns?.has(colIndex);
        const baseStyle = {
          border,
          alignment: {
            vertical: "center",
            horizontal: colIndex === 0 ? "left" : "center",
          },
        };

        if (dataIndex % 2 === 1) {
          baseStyle.fill = {
            patternType: "solid",
            fgColor: { rgb: zebraHex },
          };
        }

        if (colIndex === 0) {
          baseStyle.font = { bold: true };
        }

        if (isGradeColumn && value !== null && value !== "") {
          baseStyle.numFmt = gradeNumFmt;
          baseStyle.font = {
            ...(baseStyle.font || {}),
            bold: true,
            color: { rgb: isRedGrade(value) ? dangerHex : successHex },
          };
        }

        if (colIndex === rowData.frequencyColumn) {
          const frequencyValue = parseFloat(String(value).replace("%", ""));
          if (!Number.isNaN(frequencyValue)) {
            const isDangerFrequency =
              rowData.frequencyMode === "absence"
                ? frequencyValue >= 75
                : frequencyValue < 75;
            baseStyle.font = {
              ...(baseStyle.font || {}),
              bold: true,
              color: { rgb: isDangerFrequency ? dangerHex : successHex },
            };
          }
        }

        if (colIndex === rowData.situationColumn) {
          Object.assign(baseStyle, buildSituationStyle(value));
        }

        setCellStyle(rowIndex, colIndex, baseStyle);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!merges"] = merges;
    worksheet["!cols"] = columnWidths;
    worksheet["!rows"] = rows.map((row, index) => {
      if (index === 0) return { hpx: 28 };
      if (index === headerRowIndex) return { hpx: 24 };
      return { hpx: row.length === 0 ? 10 : 20 };
    });

    rows.forEach((row, rowIndex) => {
      for (let colIndex = 0; colIndex < totalColumns; colIndex++) {
        const value = row[colIndex] ?? "";
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        if (!worksheet[address]) {
          worksheet[address] = {
            t: typeof value === "number" ? "n" : "s",
            v: value,
          };
        }

        const style =
          cellStyles.get(`${rowIndex}:${colIndex}`) ||
          (rowIndex === headerRowIndex
            ? {
                border,
                fill: { patternType: "solid", fgColor: { rgb: themeHex } },
                font: { bold: true, color: { rgb: "FFFFFF" } },
                alignment: { horizontal: "center", vertical: "center" },
              }
            : null);

        if (style) {
          worksheet[address].s = style;
        }

        if (
          rowIndex > headerRowIndex &&
          colIndex > 0 &&
          typeof value === "number"
        ) {
          worksheet[address].t = "n";
        }
      }
    });

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sanitizeSheetName(sheetName),
    );

    const fileName = `Avaliacoes_${sanitizeFilePart(classInfo?.name)}_${sanitizeFilePart(subjectInfo?.name)}_${sanitizeFilePart(exportLabel)}_${new Date().toISOString().split("T")[0]}.xlsx`;

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const excelBlob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const downloadUrl = URL.createObjectURL(excelBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);
  };

  const renderBulletinsPage = (course, options = {}) => {
    const onlyActive = options.onlyActive !== false;
    const schoolCalendar = state.calendars[course.schoolId];
    if (
      !schoolCalendar ||
      !schoolCalendar.terms ||
      schoolCalendar.terms.length === 0
    ) {
      return {
        gridHtml:
          '<p class="text-center text-secondary">Os períodos letivos (Bimestres/Trimestres) não foram cadastrados para esta escola. Configure em "Dados da Escola > Calendário".</p>',
        actionsHtml: "",
      };
    }

    const students = getDiaryStudentsForClass(course.classId, onlyActive);

    if (students.length === 0) {
      return {
        gridHtml:
          '<p class="text-center text-secondary">Nenhum aluno encontrado para os filtros selecionados.</p>',
        actionsHtml: "",
      };
    }

    const terms = schoolCalendar.terms
      .filter((t) => t.startDate && t.endDate)
      .sort((a, b) => a.id - b.id);
    const termTypeName =
      schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre";

    const mainHeaders = terms
      .map(
        (term) => `
            <th colspan="4" class="text-center border-b-2 term-separator">${term.id}º ${termTypeName}</th>
        `,
      )
      .join("");

    const subHeaders = terms
      .map(
        () => `
            <th class="font-normal text-center term-separator">Média</th>
            <th class="font-normal text-center" title="Faltas">F</th>
            <th class="font-normal text-center" title="Percentual de Ausência">% Aus</th>
            <th class="font-normal text-center" title="Faltas Justificadas">F/J</th>
        `,
      )
      .join("");

    const studentRows = students
      .map((student) => {
        const termCells = terms
          .flatMap((term) => {
            const termKey = `${term.startDate}|${term.endDate}`;
            const grade = getDefinitiveGrade(student.id, course.id, termKey);
            const gradeDisplay =
              grade !== null ? formatGradeValue(grade) : "--";
            const gradeClass =
              grade !== null
                ? isRedGrade(grade)
                  ? "grade-danger"
                  : "grade-success"
                : "";

            const attendance = getTermAttendance(student, course, term);

            return `
                    <td class="text-center ${gradeClass} term-separator">${gradeDisplay}</td>
                    <td class="text-center">${attendance.absences}</td>
                    <td class="text-center">${attendance.absencePercentage.toFixed(0)}%</td>
                    <td class="text-center">${attendance.excusedAbsences}</td>
                `;
          })
          .join("");

        // Usa a nova função para obter o resultado final consistente
        const finalResult = getFinalResult(student.id, course);
        const finalGradeDisplay =
          finalResult.finalGrade !== null
            ? formatGradeValue(finalResult.finalGrade)
            : "--";
        const finalGradeClass =
          finalResult.finalGradeForStatus !== null
            ? isRedGrade(finalResult.finalGradeForStatus)
              ? "grade-danger"
              : "grade-success"
            : "";

        // Salva o resultado no estado para consistência
        const resultKey = `${student.id}_${course.id}`;
        state.finalResults[resultKey] = {
          finalAverage: finalResult.finalGrade,
          situation: finalResult.situation,
        };

        // Abreviação opcional para a tabela HTML se for muito longo
        let situationDisplay = finalResult.situation;
        if (situationDisplay === "Aprovado pelo Conselho") {
          situationDisplay = "Ap. Cons."; // Abrevia para a tela também, se preferir
        }
        return `
            <tr data-student-id="${student.id}" class="${(student.status || "ativo") !== "ativo" ? "student-inactive" : ""}">
          <td class="student-name" title="${student.name}"><span class="font-bold text-secondary mr-2">${student.number || "-"}</span>${student.name}</td>
                ${termCells}
                <td class="font-bold text-center ${finalGradeClass}" data-result="bulletin-final-average">${finalGradeDisplay}</td>
                <td class="font-bold text-center ${finalResult.situationClass}" data-result="bulletin-final-situation">${situationDisplay}</td>
            </tr>
            `;
      })
      .join("");

    const gridHtml = `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr>
                            <th rowspan="2" class="align-bottom student-name">Aluno</th>
                            ${mainHeaders}
                            <th rowspan="2" class="align-bottom text-center term-separator">Média Final</th>
                            <th rowspan="2" class="align-bottom text-center">Situação Final</th>
                        </tr>
                        <tr>
                            ${subHeaders}
                        </tr>
                    </thead>
                    <tbody>${studentRows}</tbody>
                </table>
            </div>
        `;

    const actionsHtml = `
         <div class="text-right mt-4 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]">
             <p class="text-sm text-secondary">A Média Final e a Situação são calculadas automaticamente, considerando os ajustes do 5º Conselho. Dados salvos.</p>
         </div>`;

    saveData(); // Salva os resultados calculados
    return { gridHtml, actionsHtml };
  };

  const openAppearanceModal = () => {
    const themes = [
      {
        id: "light-default",
        name: "Padrão Claro",
        colors: { main: "#f4f5f7", side: "#ffffff" },
      },
      {
        id: "light-sepia",
        name: "Sépia",
        colors: { main: "#fbf8f2", side: "#f3f0e9" },
      },
      {
        id: "light-mint",
        name: "Menta",
        colors: { main: "#f0fdf4", side: "#ffffff" },
      },
      {
        id: "dark-default",
        name: "Padrão Escuro",
        colors: { main: "#111827", side: "#1f2937" },
      },
      {
        id: "dark-charcoal",
        name: "Carvão",
        colors: { main: "#1c1c1c", side: "#262626" },
      },
      {
        id: "dark-blue",
        name: "Azul Escuro",
        colors: { main: "#0d1117", side: "#161b22" },
      },
    ];

    const themeOptionsHTML = themes
      .map(
        (theme) => `
            <div class="theme-option ${state.settings.theme === theme.id ? "selected" : ""}" data-theme-name="${theme.id}">
                <div class="theme-preview">
                    <div class="theme-preview-main" style="background-color: ${theme.colors.main};"></div>
                    <div class="theme-preview-side" style="background-color: ${theme.colors.side};"></div>
                </div>
                <p class="text-sm text-center mt-2 font-medium">${theme.name}</p>
            </div>
        `,
      )
      .join("");

    const colorOptionsHTML = extendedColorPalette
      .map(
        (color) =>
          `<div class="color-option ${state.settings.color === color ? "selected" : ""}" style="background-color: ${color};" data-color="${color}"></div>`,
      )
      .join("");

    CustomSwal.fire({
      title: "Aparência do Sistema",
      html: `
                <div class="swal-modern-form text-left">
                     <div class="swal-modern-input-group">
                        <label class="swal-modern-label">Tema de Fundo</label>
                        <div class="grid grid-cols-3 gap-3 mt-1">${themeOptionsHTML}</div>
                    </div>
                    <hr class="border-border-color my-4">
                     <div class="swal-modern-input-group">
                        <label class="swal-modern-label">Cor de Destaque</label>
                        <div class="flex flex-wrap items-center gap-3 justify-center mt-1">${colorOptionsHTML}</div>
                    </div>
                </div>`,
      showConfirmButton: false,
      showCloseButton: true,
    });

    document.querySelectorAll(".theme-option").forEach((option) => {
      option.addEventListener("click", () => {
        const newTheme = option.dataset.themeName;
        state.settings.theme = newTheme;
        applyAppearance();
        saveData();
        document
          .querySelector(".theme-option.selected")
          ?.classList.remove("selected");
        option.classList.add("selected");
      });
    });

    document.querySelectorAll(".color-option").forEach((option) => {
      option.addEventListener("click", () => {
        const newColor = option.dataset.color;
        state.settings.color = newColor;
        applyAppearance();
        saveData();
        document
          .querySelector(".color-option.selected")
          ?.classList.remove("selected");
        option.classList.add("selected");
      });
    });
  };

  const openNoteModal = (teacherId) => {
    CustomSwal.fire({
      title: "Nova Anotação",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label for="note-title" class="swal-modern-label">Título</label>
                    <input id="note-title" class="swal-modern-input" placeholder="Ex: Planejamento Semanal">
                </div>
                <div class="swal-modern-input-group">
                    <label for="note-date" class="swal-modern-label">Data</label>
                    <input id="note-date" type="date" class="swal-modern-input" value="${new Date().toISOString().split("T")[0]}">
                </div>
            </form>`,
      confirmButtonText: "Criar e Editar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const title = document.getElementById("note-title").value.trim();
        const date = document.getElementById("note-date").value;
        if (!title || !date) {
          Swal.showValidationMessage("Título e data são obrigatórios.");
          return false;
        }
        return { title, date };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const newNote = {
          id: generateUUID(),
          teacherId: teacherId,
          title: result.value.title,
          date: result.value.date,
          content: "",
        };
        state.notes.push(newNote);
        saveData();
        renderPage("edit-note", { noteId: newNote.id });
      }
    });
  };

  const openEditNoteMetadataModal = (noteId, fromPage = "school-data") => {
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) {
      CustomSwal.fire("Erro", "Anotação não encontrada.", "error");
      return;
    }

    CustomSwal.fire({
      title: "Editar Anotação",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label for="note-title" class="swal-modern-label">Título</label>
                    <input id="note-title" class="swal-modern-input" value="${note.title}">
                </div>
                <div class="swal-modern-input-group">
                    <label for="note-date" class="swal-modern-label">Data</label>
                    <input id="note-date" type="date" class="swal-modern-input" value="${note.date}">
                </div>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const title = document.getElementById("note-title").value.trim();
        const date = document.getElementById("note-date").value;
        if (!title || !date) {
          Swal.showValidationMessage("Título e data são obrigatórios.");
          return false;
        }
        return { title, date };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        note.title = result.value.title;
        note.date = result.value.date;
        saveData();

        if (fromPage === "organization") {
          renderPage("organization", { tab: "notes" });
        } else {
          renderPage("teacher-notes", { teacherId: note.teacherId });
        }
      }
    });
  };

  const openEditModal = (id, type) => {
    const item = state[`${type}s`].find((i) => i.id === id);
    const translatedType =
      typeTranslations[type] || type.charAt(0).toUpperCase() + type.slice(1);
    const title = `Editar ${translatedType}`;
    CustomSwal.fire({
      title: title,
      html: `
                <form class="swal-modern-form">
                    <div class="swal-modern-input-group">
                        <label for="edit-item-name" class="swal-modern-label">Nome</label>
                        <input id="edit-item-name" class="swal-modern-input" value="${item?.name || ""}">
                    </div>
                </form>
            `,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const name = document.getElementById("edit-item-name").value.trim();
        if (!name) {
          Swal.showValidationMessage("O nome é obrigatório!");
          return false;
        }
        return name;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        item.name = result.value;
        saveData();
        renderPage(`school-data`, { tab: `${type}s` });
      }
    });
  };

  const openClassModal = (id) => {
    const isEditing = id !== undefined;
    const cls = isEditing ? state.classes.find((c) => c.id === id) : null;
    if (state.schools.length === 0) {
      CustomSwal.fire(
        "Ação Necessária",
        'Você precisa cadastrar uma escola antes de criar turmas. Faça isso em "Dados da Escola".',
        "info",
      );
      return;
    }
    const schoolOptions = state.schools
      .map(
        (s) =>
          `<option value="${s.id}" ${cls?.schoolId === s.id ? "selected" : ""}>${s.name}</option>`,
      )
      .join("");

    const colorPaletteHTML = extendedColorPalette
      .map(
        (color) =>
          `<div class="color-option" style="background-color: ${color}" data-color="${color}"></div>`,
      )
      .join("");

    CustomSwal.fire({
      title: isEditing ? "Editar Turma" : "Nova Turma",
      html: `
                <form class="swal-modern-form">
                    <div class="swal-modern-input-group">
                        <label for="class-name" class="swal-modern-label">Nome da Turma</label>
                        <input id="class-name" class="swal-modern-input" value="${cls?.name || ""}" placeholder="Ex: 3º Ano A">
                    </div>
                    <div class="swal-modern-input-group">
                        <label for="class-school" class="swal-modern-label">Escola</label>
                        <select id="class-school" class="swal-modern-select">${schoolOptions}</select>
                    </div>
                    <div class="swal-modern-input-group">
                        <label class="swal-modern-label">Cor de Identificação</label>
                        <div id="class-color-palette" class="flex flex-wrap gap-2 pt-1 justify-center">${colorPaletteHTML}</div>
                    </div>
                </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const paletteContainer = document.getElementById("class-color-palette");
        const selectedColor = cls?.color || extendedColorPalette[0];
        const selectedSwatch = paletteContainer.querySelector(
          `[data-color="${selectedColor}"]`,
        );
        if (selectedSwatch) {
          selectedSwatch.classList.add("selected");
        }

        paletteContainer.addEventListener("click", (e) => {
          if (e.target.classList.contains("color-option")) {
            paletteContainer
              .querySelector(".selected")
              ?.classList.remove("selected");
            e.target.classList.add("selected");
          }
        });
      },
      preConfirm: () => {
        const name = document.getElementById("class-name").value;
        const schoolId = document.getElementById("class-school").value;
        const selectedColorEl = document.querySelector(
          "#class-color-palette .selected",
        );
        const color = selectedColorEl
          ? selectedColorEl.dataset.color
          : extendedColorPalette[0];
        if (!name || !schoolId) {
          Swal.showValidationMessage("Nome e escola são obrigatórios.");
          return false;
        }
        return { name, schoolId, color };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        if (isEditing) {
          Object.assign(cls, result.value);
        } else {
          state.classes.push({ id: generateUUID(), ...result.value });
        }
        saveData();
        renderPage("classes");
      }
    });
  };

  const openStudentModal = (classId, studentId) => {
    const isEditing = studentId !== undefined;
    const student = isEditing
      ? state.students.find((s) => s.id === studentId)
      : null;
    const currentStatus = student?.status || "ativo";

    CustomSwal.fire({
      title: isEditing ? "Editar Aluno" : "Adicionar Aluno",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label for="student-name" class="swal-modern-label">Nome Completo do Aluno</label>
                    <input id="student-name" class="swal-modern-input" value="${student?.name || ""}">
                </div>
                <div class="grid grid-cols-3 gap-4">
                    <div class="swal-modern-input-group">
                        <label for="student-number" class="swal-modern-label">Nº de Chamada</label>
                        <input id="student-number" type="number" class="swal-modern-input" value="${student?.number || ""}">
                    </div>
                     <div class="swal-modern-input-group">
                        <label for="student-ra" class="swal-modern-label">RA</label>
                        <input id="student-ra" type="text" class="swal-modern-input" value="${student?.ra || ""}">
                    </div>
                    <div class="swal-modern-input-group">
                        <label for="student-status" class="swal-modern-label">Status</label>
                        <select id="student-status" class="swal-modern-select">
                            <option value="ativo" ${currentStatus === "ativo" ? "selected" : ""}>Ativo</option>
                            <option value="transferido" ${currentStatus === "transferido" ? "selected" : ""}>Transferido</option>
                            <option value="remanejado" ${currentStatus === "remanejado" ? "selected" : ""}>Remanejado</option>
                        </select>
                    </div>
                </div>
                <div class="swal-modern-checkbox-group pt-2">
                    <input id="student-laudo" type="checkbox" class="form-checkbox h-5 w-5 text-[var(--theme-color)] focus:ring-0" ${student?.hasLaudo ? "checked" : ""}>
                    <label for="student-laudo" class="swal-modern-label cursor-pointer">Aluno possui laudo/necessidades especiais</label>
                </div>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const number = document.getElementById("student-number").value;
        const name = document
          .getElementById("student-name")
          .value.trim()
          .toUpperCase();
        const status = document.getElementById("student-status").value;
        const hasLaudo = document.getElementById("student-laudo").checked;
        const ra = document.getElementById("student-ra").value.trim();
        if (!name) {
          Swal.showValidationMessage("O nome do aluno é obrigatório!");
          return false;
        }
        return {
          number: number ? parseInt(number) : null,
          name,
          status,
          hasLaudo,
          ra,
        };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        if (isEditing) {
          Object.assign(student, result.value);
        } else {
          state.students.push({ id: generateUUID(), classId, ...result.value });
        }
        saveData();
        renderPage("manage-class", { id: classId });
      }
    });
  };

  const openBulkAddStudentModal = (classId) => {
    CustomSwal.fire({
      title: "Adicionar Alunos em Massa",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label for="student-list-textarea" class="swal-modern-label">Cole a lista de alunos (um por linha)</label>
                    <p class="text-xs text-secondary -mt-2">Formato: <b>Nº NOME COMPLETO RA</b>. O Nº é opcional. O RA deve ser a última informação na linha, separado por espaço.</p>
                    <textarea id="student-list-textarea" class="swal-modern-textarea" style="height: 200px;"></textarea>
                </div>
            </form>`,
      confirmButtonText: "Salvar Alunos",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const lines = document
          .getElementById("student-list-textarea")
          .value.split("\n");
        const studentsToAdd = lines
          .map((line) => line.trim())
          .filter((line) => line)
          .map((line) => {
            const parts = line.split(/\s+/);
            let number = null;
            let name = "";
            let ra = "";

            // Extrai o número da chamada, se for o primeiro elemento e puramente numérico
            if (/^\d+$/.test(parts[0])) {
              number = parseInt(parts.shift(), 10);
            }

            // Se ainda houver mais de uma parte, a última é o RA.
            if (parts.length > 1) {
              ra = parts.pop();
            }

            // O que sobrar é o nome.
            name = parts.join(" ").trim().toUpperCase();

            // Ignora a linha se o nome estiver em branco após a análise
            if (!name) return null;

            return {
              id: generateUUID(),
              classId,
              number,
              name,
              ra,
              status: "ativo",
              hasLaudo: false,
            };
          })
          .filter((student) => student !== null); // Filtra linhas inválidas

        if (studentsToAdd.length === 0) {
          Swal.showValidationMessage(
            "Insira pelo menos um aluno em um formato válido.",
          );
          return false;
        }
        return studentsToAdd;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        state.students.push(...result.value);
        saveData();
        renderPage("manage-class", { id: classId });
        CustomSwal.fire(
          "Sucesso!",
          `${result.value.length} alunos adicionados.`,
          "success",
        );
      }
    });
  };

  const openStudentTransferModal = (sourceClassId, studentId) => {
    const student = state.students.find((s) => s.id === studentId);
    const sourceClass = state.classes.find((c) => c.id === sourceClassId);

    if (!student || !sourceClass) {
      CustomSwal.fire(
        "Erro",
        "Aluno ou turma de origem não encontrados.",
        "error",
      );
      return;
    }

    const classOptions = state.classes
      .filter((c) => c.id !== sourceClassId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");

    if (!classOptions) {
      CustomSwal.fire(
        "Atenção",
        "Cadastre outra turma antes de realizar o remanejamento.",
        "warning",
      );
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    CustomSwal.fire({
      title: "Remanejar Aluno",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label class="swal-modern-label">Aluno</label>
                    <input class="swal-modern-input" value="${student.name}" disabled>
                </div>
                <div class="swal-modern-input-group">
                    <label class="swal-modern-label">Turma de Origem</label>
                    <input class="swal-modern-input" value="${sourceClass.name}" disabled>
                </div>
                <div class="swal-modern-input-group">
                    <label for="transfer-target-class" class="swal-modern-label">Nova Turma</label>
                    <select id="transfer-target-class" class="swal-modern-select">${classOptions}</select>
                </div>
                <div class="swal-modern-input-group">
                    <label for="transfer-date" class="swal-modern-label">Data do Remanejamento</label>
                    <input id="transfer-date" type="date" class="swal-modern-input" value="${today}">
                </div>
            </form>`,
      confirmButtonText: "Remanejar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const targetClassId = document.getElementById(
          "transfer-target-class",
        ).value;
        const transferDate = document.getElementById("transfer-date").value;

        if (!targetClassId) {
          Swal.showValidationMessage("Selecione a nova turma.");
          return false;
        }

        if (!transferDate) {
          Swal.showValidationMessage("Informe a data do remanejamento.");
          return false;
        }

        if (targetClassId === sourceClassId) {
          Swal.showValidationMessage(
            "A nova turma deve ser diferente da turma atual.",
          );
          return false;
        }

        return { targetClassId, transferDate };
      },
    }).then((result) => {
      if (!result.isConfirmed) return;

      const { targetClassId, transferDate } = result.value;
      const targetClass = state.classes.find((c) => c.id === targetClassId);

      const sourceClassStudentsSorted = state.students
        .filter((s) => s.classId === sourceClassId)
        .sort(
          (a, b) =>
            (a.number || 999) - (b.number || 999) ||
            a.name.localeCompare(b.name),
        );

      const fromPosition =
        sourceClassStudentsSorted.findIndex((s) => s.id === student.id) + 1;

      const nextNumber =
        state.students
          .filter((s) => s.classId === targetClassId)
          .reduce((maxNumber, s) => {
            const studentNumber = Number(s.number) || 0;
            return studentNumber > maxNumber ? studentNumber : maxNumber;
          }, 0) + 1;

      if (!Array.isArray(student.classMovements)) {
        student.classMovements = [];
      }

      student.classMovements.push({
        id: generateUUID(),
        type: "remanejamento",
        fromClassId: sourceClassId,
        toClassId: targetClassId,
        date: transferDate,
        fromNumber: student.number ?? null,
        fromPosition: fromPosition > 0 ? fromPosition : null,
      });

      student.classId = targetClassId;
      student.number = nextNumber;
      student.status = "ativo";

      saveData();
      renderPage("manage-class", { id: targetClassId });

      CustomSwal.fire(
        "Sucesso!",
        `${student.name} foi remanejado para ${targetClass?.name || "a nova turma"} com o nº ${nextNumber}.`,
        "success",
      );
    });
  };

  const openScheduleCellModal = (options) => {
    const {
      schoolId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      scheduleId,
      activeTab,
    } = options;

    // Detecta qual versão está sendo editada
    const container = mainContent.querySelector(
      "#schedule-grid-page-container",
    );
    const versionSelect = container?.querySelector("#version-select");
    const versao = versionSelect?.value || null;

    // Determina de onde buscar e onde salvar o schedule
    let schedulesToUse = state.schedules;
    let targetVersion = null;
    if (versao) {
      targetVersion = state.gradesHorarias?.find((v) => v.versao == versao);
      if (targetVersion) {
        // Garante que a versão tenha um array de schedules
        if (!targetVersion.schedules) {
          targetVersion.schedules = [];
        }
        schedulesToUse = targetVersion.schedules;
      }
    }

    const schedule = scheduleId
      ? schedulesToUse.find((s) => s.id === scheduleId)
      : null;

    const schoolClasses = state.classes.filter((c) => c.schoolId === schoolId);
    if (schoolClasses.length === 0 || state.subjects.length === 0) {
      CustomSwal.fire(
        "Ação Necessária",
        "Cadastre turmas (para esta escola) e disciplinas antes de criar um horário.",
        "info",
      );
      return;
    }

    const classOptions = schoolClasses
      .map(
        (c) =>
          `<option value="${c.id}" ${schedule?.classId === c.id ? "selected" : ""}>${c.name}</option>`,
      )
      .join("");
    const subjectOptions = state.subjects
      .map(
        (s) =>
          `<option value="${s.id}" ${schedule?.subjectId === s.id ? "selected" : ""}>${s.name}</option>`,
      )
      .join("");

    CustomSwal.fire({
      title: schedule ? "Editar Horário" : "Adicionar ao Horário",
      html: `
            <form class="swal-modern-form">
                <p class="text-sm text-secondary -mt-2 mb-2">Preencha os campos de <b>Turma e Disciplina</b> para agendar uma aula, OU apenas o campo de <b>Texto</b> para uma anotação visual.</p>
                <div class="swal-modern-input-group">
                    <label for="schedule-class-select" class="swal-modern-label">Turma</label>
                    <select id="schedule-class-select" class="swal-modern-select">
                        <option value="">Selecione...</option>
                        ${classOptions}
                    </select>
                </div>
                <div class="swal-modern-input-group">
                    <label for="schedule-subject-select" class="swal-modern-label">Disciplina</label>
                    <select id="schedule-subject-select" class="swal-modern-select">
                        <option value="">Selecione...</option>
                        ${subjectOptions}
                    </select>
                </div>
                <hr class="border-border-color">
                <div class="swal-modern-input-group">
                    <label for="schedule-visual-text" class="swal-modern-label">Texto (Alternativa à aula)</label>
                    <input id="schedule-visual-text" class="swal-modern-input" placeholder="Ex: Horário de Almoço, Reunião" value="${schedule?.visualText || ""}">
                </div>
            </form>`,
      showDenyButton: schedule,
      denyButtonText: "Remover",
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        let classId = document.getElementById("schedule-class-select").value;
        let subjectId = document.getElementById(
          "schedule-subject-select",
        ).value;
        const visualText = document
          .getElementById("schedule-visual-text")
          .value.trim();

        // Validação 1: Nada foi preenchido
        if (!classId && !subjectId && !visualText) {
          Swal.showValidationMessage(
            "Você deve agendar uma aula ou inserir um texto.",
          );
          return false;
        }

        // Validação 2: Apenas um dos campos da aula foi preenchido
        if ((classId && !subjectId) || (!classId && subjectId)) {
          Swal.showValidationMessage(
            "Para agendar uma aula, tanto a Turma quanto a Disciplina devem ser selecionadas.",
          );
          return false;
        }

        // Lógica de salvamento: se for um texto, zera os campos da aula
        if (visualText && !classId) {
          classId = null;
          subjectId = null;
        }

        return { classId, subjectId, visualText };
      },
    }).then((result) => {
      if (result.isConfirmed || result.isDenied) {
        if (result.isConfirmed) {
          if (schedule) {
            // Limpa os campos antigos antes de atribuir os novos
            schedule.classId = null;
            schedule.subjectId = null;
            schedule.visualText = "";
            Object.assign(schedule, result.value);
          } else {
            // Adiciona no local correto (versão ou schedules atuais)
            schedulesToUse.push({
              id: generateUUID(),
              teacherId,
              dayOfWeek: parseInt(dayOfWeek),
              startTime,
              endTime,
              classId: result.value.classId,
              subjectId: result.value.subjectId,
              visualText: result.value.visualText,
            });
          }
        } else if (result.isDenied) {
          // Remove do local correto
          const index = schedulesToUse.findIndex((s) => s.id === scheduleId);
          if (index !== -1) {
            schedulesToUse.splice(index, 1);
          }
        }
        saveData();
        const gridContainer = mainContent.querySelector(
          "#final-schedule-grid-container",
        );
        if (gridContainer) {
          gridContainer.innerHTML = renderScheduleGrid(
            schoolId,
            teacherId,
            versao,
          );

          const newGridContainer = mainContent.querySelector(
            "#final-schedule-grid-container",
          );
          if (newGridContainer) {
            const newActiveTabButton = newGridContainer.querySelector(
              `.page-tab[data-tab="${activeTab}"]`,
            );
            const newActiveContentPane = newGridContainer.querySelector(
              `#${activeTab}_grid_content`,
            );

            newGridContainer
              .querySelectorAll(".page-tab")
              .forEach((t) => t.classList.remove("active"));
            newGridContainer
              .querySelectorAll(".tab-content")
              .forEach((c) => c.classList.add("hidden"));

            if (newActiveTabButton && newActiveContentPane) {
              newActiveTabButton.classList.add("active");
              newActiveContentPane.classList.remove("hidden");
            }
          }
        }
      }
    });
  };

  const openManageVersionsModal = () => {
    // Ordena versões por data de início
    const sortedVersions = [...(state.gradesHorarias || [])].sort(
      (a, b) => new Date(a.dataInicio) - new Date(b.dataInicio),
    );

    const versionsListHTML =
      sortedVersions.length > 0
        ? sortedVersions
            .map((version) => {
              const inicio = new Date(
                version.dataInicio + "T12:00:00",
              ).toLocaleDateString("pt-BR");
              const fim = new Date(
                version.dataFim + "T12:00:00",
              ).toLocaleDateString("pt-BR");
              const isCurrent =
                new Date().toISOString().split("T")[0] >= version.dataInicio &&
                new Date().toISOString().split("T")[0] <= version.dataFim;

              return `
            <tr class="${isCurrent ? "bg-[var(--theme-color-light)]" : ""}">
                <td class="font-semibold">${version.versao}</td>
                <td>${inicio}</td>
                <td>${fim}</td>
                <td class="text-center">
                    ${isCurrent ? '<span class="status-badge status-lancado">Vigente</span>' : ""}
                </td>
                <td class="text-right">
                    <button class="btn-edit-version text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" 
                            data-version="${version.versao}">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${
                      !isCurrent
                        ? `<button class="btn-delete-version text-red-500 hover:text-red-700" 
                            data-version="${version.versao}">
                        <i class="fas fa-trash"></i>
                    </button>`
                        : ""
                    }
                </td>
            </tr>`;
            })
            .join("")
        : '<tr><td colspan="5" class="text-center py-4 text-secondary">Nenhuma versão cadastrada.</td></tr>';

    CustomSwal.fire({
      title: "Gerenciar Versões da Grade Horária",
      html: `
            <div class="text-left">
                <p class="text-sm text-secondary mb-4">
                    As versões permitem registrar mudanças na grade horária ao longo do ano. 
                    A frequência e o conteúdo são associados automaticamente à versão vigente na data da aula.
                </p>
                <div class="overflow-x-auto mb-4">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th>Versão</th>
                                <th>Data Início</th>
                                <th>Data Fim</th>
                                <th class="text-center">Status</th>
                                <th class="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${versionsListHTML}
                        </tbody>
                    </table>
                </div>
                <div class="text-right">
                    <button id="btn-add-version" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>Nova Versão
                    </button>
                </div>
            </div>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "Fechar",
      width: "800px",
      didOpen: () => {
        const modal = Swal.getPopup();

        modal
          .querySelector("#btn-add-version")
          ?.addEventListener("click", () => {
            Swal.close();
            openVersionModal();
          });

        modal.querySelectorAll(".btn-edit-version").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const versao = parseInt(e.currentTarget.dataset.version);
            const hasLaunches = hasLaunchesForVersion(versao);
            if (versao === 1 && state.gradesHorarias.length > 1) {
              CustomSwal.fire(
                "Ação não permitida",
                `A primeira versão não pode ser editada porque já existem outras versões.${hasLaunches ? " Há lançamentos associados a esta versão." : ""}`,
                "warning",
              );
              return;
            }
            Swal.close();
            openVersionModal(versao);
          });
        });

        modal.querySelectorAll(".btn-delete-version").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const versao = parseInt(e.currentTarget.dataset.version);
            const hasLaunches = hasLaunchesForVersion(versao);

            if (versao === 1) {
              CustomSwal.fire(
                "Ação não permitida",
                "A primeira versão não pode ser excluída.",
                "warning",
              );
              return;
            }

            const result = await CustomSwal.fire({
              title: "Confirmar Exclusão",
              text: `Deseja realmente excluir a versão ${versao}? Esta ação não pode ser desfeita.${hasLaunches ? " Há lançamentos associados a esta versão." : ""}`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Sim, excluir",
              cancelButtonText: "Cancelar",
            });

            if (result.isConfirmed) {
              const index = state.gradesHorarias.findIndex(
                (v) => v.versao === versao,
              );
              if (index !== -1) {
                state.gradesHorarias.splice(index, 1);
                await saveData();
                CustomSwal.fire(
                  "Excluída!",
                  "Versão removida com sucesso.",
                  "success",
                );
                openManageVersionsModal();
              }
            }
          });
        });
      },
    });
  };

  const openVersionModal = (versao) => {
    const isEditing = versao !== undefined;
    const version = isEditing
      ? state.gradesHorarias.find((v) => v.versao === versao)
      : null;

    // Calcula próximo número de versão
    const maxVersion =
      state.gradesHorarias.length > 0
        ? Math.max(...state.gradesHorarias.map((v) => v.versao))
        : 0;
    const nextVersion = maxVersion + 1;

    // Sugestão de data de início: dia seguinte ao fim da última versão
    let suggestedStartDate = new Date().toISOString().split("T")[0];
    if (state.gradesHorarias.length > 0 && !isEditing) {
      const lastVersion = state.gradesHorarias.reduce((prev, curr) =>
        new Date(curr.dataFim) > new Date(prev.dataFim) ? curr : prev,
      );
      const nextDay = new Date(lastVersion.dataFim);
      nextDay.setDate(nextDay.getDate() + 1);
      suggestedStartDate = nextDay.toISOString().split("T")[0];
    }

    CustomSwal.fire({
      title: isEditing ? `Editar Versão ${versao}` : "Nova Versão da Grade",
      html: `
            <form class="swal-modern-form text-left">
                <div class="swal-modern-input-group">
                    <label class="swal-modern-label">Número da Versão</label>
                    <input type="number" id="version-number" class="swal-modern-input" 
                           value="${version?.versao || nextVersion}" 
                           ${isEditing ? "readonly" : ""} min="1" required>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="swal-modern-input-group">
                        <label for="version-start-date" class="swal-modern-label">Data Início</label>
                        <input type="date" id="version-start-date" class="swal-modern-input" 
                               value="${version?.dataInicio || suggestedStartDate}" required>
                    </div>
                    <div class="swal-modern-input-group">
                        <label for="version-end-date" class="swal-modern-label">Data Fim</label>
                        <input type="date" id="version-end-date" class="swal-modern-input" 
                               value="${version?.dataFim || ""}" required>
                    </div>
                </div>
                <div class="swal-modern-input-group">
                    <label for="version-description" class="swal-modern-label">Descrição (Opcional)</label>
                    <textarea id="version-description" class="swal-modern-textarea" 
                              placeholder="Ex: Grade após mudança de turno, reajuste do 2º semestre...">${version?.descricao || ""}</textarea>
                </div>
                ${
                  isEditing
                    ? `<p class="text-xs text-secondary mt-2"><i class="fas fa-info-circle mr-1"></i>
                    Esta versão possui ${version?.schedules?.length || 0} horários cadastrados.${hasLaunchesForVersion(versao) ? " Há lançamentos associados a esta versão." : ""}</p>`
                    : `<div class="swal-modern-input-group mt-3">
                        <label class="flex items-center cursor-pointer">
                          <input type="checkbox" id="copy-current-schedule" class="form-checkbox mr-2" checked>
                          <span class="text-sm">Copiar grade horária atual para esta versão (${state.schedules.length} horários)</span>
                        </label>
                        <p class="text-xs text-secondary mt-1">Se desmarcado, a versão começará com grade vazia.</p>
                      </div>`
                }
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const numero = parseInt(
          document.getElementById("version-number").value,
        );
        const dataInicio = document.getElementById("version-start-date").value;
        const dataFim = document.getElementById("version-end-date").value;
        const descricao = document
          .getElementById("version-description")
          .value.trim();

        if (!numero || !dataInicio || !dataFim) {
          Swal.showValidationMessage(
            "Todos os campos obrigatórios devem ser preenchidos.",
          );
          return false;
        }

        if (dataInicio >= dataFim) {
          Swal.showValidationMessage(
            "A data de início deve ser anterior à data de fim.",
          );
          return false;
        }

        // Verifica sobreposição de datas com outras versões
        const overlap = state.gradesHorarias.find((v) => {
          if (isEditing && v.versao === versao) return false;
          return dataInicio <= v.dataFim && dataFim >= v.dataInicio;
        });

        if (overlap) {
          Swal.showValidationMessage(
            `As datas se sobrepõem à versão ${overlap.versao} (${overlap.dataInicio} a ${overlap.dataFim}).`,
          );
          return false;
        }

        return { numero, dataInicio, dataFim, descricao };
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (isEditing) {
          const versionToUpdate = state.gradesHorarias.find(
            (v) => v.versao === versao,
          );
          if (versionToUpdate) {
            versionToUpdate.dataInicio = result.value.dataInicio;
            versionToUpdate.dataFim = result.value.dataFim;
            versionToUpdate.descricao = result.value.descricao;
          }
        } else {
          // Verifica se deve copiar a grade atual
          const copySchedule = document.getElementById(
            "copy-current-schedule",
          )?.checked;
          const schedules = copySchedule
            ? JSON.parse(JSON.stringify(state.schedules)) // Cópia profunda
            : [];

          const newVersion = {
            versao: result.value.numero,
            dataInicio: result.value.dataInicio,
            dataFim: result.value.dataFim,
            descricao: result.value.descricao,
            schedules: schedules,
          };

          state.gradesHorarias.push(newVersion);
          copyLaunchesToVersion(newVersion);
        }
        await saveData();
        CustomSwal.fire(
          "Sucesso!",
          `Versão ${result.value.numero} ${isEditing ? "atualizada" : "criada"} com sucesso!`,
          "success",
        );
        openManageVersionsModal();
      }
    });
  };

  const openHomeworkModal = (courseId, id, termStart, termEnd) => {
    const isEditing = id !== undefined;
    const hw = isEditing ? state.homeworks.find((h) => h.id === id) : null;
    const course = getUniqueCourses().find(
      (c) => c.id === (hw ? `${hw.classId}|${hw.subjectId}` : courseId),
    );

    if (!course) {
      CustomSwal.fire(
        "Erro",
        "Turma/disciplina não encontrada para criar a atividade.",
        "error",
      );
      return;
    }

    const schoolCalendar = state.calendars[course.schoolId];
    const todayStr = new Date().toISOString().split("T")[0];
    const validTerms = (schoolCalendar?.terms || []).filter(
      (term) => term.startDate && term.endDate,
    );

    const referenceDate = hw?.assignedDate || todayStr;
    const referenceTerm =
      validTerms.find(
        (term) =>
          referenceDate >= term.startDate && referenceDate <= term.endDate,
      ) ||
      getCurrentTerm(schoolCalendar, new Date(`${referenceDate}T12:00:00`));

    let effectiveTermStart = termStart || referenceTerm?.startDate || "";
    let effectiveTermEnd = termEnd || referenceTerm?.endDate || "";

    if (!effectiveTermStart || !effectiveTermEnd) {
      if (validTerms.length > 0) {
        effectiveTermStart = validTerms[0].startDate;
        effectiveTermEnd = validTerms[validTerms.length - 1].endDate;
      } else {
        const currentYear = new Date().getFullYear();
        effectiveTermStart = `${currentYear}-01-01`;
        effectiveTermEnd = `${currentYear}-12-31`;
      }
    }

    const classDates = getScheduledDatesForTerm(
      course,
      effectiveTermStart,
      effectiveTermEnd,
    )
      .filter((day) => day.isSchoolDay)
      .map((day) => day.date);

    const classDatesSet = new Set(classDates);
    const allDatesSet = new Set();
    {
      const start = new Date(`${effectiveTermStart}T12:00:00`);
      const end = new Date(`${effectiveTermEnd}T12:00:00`);
      let current = new Date(start);
      while (current <= end) {
        allDatesSet.add(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    }

    const initialAssignedDate = hw?.assignedDate || classDates[0] || todayStr;
    const initialDueDate = hw?.dueDate || initialAssignedDate;

    const renderCalendar = (
      monthDate,
      currentSelectedDate,
      selectableDatesSet,
      dayButtonClass,
      navActionPrefix,
    ) => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const firstDay = new Date(year, month, 1, 12);
      const startDay = firstDay.getDay();
      const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
      const monthLabel = monthDate.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

      const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      const weekHeader = weekLabels
        .map(
          (label) =>
            `<div style="text-align:center;font-size:10px;font-weight:600;color:var(--text-secondary);">${label}</div>`,
        )
        .join("");

      let dayCells = "";
      for (let i = 0; i < startDay; i++) {
        dayCells += '<div aria-hidden="true"></div>';
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day, 12);
        const dateStr = dateObj.toISOString().split("T")[0];
        const isAllowed = selectableDatesSet.has(dateStr);
        const isSelected = dateStr === currentSelectedDate;
        const isToday = dateStr === todayStr;

        let style =
          "width:30px;height:30px;border-radius:7px;border:1px solid var(--border-color);font-size:11px;";

        if (isAllowed) {
          style +=
            "cursor:pointer;background:var(--bg-primary);color:var(--text-primary);";
          if (isSelected) {
            style +=
              "background:var(--theme-color);color:white;border-color:var(--theme-color-dark);font-weight:700;";
          } else if (isToday) {
            style +=
              "box-shadow:0 0 0 2px var(--theme-color-light) inset;font-weight:700;";
          }

          dayCells += `<button type="button" class="${dayButtonClass}" data-date="${dateStr}" style="${style}">${day}</button>`;
        } else {
          style +=
            "opacity:.35;cursor:not-allowed;background:var(--bg-primary);";
          dayCells += `<div style="display:flex;align-items:center;justify-content:center;${style}">${day}</div>`;
        }
      }

      return `
        <div style="border:1px solid var(--border-color);border-radius:10px;padding:8px;max-width:280px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
            <button type="button" data-action="${navActionPrefix}-prev" class="btn btn-subtle" style="padding:3px 7px;"><i class="fas fa-chevron-left"></i></button>
            <strong style="text-transform:capitalize;font-size:12px;">${monthLabel}</strong>
            <button type="button" data-action="${navActionPrefix}-next" class="btn btn-subtle" style="padding:3px 7px;"><i class="fas fa-chevron-right"></i></button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;justify-items:center;margin-bottom:4px;">${weekHeader}</div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;justify-items:center;">${dayCells}</div>
        </div>`;
    };

    CustomSwal.fire({
      title: isEditing
        ? "Editar Atividade em sala"
        : `Nova Atividade para ${course.name}`,
      width: 760,
      html: `
            <form class="swal-modern-form">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div class="swal-modern-input-group">
                        <label for="hw-assigned-date" class="swal-modern-label">Data Solicitação</label>
                        <input id="hw-assigned-date" type="hidden" value="${initialAssignedDate}">
                        <input id="hw-assigned-manual-dates" type="hidden" value="">
                        <div id="hw-assigned-calendar-container" class="mt-2"></div>
                        <button type="button" id="btn-hw-assigned-add-custom-date" style="width:fit-content;background:none;border:none;padding:2px 4px;font-size:11px;color:#fff;font-weight:bold;opacity:0.85;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-top:4px;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">
                          <i class="fas fa-plus" style="font-size:9px;"></i>Adicionar data
                        </button>
                    </div>
                    <div class="swal-modern-input-group">
                        <label for="hw-due-date" class="swal-modern-label">Data Entrega</label>
                        <input id="hw-due-date" type="hidden" value="${initialDueDate}">
                        <input id="hw-due-manual-dates" type="hidden" value="">
                        <div id="hw-due-calendar-container" class="mt-2"></div>
                        <button type="button" id="btn-hw-due-add-custom-date" style="width:fit-content;background:none;border:none;padding:2px 4px;font-size:11px;color:#fff;font-weight:bold;opacity:0.85;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-top:4px;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.85'">
                          <i class="fas fa-plus" style="font-size:9px;"></i>Adicionar data
                        </button>
                    </div>
                </div>
                <div class="swal-modern-input-group">
                    <label for="hw-description" class="swal-modern-label">Descrição da Atividade</label>
                    <textarea id="hw-description" class="swal-modern-textarea" placeholder="Detalhe a atividade, páginas do livro, exercícios, etc.">${hw?.description || ""}</textarea>
                </div>

                <dialog id="hw-extra-date-dialog" style="border:1px solid var(--border-color);border-radius:12px;padding:0;background:var(--bg-secondary);color:var(--text-primary);width:min(360px,92vw);">
                  <div style="padding:12px;display:flex;flex-direction:column;gap:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <strong>Adicionar data</strong>
                      <button type="button" id="btn-hw-extra-close" class="btn btn-subtle" style="padding:3px 7px;"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="text-xs text-secondary">Selecione qualquer data disponível no período.</div>
                    <div id="hw-extra-calendar-container"></div>
                    <div style="display:flex;justify-content:flex-end;gap:8px;">
                      <button type="button" id="btn-hw-extra-cancel" class="btn btn-subtle">Cancelar</button>
                      <button type="button" id="btn-hw-extra-confirm" class="btn btn-primary">Adicionar</button>
                    </div>
                  </div>
                </dialog>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      didOpen: (popup) => {
        const titleEl = popup.querySelector(".swal2-title");
        if (titleEl) {
          titleEl.style.fontSize = "1.15rem";
        }

        const htmlContainer = document.querySelector(".swal2-html-container");
        if (htmlContainer) {
          htmlContainer.style.maxHeight = "64vh";
          htmlContainer.style.overflowY = "auto";
          htmlContainer.style.overflowX = "hidden";
        }

        const assignedDateInput = document.getElementById("hw-assigned-date");
        const assignedManualDatesInput = document.getElementById(
          "hw-assigned-manual-dates",
        );
        const dueDateInput = document.getElementById("hw-due-date");
        const dueManualDatesInput = document.getElementById(
          "hw-due-manual-dates",
        );

        const assignedCalendarContainer = document.getElementById(
          "hw-assigned-calendar-container",
        );
        const dueCalendarContainer = document.getElementById(
          "hw-due-calendar-container",
        );

        const addAssignedCustomDateBtn = document.getElementById(
          "btn-hw-assigned-add-custom-date",
        );
        const addDueCustomDateBtn = document.getElementById(
          "btn-hw-due-add-custom-date",
        );

        const extraDialog = document.getElementById("hw-extra-date-dialog");
        const extraCalendarContainer = document.getElementById(
          "hw-extra-calendar-container",
        );
        const extraCloseBtn = document.getElementById("btn-hw-extra-close");
        const extraCancelBtn = document.getElementById("btn-hw-extra-cancel");
        const extraConfirmBtn = document.getElementById("btn-hw-extra-confirm");

        const assignedManualDates = new Set();
        const dueManualDates = new Set();

        if (
          assignedDateInput.value &&
          !classDatesSet.has(assignedDateInput.value)
        ) {
          assignedManualDates.add(assignedDateInput.value);
        }
        if (dueDateInput.value && !classDatesSet.has(dueDateInput.value)) {
          dueManualDates.add(dueDateInput.value);
        }

        const syncManualInputs = () => {
          if (assignedManualDatesInput) {
            assignedManualDatesInput.value =
              Array.from(assignedManualDates).join("|");
          }
          if (dueManualDatesInput) {
            dueManualDatesInput.value = Array.from(dueManualDates).join("|");
          }
        };

        syncManualInputs();

        let assignedVisibleMonth = new Date(
          `${(assignedDateInput.value || todayStr).slice(0, 7)}-01T12:00:00`,
        );
        let dueVisibleMonth = new Date(
          `${(dueDateInput.value || todayStr).slice(0, 7)}-01T12:00:00`,
        );
        let extraVisibleMonth = new Date(assignedVisibleMonth);
        let extraSelectedDate = assignedDateInput.value || todayStr;
        let extraTarget = "assigned";

        const getSelectableAssigned = () =>
          new Set([...classDatesSet, ...assignedManualDates]);
        const getSelectableDue = () =>
          new Set([...classDatesSet, ...dueManualDates]);

        const rerenderAssignedCalendar = () => {
          assignedCalendarContainer.innerHTML = renderCalendar(
            assignedVisibleMonth,
            assignedDateInput.value,
            getSelectableAssigned(),
            "hw-assigned-cal-day",
            "hw-assigned",
          );
        };

        const rerenderDueCalendar = () => {
          dueCalendarContainer.innerHTML = renderCalendar(
            dueVisibleMonth,
            dueDateInput.value,
            getSelectableDue(),
            "hw-due-cal-day",
            "hw-due",
          );
        };

        const rerenderExtraCalendar = () => {
          extraCalendarContainer.innerHTML = renderCalendar(
            extraVisibleMonth,
            extraSelectedDate,
            allDatesSet,
            "hw-extra-cal-day",
            "hw-extra",
          );
        };

        assignedCalendarContainer.addEventListener("click", (event) => {
          const dayButton = event.target.closest(".hw-assigned-cal-day");
          if (dayButton) {
            const date = dayButton.dataset.date;
            assignedDateInput.value = date;
            rerenderAssignedCalendar();
            return;
          }

          const actionButton = event.target.closest("button[data-action]");
          if (!actionButton) return;
          const action = actionButton.dataset.action;

          if (action === "hw-assigned-prev") {
            assignedVisibleMonth = new Date(
              assignedVisibleMonth.getFullYear(),
              assignedVisibleMonth.getMonth() - 1,
              1,
              12,
            );
            rerenderAssignedCalendar();
          } else if (action === "hw-assigned-next") {
            assignedVisibleMonth = new Date(
              assignedVisibleMonth.getFullYear(),
              assignedVisibleMonth.getMonth() + 1,
              1,
              12,
            );
            rerenderAssignedCalendar();
          }
        });

        dueCalendarContainer.addEventListener("click", (event) => {
          const dayButton = event.target.closest(".hw-due-cal-day");
          if (dayButton) {
            const date = dayButton.dataset.date;
            dueDateInput.value = date;
            rerenderDueCalendar();
            return;
          }

          const actionButton = event.target.closest("button[data-action]");
          if (!actionButton) return;
          const action = actionButton.dataset.action;

          if (action === "hw-due-prev") {
            dueVisibleMonth = new Date(
              dueVisibleMonth.getFullYear(),
              dueVisibleMonth.getMonth() - 1,
              1,
              12,
            );
            rerenderDueCalendar();
          } else if (action === "hw-due-next") {
            dueVisibleMonth = new Date(
              dueVisibleMonth.getFullYear(),
              dueVisibleMonth.getMonth() + 1,
              1,
              12,
            );
            rerenderDueCalendar();
          }
        });

        extraCalendarContainer.addEventListener("click", (event) => {
          const dayButton = event.target.closest(".hw-extra-cal-day");
          if (dayButton) {
            extraSelectedDate = dayButton.dataset.date;
            rerenderExtraCalendar();
            return;
          }

          const actionButton = event.target.closest("button[data-action]");
          if (!actionButton) return;
          const action = actionButton.dataset.action;

          if (action === "hw-extra-prev") {
            extraVisibleMonth = new Date(
              extraVisibleMonth.getFullYear(),
              extraVisibleMonth.getMonth() - 1,
              1,
              12,
            );
            rerenderExtraCalendar();
          } else if (action === "hw-extra-next") {
            extraVisibleMonth = new Date(
              extraVisibleMonth.getFullYear(),
              extraVisibleMonth.getMonth() + 1,
              1,
              12,
            );
            rerenderExtraCalendar();
          }
        });

        const closeExtraDialog = () => {
          if (typeof extraDialog.close === "function" && extraDialog.open) {
            extraDialog.close();
          }
        };

        addAssignedCustomDateBtn?.addEventListener("click", () => {
          extraTarget = "assigned";
          extraSelectedDate = assignedDateInput.value || todayStr;
          extraVisibleMonth = new Date(
            `${extraSelectedDate.slice(0, 7)}-01T12:00:00`,
          );
          rerenderExtraCalendar();
          if (typeof extraDialog.showModal === "function") {
            extraDialog.showModal();
          }
        });

        addDueCustomDateBtn?.addEventListener("click", () => {
          extraTarget = "due";
          extraSelectedDate = dueDateInput.value || todayStr;
          extraVisibleMonth = new Date(
            `${extraSelectedDate.slice(0, 7)}-01T12:00:00`,
          );
          rerenderExtraCalendar();
          if (typeof extraDialog.showModal === "function") {
            extraDialog.showModal();
          }
        });

        extraCloseBtn?.addEventListener("click", closeExtraDialog);
        extraCancelBtn?.addEventListener("click", closeExtraDialog);

        extraConfirmBtn?.addEventListener("click", () => {
          if (!extraSelectedDate || !allDatesSet.has(extraSelectedDate)) {
            return;
          }

          if (extraTarget === "due") {
            dueManualDates.add(extraSelectedDate);
            dueDateInput.value = extraSelectedDate;
            dueVisibleMonth = new Date(
              `${extraSelectedDate.slice(0, 7)}-01T12:00:00`,
            );
            rerenderDueCalendar();
          } else {
            assignedManualDates.add(extraSelectedDate);
            assignedDateInput.value = extraSelectedDate;
            assignedVisibleMonth = new Date(
              `${extraSelectedDate.slice(0, 7)}-01T12:00:00`,
            );
            rerenderAssignedCalendar();
          }

          syncManualInputs();
          closeExtraDialog();
        });

        rerenderAssignedCalendar();
        rerenderDueCalendar();
      },
      preConfirm: () => {
        const assignedDate = document.getElementById("hw-assigned-date").value;
        const assignedManualDatesRaw =
          document.getElementById("hw-assigned-manual-dates")?.value || "";
        const dueDate = document.getElementById("hw-due-date").value;
        const dueManualDatesRaw =
          document.getElementById("hw-due-manual-dates")?.value || "";
        const description = document
          .getElementById("hw-description")
          .value.trim();

        const selectableAssignedDates = new Set(classDates);
        const selectableDueDates = new Set(classDates);

        assignedManualDatesRaw
          .split("|")
          .filter(Boolean)
          .forEach((date) => selectableAssignedDates.add(date));

        dueManualDatesRaw
          .split("|")
          .filter(Boolean)
          .forEach((date) => selectableDueDates.add(date));

        if (!assignedDate || !dueDate || !description) {
          Swal.showValidationMessage("Todos os campos são obrigatórios.");
          return false;
        }

        if (!selectableAssignedDates.has(assignedDate)) {
          Swal.showValidationMessage(
            "Selecione a data de solicitação no calendário ou use 'Adicionar data'.",
          );
          return false;
        }

        if (!selectableDueDates.has(dueDate)) {
          Swal.showValidationMessage(
            "Selecione a data de entrega no calendário ou use 'Adicionar data'.",
          );
          return false;
        }

        const [classId, subjectId] = course.id.split("|");
        return { classId, subjectId, assignedDate, dueDate, description };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        if (isEditing) {
          Object.assign(hw, result.value);
        } else {
          state.homeworks.push({ id: generateUUID(), ...result.value });
        }
        saveData();
        const diaryPageContainer = document.getElementById(
          "diary-page-container",
        );
        if (diaryPageContainer) {
          const activeTabButton = diaryPageContainer.querySelector(
            "#diary-tabs .page-tab.active",
          );
          if (activeTabButton) activeTabButton.click();
        }
      }
    });
  };

  const openOccurrenceModal = (courseId, termStart, termEnd, id) => {
    const isEditing = id !== undefined;
    const occurrence = isEditing
      ? (state.occurrences || []).find((o) => o.id === id)
      : null;
    const course = getUniqueCourses().find(
      (c) =>
        c.id ===
        (occurrence
          ? `${occurrence.classId}|${occurrence.subjectId}`
          : courseId),
    );

    if (!course) {
      CustomSwal.fire(
        "Erro",
        "Turma/disciplina não encontrada para registrar a ocorrência.",
        "error",
      );
      return;
    }

    const classDates = getScheduledDatesForTerm(course, termStart, termEnd)
      .filter((day) => day.isSchoolDay)
      .map((day) => day.date);

    const uniqueDates = Array.from(new Set(classDates)).sort();

    if (!isEditing && uniqueDates.length === 0) {
      CustomSwal.fire(
        "Sem aulas no período",
        "Não há datas letivas no período selecionado para vincular a ocorrência.",
        "warning",
      );
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const selectedDate = isEditing
      ? occurrence?.occurrenceDate || todayStr
      : todayStr;
    const allowedDatesSet = new Set(uniqueDates);
    if (isEditing && occurrence?.occurrenceDate) {
      allowedDatesSet.add(occurrence.occurrenceDate);
    }
    const [courseClassId] = course.id.split("|");
    const studentsInClass = state.students
      .filter((student) => student.classId === courseClassId)
      .sort(
        (a, b) =>
          (a.number || 999) - (b.number || 999) || a.name.localeCompare(b.name),
      );

    const selectedStudents = Array.isArray(occurrence?.involvedStudentIds)
      ? occurrence.involvedStudentIds
      : [];

    let occurrenceSelectedStudents = [...selectedStudents];

    const formatFullDate = (dateString) => {
      if (!dateString) return "Sem data";
      return new Date(dateString + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    const renderOccurrenceCalendar = (monthDate, currentSelectedDate) => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const firstDay = new Date(year, month, 1, 12);
      const startDay = firstDay.getDay();
      const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
      const monthLabel = monthDate.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

      const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
      const weekHeader = weekLabels
        .map(
          (label) =>
            `<div style="text-align:center;font-size:10px;font-weight:600;color:var(--text-secondary);">${label}</div>`,
        )
        .join("");

      let dayCells = "";
      for (let i = 0; i < startDay; i++) {
        dayCells += '<div aria-hidden="true"></div>';
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day, 12);
        const dateStr = dateObj.toISOString().split("T")[0];
        const isAllowed = allowedDatesSet.has(dateStr);
        const isSelected = dateStr === currentSelectedDate;
        const isToday = dateStr === todayStr;

        let style =
          "width:30px;height:30px;border-radius:7px;border:1px solid var(--border-color);font-size:11px;";

        if (isAllowed) {
          style +=
            "cursor:pointer;background:var(--bg-primary);color:var(--text-primary);";
          if (isSelected) {
            style +=
              "background:var(--theme-color);color:white;border-color:var(--theme-color-dark);font-weight:700;";
          } else if (isToday) {
            style +=
              "box-shadow:0 0 0 2px var(--theme-color-light) inset;font-weight:700;";
          }

          dayCells += `<button type="button" class="occurrence-cal-day" data-date="${dateStr}" style="${style}">${day}</button>`;
        } else {
          style +=
            "opacity:.35;cursor:not-allowed;background:var(--bg-primary);";
          dayCells += `<div style="display:flex;align-items:center;justify-content:center;${style}">${day}</div>`;
        }
      }

      return `
        <div style="border:1px solid var(--border-color);border-radius:10px;padding:8px;max-width:280px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
            <button type="button" data-action="prev" class="btn btn-subtle" style="padding:3px 7px;"><i class="fas fa-chevron-left"></i></button>
            <strong style="text-transform:capitalize;font-size:12px;">${monthLabel}</strong>
            <button type="button" data-action="next" class="btn btn-subtle" style="padding:3px 7px;"><i class="fas fa-chevron-right"></i></button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;justify-items:center;margin-bottom:4px;">${weekHeader}</div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;justify-items:center;">${dayCells}</div>
        </div>`;
    };

    CustomSwal.fire({
      title: isEditing
        ? "Editar Ocorrência"
        : `Nova Ocorrência para ${course.name}`,
      width: 900,
      html: `
          <form class="swal-modern-form" id="occurrence-form">
            <div class="grid grid-cols-1 md:grid-cols-2 items-start" style="gap:4px;">
                    <div class="swal-modern-input-group">
                        <label for="occurrence-date" class="swal-modern-label">Data da Aula</label>
                    <input type="hidden" id="occurrence-date" value="${selectedDate}">
                    <div id="occurrence-calendar-container" class="mt-1"></div>
                    </div>
                    <div class="swal-modern-input-group" style="position:relative;">
                        <label class="swal-modern-label">Alunos Envolvidos</label>
                        <div id="occurrence-students-wrap" style="border:1px solid var(--border-color);border-radius:6px;padding:6px;cursor:text;" onclick="document.getElementById('occurrence-student-search').focus()">
                          <input type="text" id="occurrence-student-search" autocomplete="off" placeholder="Buscar aluno..." style="border:none;outline:none;background:transparent;color:var(--text-primary);font-size:13px;padding:2px 4px;width:100%;margin-top:0;">
                          <div id="occurrence-student-tags" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-top:6px;"></div>
                        </div>
                        <div id="occurrence-student-dropdown" style="display:none;position:absolute;z-index:9999;left:0;right:0;top:calc(100% + 4px);background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-height:180px;overflow-y:auto;"></div>
                    </div>
                </div>
                <div class="swal-modern-input-group">
                        <label for="occurrence-description" class="swal-modern-label">Descrição da Ocorrência</label>
                        <textarea id="occurrence-description" class="swal-modern-textarea" style="min-height: 120px;" placeholder="Descreva brevemente o ocorrido e as medidas tomadas...">${occurrence?.description || ""}</textarea>
                        <div class="swal-modern-checkbox-group">
                          <input id="occurrence-sent-to-principal" type="checkbox" class="form-checkbox" ${occurrence?.sentToPrincipal ? "checked" : ""}>
                          <label for="occurrence-sent-to-principal" class="swal-modern-label !mb-0">Encaminhado para a direção</label>
                        </div>
                </div>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const htmlContainer = document.querySelector(".swal2-html-container");
        if (htmlContainer) {
          htmlContainer.style.maxHeight = "64vh";
          htmlContainer.style.overflowY = "auto";
          htmlContainer.style.overflowX = "hidden";
        }

        const dateInput = document.getElementById("occurrence-date");
        const calendarContainer = document.getElementById(
          "occurrence-calendar-container",
        );

        const baseDate = dateInput.value || todayStr;
        let visibleMonth = new Date(`${baseDate.slice(0, 7)}-01T12:00:00`);

        const rerenderCalendar = () => {
          const selected = dateInput.value || todayStr;
          calendarContainer.innerHTML = renderOccurrenceCalendar(
            visibleMonth,
            selected,
          );
        };

        calendarContainer.addEventListener("click", (event) => {
          const dayButton = event.target.closest(".occurrence-cal-day");
          if (dayButton) {
            const date = dayButton.dataset.date;
            dateInput.value = date;
            rerenderCalendar();
            return;
          }

          const actionButton = event.target.closest("button[data-action]");
          if (!actionButton) return;

          const action = actionButton.dataset.action;
          if (action === "prev") {
            visibleMonth = new Date(
              visibleMonth.getFullYear(),
              visibleMonth.getMonth() - 1,
              1,
              12,
            );
            rerenderCalendar();
          } else if (action === "next") {
            visibleMonth = new Date(
              visibleMonth.getFullYear(),
              visibleMonth.getMonth() + 1,
              1,
              12,
            );
            rerenderCalendar();
          }
        });

        rerenderCalendar();

        // --- Autocomplete de alunos ---
        const renderStudentTags = () => {
          const tagsContainer = document.getElementById(
            "occurrence-student-tags",
          );
          tagsContainer.innerHTML = occurrenceSelectedStudents
            .map((sid) => {
              const student = studentsInClass.find((s) => s.id === sid);
              if (!student) return "";
              const label = student.number
                ? `${student.number} - ${student.name}`
                : student.name;
              return `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--theme-color-light);color:var(--theme-color-dark);border-radius:4px;padding:2px 8px;font-size:12px;font-weight:600;">${label}<button type="button" data-remove-student="${sid}" style="background:none;border:none;cursor:pointer;color:inherit;font-size:15px;line-height:1;padding:0;margin-left:2px;">&times;</button></span>`;
            })
            .join("");
          tagsContainer
            .querySelectorAll("[data-remove-student]")
            .forEach((btn) => {
              btn.addEventListener("click", () => {
                occurrenceSelectedStudents = occurrenceSelectedStudents.filter(
                  (id) => id !== btn.dataset.removeStudent,
                );
                renderStudentTags();
              });
            });
        };

        const renderStudentDropdown = (query) => {
          const dropdown = document.getElementById(
            "occurrence-student-dropdown",
          );
          const filtered = studentsInClass.filter((s) => {
            if (occurrenceSelectedStudents.includes(s.id)) return false;
            const label = (s.number ? `${s.number} ` : "") + s.name;
            return label.toLowerCase().includes(query.toLowerCase());
          });
          if (!query || filtered.length === 0) {
            dropdown.style.display = "none";
            return;
          }
          dropdown.innerHTML = filtered
            .map((s) => {
              const label = s.number ? `${s.number} - ${s.name}` : s.name;
              return `<div class="occurrence-dropdown-item" data-student-id="${s.id}" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border-color);">${label}</div>`;
            })
            .join("");
          dropdown
            .querySelectorAll(".occurrence-dropdown-item")
            .forEach((item) => {
              item.addEventListener("mouseover", () => {
                item.style.background = "var(--stripe-color)";
              });
              item.addEventListener("mouseout", () => {
                item.style.background = "";
              });
              item.addEventListener("mousedown", (e) => {
                e.preventDefault();
                occurrenceSelectedStudents.push(item.dataset.studentId);
                document.getElementById("occurrence-student-search").value = "";
                dropdown.style.display = "none";
                renderStudentTags();
              });
            });
          dropdown.style.display = "block";
        };

        renderStudentTags();

        const studentSearch = document.getElementById(
          "occurrence-student-search",
        );
        studentSearch.addEventListener("input", (e) =>
          renderStudentDropdown(e.target.value),
        );
        studentSearch.addEventListener("focus", (e) => {
          if (e.target.value) renderStudentDropdown(e.target.value);
        });
        studentSearch.addEventListener("blur", () => {
          setTimeout(() => {
            const d = document.getElementById("occurrence-student-dropdown");
            if (d) d.style.display = "none";
          }, 150);
        });
      },
      preConfirm: () => {
        const occurrenceDate =
          document.getElementById("occurrence-date")?.value || "";
        const description =
          document.getElementById("occurrence-description")?.value.trim() || "";
        const involvedStudentIds = occurrenceSelectedStudents;
        const sentToPrincipal =
          document.getElementById("occurrence-sent-to-principal")?.checked ||
          false;

        if (!occurrenceDate || !description) {
          Swal.showValidationMessage(
            "Data da aula e descrição são obrigatórias.",
          );
          return false;
        }

        if (!allowedDatesSet.has(occurrenceDate)) {
          Swal.showValidationMessage(
            "Selecione uma data clicando em um dia letivo habilitado no calendário.",
          );
          return false;
        }

        if (involvedStudentIds.length === 0) {
          Swal.showValidationMessage(
            "Selecione pelo menos um aluno envolvido.",
          );
          return false;
        }

        const [classId, subjectId] = course.id.split("|");
        return {
          classId,
          subjectId,
          occurrenceDate,
          description,
          involvedStudentIds,
          sentToPrincipal,
          createdAt: occurrence?.createdAt || new Date().toISOString(),
        };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        if (!state.occurrences) state.occurrences = [];

        if (isEditing) {
          Object.assign(occurrence, result.value);
        } else {
          state.occurrences.push({ id: generateUUID(), ...result.value });
        }

        saveData();

        const diaryPageContainer = document.getElementById(
          "diary-page-container",
        );
        if (diaryPageContainer) {
          const activeTabButton = diaryPageContainer.querySelector(
            "#diary-tabs .page-tab.active",
          );
          if (activeTabButton) activeTabButton.click();
        }
      }
    });
  };

  const openOccurrenceViewModal = (id) => {
    const occurrence = (state.occurrences || []).find((o) => o.id === id);
    if (!occurrence) return;

    const formattedDate = new Date(
      occurrence.occurrenceDate + "T12:00:00",
    ).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const involvedStudents = (occurrence.involvedStudentIds || [])
      .map(
        (studentId) =>
          state.students.find((student) => student.id === studentId)?.name,
      )
      .filter(Boolean);

    const studentsHtml =
      involvedStudents.length > 0
        ? `<ul class="list-disc pl-5 space-y-1">${involvedStudents.map((name) => `<li>${name}</li>`).join("")}</ul>`
        : "<p>Não informado</p>";

    CustomSwal.fire({
      title: "Detalhes da Ocorrência",
      html: `
            <div class="swal-modern-form text-left">
                <div class="swal-modern-input-group">
                    <strong class="swal-modern-label">Data da Aula</strong>
                    <p>${formattedDate}</p>
                </div>
                <div class="swal-modern-input-group">
                    <strong class="swal-modern-label">Encaminhado para direção</strong>
                    <p>${occurrence.sentToPrincipal ? "Sim" : "Não"}</p>
                </div>
                <div class="swal-modern-input-group">
                    <strong class="swal-modern-label">Alunos Envolvidos</strong>
                    ${studentsHtml}
                </div>
                <div class="swal-modern-input-group">
                    <strong class="swal-modern-label">Descrição</strong>
                    <p class="swal-event-description">${occurrence.description || ""}</p>
                </div>
            </div>
        `,
      showConfirmButton: false,
      showCloseButton: true,
    });
  };

  const openAssessmentModal = (courseId, termKey, id) => {
    const isEditing = id !== undefined;
    const assessment = isEditing
      ? state.assessments.find((a) => a.id === id)
      : null;
    const [classId, subjectId] = courseId.split("|");

    CustomSwal.fire({
      title: isEditing ? "Editar Avaliação" : "Nova Avaliação",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label for="assessment-title" class="swal-modern-label">Título da Avaliação</label>
                    <input id="assessment-title" class="swal-modern-input" value="${assessment?.title || ""}" placeholder="Ex: Prova Mensal">
                </div>
                <div class="swal-modern-input-group">
                    <label for="assessment-weight" class="swal-modern-label">Peso da Avaliação</label>
                    <input id="assessment-weight" type="number" class="swal-modern-input" min="0" step="0.1" value="${assessment?.weight !== undefined ? assessment.weight : "1.0"}">
                </div>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const title = document.getElementById("assessment-title").value.trim();
        const weight = parseFloat(
          document.getElementById("assessment-weight").value,
        );
        if (!title || isNaN(weight) || weight < 0) {
          Swal.showValidationMessage("Título e peso válido são obrigatórios.");
          return false;
        }
        return { title, weight };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        if (isEditing) {
          Object.assign(assessment, result.value);
        } else {
          state.assessments.push({
            id: generateUUID(),
            classId,
            subjectId,
            termKey,
            ...result.value,
          });
        }
        saveData();
        // Refresh the tab content by re-triggering the tab load
        const diaryPageContainer = document.getElementById(
          "diary-page-container",
        );
        if (diaryPageContainer) {
          const activeTabButton = diaryPageContainer.querySelector(
            "#diary-tabs .page-tab.active",
          );
          if (activeTabButton) {
            activeTabButton.click(); // This re-triggers the loadTabContent via the event listener
          }
        }
      }
    });
  };

  const openTaskModal = (id) => {
    const isEditing = id !== undefined;
    const task = isEditing ? state.tasks.find((t) => t.id === id) : null;

    CustomSwal.fire({
      title: isEditing ? "Editar Tarefa" : "Nova Tarefa",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label for="task-title" class="swal-modern-label">Título</label>
                    <input id="task-title" class="swal-modern-input" value="${task?.title || ""}" placeholder="O que precisa ser feito?">
                </div>
                 <div class="swal-modern-input-group">
                    <label for="task-desc" class="swal-modern-label">Descrição (Opcional)</label>
                    <textarea id="task-desc" class="swal-modern-textarea" style="height: 80px;" placeholder="Adicione mais detalhes...">${task?.description || ""}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="swal-modern-input-group">
                        <label for="task-due-date" class="swal-modern-label">Data de Entrega</label>
                        <input id="task-due-date" type="date" class="swal-modern-input" value="${task?.dueDate || ""}">
                    </div>
                    <div class="swal-modern-input-group">
                        <label for="task-priority" class="swal-modern-label">Prioridade</label>
                        <select id="task-priority" class="swal-modern-select">
                            <option value="baixa" ${task?.priority === "baixa" ? "selected" : ""}>Baixa</option>
                            <option value="media" ${task?.priority === "media" ? "selected" : ""}>Média</option>
                            <option value="alta" ${task?.priority === "alta" ? "selected" : ""}>Alta</option>
                        </select>
                    </div>
                </div>
                 <div class="grid grid-cols-2 gap-4">
                    <div class="swal-modern-input-group">
                        <label for="task-status" class="swal-modern-label">Status</label>
                        <select id="task-status" class="swal-modern-select">
                            <option value="a_fazer" ${task?.status === "a_fazer" ? "selected" : ""}>A Fazer</option>
                            <option value="em_andamento" ${task?.status === "em_andamento" ? "selected" : ""}>Em Andamento</option>
                            <option value="concluido" ${task?.status === "concluido" ? "selected" : ""}>Concluído</option>
                        </select>
                    </div>
                    <div class="swal-modern-input-group">
                        <label for="task-tags" class="swal-modern-label">Tags (separadas por vírgula)</label>
                        <input id="task-tags" class="swal-modern-input" value="${task?.tags.join(", ") || ""}" placeholder="Ex: planejamento, reunião">
                    </div>
                </div>
                <div class="swal-modern-input-group">
                  <label for="task-recurrence" class="swal-modern-label">Recorrência</label>
                  <select id="task-recurrence" class="swal-modern-select">
                    <option value="none" ${!task?.recurrence || task?.recurrence === "none" ? "selected" : ""}>Não repetir</option>
                    <option value="daily" ${task?.recurrence === "daily" ? "selected" : ""}>Diária</option>
                    <option value="weekly" ${task?.recurrence === "weekly" ? "selected" : ""}>Semanal</option>
                    <option value="monthly" ${task?.recurrence === "monthly" ? "selected" : ""}>Mensal</option>
                    <option value="yearly" ${task?.recurrence === "yearly" ? "selected" : ""}>Anual</option>
                  </select>
                </div>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      showDenyButton: isEditing,
      denyButtonText: '<i class="fas fa-archive mr-2"></i>Arquivar',
      footer: isEditing
        ? `<button id="btn-delete-task-modal" class="btn btn-danger"><i class="fas fa-trash mr-2"></i>Excluir</button>`
        : "",
      didOpen: () => {
        if (isEditing) {
          document
            .getElementById("btn-delete-task-modal")
            .addEventListener("click", () => {
              handleDelete(id, "tasks", { tab: "tasks" });
              Swal.close();
            });
        }
      },
      preConfirm: () => {
        const title = document.getElementById("task-title").value.trim();
        const description = document.getElementById("task-desc").value.trim();
        const dueDate = document.getElementById("task-due-date").value || null;
        const priority = document.getElementById("task-priority").value;
        const status = document.getElementById("task-status").value;
        const recurrence = document.getElementById("task-recurrence").value;
        const tags = document
          .getElementById("task-tags")
          .value.split(",")
          .map((t) => t.trim())
          .filter((t) => t);

        if (!title) {
          Swal.showValidationMessage("O título da tarefa é obrigatório.");
          return false;
        }
        if (recurrence !== "none" && !dueDate) {
          Swal.showValidationMessage(
            "Defina uma data de entrega para usar recorrência.",
          );
          return false;
        }
        return {
          title,
          description,
          dueDate,
          priority,
          status,
          tags,
          recurrence,
        };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        if (isEditing) {
          Object.assign(task, result.value);
        } else {
          const newTask = {
            id: generateUUID(),
            createdAt: new Date().toISOString(),
            isArchived: false,
            ...result.value,
          };
          state.tasks.push(newTask);
        }
        saveData();
        renderPage("organization", { tab: "tasks" });
      } else if (result.isDenied) {
        task.isArchived = true;
        saveData();
        CustomSwal.fire("Arquivado!", "A tarefa foi arquivada.", "success");
        renderPage("organization", { tab: "tasks" });
      }
    });
  };

  const openBackupRestoreModal = () => {
    CustomSwal.fire({
      title: "Backup e Restauração",
      html: `
                <div class="text-left space-y-4">
                    <div>
                        <p class="text-sm font-semibold">Exportar Dados</p>
                        <p class="text-xs text-secondary mb-2">Salva todos os seus dados (turmas, alunos, registros, etc.) em um único arquivo .json no seu computador.</p>
                        <button id="export-data-btn" class="btn btn-subtle w-full"><i class="fas fa-download mr-2"></i>Exportar para Arquivo</button>
                    </div>
                    <hr class="border-border-color">
                    <div>
                        <p class="text-sm font-semibold">Importar Dados</p>
                        <p class="text-xs text-red-500 mb-2"><b>Atenção:</b> Isso substituirá todos os dados atuais. Esta ação não pode ser desfeita.</p>
                        <input type="file" id="import-data-input" class="hidden" accept=".json,application/json">
                        <button id="import-data-btn" class="btn btn-danger w-full"><i class="fas fa-upload mr-2"></i>Importar de Arquivo</button>
                    </div>
                </div>`,
      showConfirmButton: false,
      showCloseButton: true,
    });
    document
      .getElementById("export-data-btn")
      .addEventListener("click", exportData);
    document.getElementById("import-data-btn").addEventListener("click", () => {
      document.getElementById("import-data-input").click();
    });
    document
      .getElementById("import-data-input")
      .addEventListener("change", importData);
  };

  const exportData = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `actEducacao_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      CustomSwal.fire(
        "Sucesso!",
        "Seu arquivo de backup foi salvo.",
        "success",
      );
    } catch (error) {
      CustomSwal.fire("Erro", "Não foi possível exportar os dados.", "error");
      console.error(error);
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedState = JSON.parse(e.target.result);
        if (
          importedState &&
          importedState.settings &&
          Array.isArray(importedState.schools)
        ) {
          Swal.fire({
            title: "Confirmar Importação?",
            text: "Todos os seus dados atuais serão substituídos pelos dados do arquivo. Esta ação não pode ser desfeita.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim, importar!",
            cancelButtonText: "Cancelar",
          }).then((result) => {
            if (result.isConfirmed) {
              state = importedState;
              saveData();
              Swal.fire({
                title: "Importado!",
                text: "Seus dados foram restaurados. A página será recarregada.",
                icon: "success",
              }).then(() => {
                location.reload();
              });
            }
          });
        } else {
          throw new Error("Formato de arquivo inválido.");
        }
      } catch (err) {
        Swal.fire(
          "Erro",
          "O arquivo de backup selecionado é inválido ou está corrompido.",
          "error",
        );
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const attachGlobalEventListeners = () => {
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.addEventListener("click", (e) =>
        renderPage(e.currentTarget.dataset.page),
      );
    });
    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener("click", toggleSidebarCollapsedState);
    }
    themeBtn.addEventListener("click", openAppearanceModal);
    backupBtn.addEventListener("click", openBackupRestoreModal);
  };

  const attachPageEventListeners = (pageId, params) => {
    if (pageId === "reports") {
      ensureIndividualReportsState();

      const templateGenerateSelect = mainContent.querySelector(
        "#ind-report-template-generate",
      );
      const studentPicker = mainContent.querySelector(".student-picker");
      const studentInput = mainContent.querySelector(
        "#ind-report-student-input",
      );
      const studentIdInput = mainContent.querySelector(
        "#ind-report-student-id",
      );
      const studentDropdown = mainContent.querySelector(
        "#ind-report-student-dropdown",
      );
      const courseSelect = mainContent.querySelector(
        "#ind-report-course-select",
      );
      const dateInput = mainContent.querySelector("#ind-report-date");
      const titleInput = mainContent.querySelector("#ind-report-title");
      const customVarsInput = mainContent.querySelector(
        "#ind-report-custom-vars",
      );
      const outputInput = mainContent.querySelector("#ind-report-output");
      const historyList = mainContent.querySelector("#ind-history-list");
      let studentLookup = new Map();
      let dropdownStudents = [];

      const hideStudentDropdown = () => {
        studentDropdown?.classList.remove("visible");
      };

      const renderStudentDropdown = ({
        query = "",
        forceVisible = false,
      } = {}) => {
        if (!studentDropdown) return;

        const normalizedQuery = String(query || "")
          .trim()
          .toLowerCase();
        const students = getStudentsFilteredBySelectedCourse();
        dropdownStudents = students.filter((student) => {
          if (!normalizedQuery) return true;
          const label = getStudentDisplayLabel(student).toLowerCase();
          const name = String(student.name || "").toLowerCase();
          return (
            label.includes(normalizedQuery) || name.includes(normalizedQuery)
          );
        });

        if (dropdownStudents.length === 0) {
          studentDropdown.innerHTML =
            '<div class="student-picker-empty">Nenhum aluno encontrado para o filtro atual.</div>';
        } else {
          studentDropdown.innerHTML = dropdownStudents
            .map(
              (student) =>
                `<button type="button" class="student-picker-option" data-student-id="${student.id}">${escapeHtml(getStudentDisplayLabel(student))}</button>`,
            )
            .join("");
        }

        const shouldShow =
          forceVisible ||
          document.activeElement === studentInput ||
          normalizedQuery;
        studentDropdown.classList.toggle("visible", Boolean(shouldShow));
      };

      const getStudentsFilteredBySelectedCourse = () => {
        const selectedCourseId = courseSelect?.value || "";
        const selectedCourse = getUniqueCourses().find(
          (course) => course.id === selectedCourseId,
        );
        const selectedClassId = selectedCourse?.classId || "";

        return state.students
          .filter((student) => student.status !== "transferido")
          .filter(
            (student) =>
              !selectedClassId || student.classId === selectedClassId,
          )
          .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || "")),
          );
      };

      const getStudentDisplayLabel = (student) => {
        const classInfo = state.classes.find(
          (cls) => cls.id === student.classId,
        );
        const className = classInfo?.name || "Sem turma";
        return `${student.name} (${className})`;
      };

      const setSelectedStudent = (studentId = "") => {
        if (!studentIdInput || !studentInput) return;

        const student = state.students.find((item) => item.id === studentId);
        if (!student) {
          studentIdInput.value = "";
          studentInput.value = "";
          return;
        }

        studentIdInput.value = student.id;
        studentInput.value = getStudentDisplayLabel(student);
      };

      const refreshStudentAutocomplete = () => {
        const students = getStudentsFilteredBySelectedCourse();
        const normalizedNameCount = new Map();
        studentLookup = new Map();

        students.forEach((student) => {
          const key = String(student?.name || "")
            .trim()
            .toLowerCase();
          if (!key) return;
          normalizedNameCount.set(key, (normalizedNameCount.get(key) || 0) + 1);
        });

        students.forEach((student) => {
          const displayLabel = getStudentDisplayLabel(student);
          const normalizedLabel = displayLabel.trim().toLowerCase();
          studentLookup.set(normalizedLabel, student.id);

          const normalizedName = String(student.name || "")
            .trim()
            .toLowerCase();
          if (normalizedNameCount.get(normalizedName) === 1) {
            studentLookup.set(normalizedName, student.id);
          }
        });

        renderStudentDropdown({ query: studentInput?.value || "" });

        const selectedStudentId = studentIdInput?.value || "";
        const selectedStudentStillAvailable = students.some(
          (student) => student.id === selectedStudentId,
        );

        if (!selectedStudentStillAvailable) {
          if (studentIdInput) studentIdInput.value = "";
          if (studentInput) studentInput.value = "";
        } else {
          setSelectedStudent(selectedStudentId);
        }
      };

      const syncSelectedStudentFromInput = () => {
        const typed = String(studentInput?.value || "").trim();
        if (!typed) {
          if (studentIdInput) studentIdInput.value = "";
          return;
        }

        const normalizedTyped = typed.toLowerCase();
        const directId = studentLookup.get(normalizedTyped);
        if (directId) {
          if (studentIdInput) studentIdInput.value = directId;
          return;
        }

        if (studentIdInput) studentIdInput.value = "";
      };

      const refreshTemplateOptions = (selectedId = "") => {
        const sortedTemplates = [...state.individualReportTemplates].sort(
          (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
        );

        const modelOptions = sortedTemplates
          .map(
            (template) =>
              `<option value="${template.id}">${escapeHtml(template.name)}</option>`,
          )
          .join("");

        if (templateGenerateSelect) {
          templateGenerateSelect.innerHTML = `<option value="">-- Selecione --</option>${modelOptions}`;
          if (
            selectedId &&
            sortedTemplates.some((template) => template.id === selectedId)
          ) {
            templateGenerateSelect.value = selectedId;
          }
        }
      };

      const openTemplateManagementModal = async () => {
        await CustomSwal.fire({
          title: "Modelos e Variáveis",
          width: 920,
          showConfirmButton: false,
          showCloseButton: true,
          html: `
            <div class="swal-modern-form">
              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-template-select">Modelo salvo</label>
                <select id="swal-ind-template-select" class="swal-modern-select">
                  <option value="">-- Novo modelo --</option>
                </select>
              </div>

              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-template-name">Nome do modelo</label>
                <input id="swal-ind-template-name" class="swal-modern-input" placeholder="Ex.: Relatório de acompanhamento bimestral" />
              </div>

              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-template-content">Texto padrão do modelo</label>
                <textarea id="swal-ind-template-content" class="swal-modern-textarea" style="min-height: 220px;" placeholder="Digite o texto e use variáveis, por exemplo: {{NOME DO ALUNO}}"></textarea>
                <p class="text-xs text-secondary mt-2">Clique em uma variável para inserir no texto:</p>
                <div id="swal-ind-variable-chips" class="student-report-var-chips mt-2"></div>
                <p id="swal-ind-detected-vars" class="text-xs text-secondary mt-2">Variáveis detectadas: nenhuma.</p>
              </div>

              <div class="swal-modern-input-group">
                <label class="swal-modern-label">Variáveis personalizadas (com valor padrão)</label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input id="swal-ind-var-name" class="swal-modern-input" placeholder="Nome da variável (ex.: CRITÉRIO)" />
                  <input id="swal-ind-var-default" class="swal-modern-input" placeholder="Valor padrão (ex.: Participação)" />
                </div>
                <div class="flex justify-end mt-2">
                  <button id="swal-btn-add-ind-var" class="btn btn-subtle" type="button"><i class="fas fa-plus mr-2"></i>Adicionar variável</button>
                </div>
                <div id="swal-ind-vars-list" class="space-y-2 mt-2"></div>
              </div>

              <div class="flex flex-wrap gap-2 justify-end">
                <button id="swal-btn-new-ind-template" class="btn btn-subtle" type="button"><i class="fas fa-file mr-2"></i>Novo</button>
                <button id="swal-btn-delete-ind-template" class="btn btn-danger" type="button"><i class="fas fa-trash mr-2"></i>Excluir</button>
                <button id="swal-btn-save-ind-template" class="btn btn-primary" type="button"><i class="fas fa-save mr-2"></i>Salvar modelo</button>
              </div>
            </div>
          `,
          didOpen: () => {
            const popup = Swal.getPopup();
            if (!popup) return;

            const templateSelect = popup.querySelector(
              "#swal-ind-template-select",
            );
            const templateNameInput = popup.querySelector(
              "#swal-ind-template-name",
            );
            const templateContentInput = popup.querySelector(
              "#swal-ind-template-content",
            );
            const detectedVarsLabel = popup.querySelector(
              "#swal-ind-detected-vars",
            );
            const variableChipsContainer = popup.querySelector(
              "#swal-ind-variable-chips",
            );
            const customVariableNameInput =
              popup.querySelector("#swal-ind-var-name");
            const customVariableDefaultInput = popup.querySelector(
              "#swal-ind-var-default",
            );
            const customVariablesList = popup.querySelector(
              "#swal-ind-vars-list",
            );

            const renderVariableChips = () => {
              const standardSet = new Set(INDIVIDUAL_REPORT_STANDARD_VARIABLES);
              const customNames = (state.individualReportVariables || [])
                .map((variable) =>
                  normalizeIndividualReportVariableName(variable?.name || ""),
                )
                .filter(Boolean)
                .filter((name) => !standardSet.has(name));
              const allVariables = [
                ...INDIVIDUAL_REPORT_STANDARD_VARIABLES,
                ...customNames,
              ];

              if (!variableChipsContainer) return;
              variableChipsContainer.innerHTML = allVariables
                .map(
                  (variable) =>
                    `<button type="button" class="student-report-var-chip" data-variable="${escapeHtml(variable)}">{{${escapeHtml(variable)}}}</button>`,
                )
                .join("");
            };

            const renderCustomVariablesList = () => {
              if (!customVariablesList) return;

              if (!state.individualReportVariables?.length) {
                customVariablesList.innerHTML =
                  '<p class="text-xs text-secondary">Nenhuma variável personalizada cadastrada.</p>';
                return;
              }

              customVariablesList.innerHTML = state.individualReportVariables
                .map(
                  (variable) => `
                    <div class="flex items-center justify-between gap-2 p-2 rounded-lg" style="border:1px solid var(--border-color); background-color: var(--bg-primary);">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold truncate">{{${escapeHtml(variable.name || "")}}}</p>
                        <p class="text-xs text-secondary truncate">Padrão: ${escapeHtml(variable.defaultValue || "(vazio)")}</p>
                      </div>
                      <button class="btn btn-danger btn-remove-ind-var" data-id="${escapeHtml(variable.id || "")}" type="button" style="padding:6px 10px;">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  `,
                )
                .join("");
            };

            const renderDetectedVariablesLabel = () => {
              const variables = extractVariablesFromTemplate(
                templateContentInput?.value || "",
              );
              if (!detectedVarsLabel) return;
              detectedVarsLabel.textContent =
                variables.length > 0
                  ? `Variáveis detectadas: ${variables.join(", ")}`
                  : "Variáveis detectadas: nenhuma.";
            };

            const refreshModalTemplateOptions = (selectedId = "") => {
              const sortedTemplates = [...state.individualReportTemplates].sort(
                (a, b) =>
                  String(a.name || "").localeCompare(String(b.name || "")),
              );
              const modelOptions = sortedTemplates
                .map(
                  (template) =>
                    `<option value="${template.id}">${escapeHtml(template.name)}</option>`,
                )
                .join("");

              if (!templateSelect) return;
              templateSelect.innerHTML = `<option value="">-- Novo modelo --</option>${modelOptions}`;
              templateSelect.value =
                selectedId &&
                sortedTemplates.some((template) => template.id === selectedId)
                  ? selectedId
                  : "";
            };

            const loadTemplateEditor = (templateId) => {
              const template = state.individualReportTemplates.find(
                (item) => item.id === templateId,
              );
              if (!template) {
                if (templateNameInput) templateNameInput.value = "";
                if (templateContentInput) templateContentInput.value = "";
                renderDetectedVariablesLabel();
                return;
              }

              if (templateNameInput)
                templateNameInput.value = template.name || "";
              if (templateContentInput)
                templateContentInput.value = template.content || "";
              renderDetectedVariablesLabel();
            };

            refreshModalTemplateOptions();
            loadTemplateEditor("");
            renderVariableChips();
            renderCustomVariablesList();

            templateSelect?.addEventListener("change", (e) => {
              loadTemplateEditor(e.target.value);
            });

            popup
              .querySelector("#swal-btn-new-ind-template")
              ?.addEventListener("click", () => {
                if (templateSelect) templateSelect.value = "";
                loadTemplateEditor("");
              });

            templateContentInput?.addEventListener(
              "input",
              renderDetectedVariablesLabel,
            );

            variableChipsContainer?.addEventListener("click", (e) => {
              const chipButton = e.target.closest(".student-report-var-chip");
              if (!chipButton || !templateContentInput) return;

              const variableName = chipButton.dataset.variable;
              const textToInsert = `{{${variableName}}}`;
              const start = templateContentInput.selectionStart || 0;
              const end = templateContentInput.selectionEnd || 0;
              const previousValue = templateContentInput.value || "";

              templateContentInput.value =
                previousValue.slice(0, start) +
                textToInsert +
                previousValue.slice(end);
              templateContentInput.focus();
              templateContentInput.setSelectionRange(
                start + textToInsert.length,
                start + textToInsert.length,
              );
              renderDetectedVariablesLabel();
            });

            popup
              .querySelector("#swal-btn-add-ind-var")
              ?.addEventListener("click", () => {
                const normalizedName = normalizeIndividualReportVariableName(
                  customVariableNameInput?.value || "",
                );
                const defaultValue = String(
                  customVariableDefaultInput?.value || "",
                ).trim();

                if (!normalizedName) {
                  CustomSwal.fire(
                    "Atenção",
                    "Informe o nome da variável personalizada.",
                    "warning",
                  );
                  return;
                }

                if (
                  INDIVIDUAL_REPORT_STANDARD_VARIABLES.includes(normalizedName)
                ) {
                  CustomSwal.fire(
                    "Atenção",
                    "Essa variável já existe na lista padrão.",
                    "warning",
                  );
                  return;
                }

                const existing = (state.individualReportVariables || []).find(
                  (variable) =>
                    normalizeIndividualReportVariableName(
                      variable?.name || "",
                    ) === normalizedName,
                );

                if (existing) {
                  existing.defaultValue = defaultValue;
                } else {
                  state.individualReportVariables.push({
                    id: generateUUID(),
                    name: normalizedName,
                    defaultValue,
                  });
                }

                saveData();
                if (customVariableNameInput) customVariableNameInput.value = "";
                if (customVariableDefaultInput)
                  customVariableDefaultInput.value = "";
                renderCustomVariablesList();
                renderVariableChips();

                CustomSwal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "success",
                  title: "Variável personalizada salva.",
                  timer: 1400,
                  showConfirmButton: false,
                });
              });

            customVariablesList?.addEventListener("click", (e) => {
              const removeButton = e.target.closest(".btn-remove-ind-var");
              if (!removeButton) return;

              const variableId = removeButton.dataset.id || "";
              if (!variableId) return;

              state.individualReportVariables =
                state.individualReportVariables.filter(
                  (variable) => variable.id !== variableId,
                );

              saveData();
              renderCustomVariablesList();
              renderVariableChips();
            });

            popup
              .querySelector("#swal-btn-save-ind-template")
              ?.addEventListener("click", () => {
                const selectedId = templateSelect?.value || "";
                const name = templateNameInput?.value?.trim() || "";
                const content = templateContentInput?.value?.trim() || "";

                if (!name || !content) {
                  CustomSwal.fire(
                    "Atenção",
                    "Informe nome e conteúdo do modelo antes de salvar.",
                    "warning",
                  );
                  return;
                }

                let selectedTemplateId = selectedId;

                if (selectedId) {
                  const template = state.individualReportTemplates.find(
                    (item) => item.id === selectedId,
                  );
                  if (template) {
                    template.name = name;
                    template.content = content;
                    template.updatedAt = new Date().toISOString();
                  }
                } else {
                  const createdTemplate = {
                    id: generateUUID(),
                    name,
                    content,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  state.individualReportTemplates.push(createdTemplate);
                  selectedTemplateId = createdTemplate.id;
                }

                saveData();
                refreshModalTemplateOptions(selectedTemplateId);
                refreshTemplateOptions(selectedTemplateId);

                CustomSwal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "success",
                  title: "Modelo salvo com sucesso.",
                  timer: 1800,
                  showConfirmButton: false,
                });
              });

            popup
              .querySelector("#swal-btn-delete-ind-template")
              ?.addEventListener("click", () => {
                const selectedId = templateSelect?.value || "";
                if (!selectedId) {
                  CustomSwal.fire(
                    "Atenção",
                    "Selecione um modelo para excluir.",
                    "warning",
                  );
                  return;
                }

                const selectedTemplate = state.individualReportTemplates.find(
                  (item) => item.id === selectedId,
                );
                if (!selectedTemplate) return;

                const confirmed = window.confirm(
                  `Excluir o modelo \"${selectedTemplate.name || "sem nome"}\"?`,
                );
                if (!confirmed) return;

                state.individualReportTemplates =
                  state.individualReportTemplates.filter(
                    (item) => item.id !== selectedId,
                  );

                saveData();
                refreshModalTemplateOptions();
                loadTemplateEditor("");
                refreshTemplateOptions();

                CustomSwal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "success",
                  title: "Modelo excluído.",
                  timer: 1600,
                  showConfirmButton: false,
                });
              });
          },
        });
      };

      const openIndividualReportGenerationModal = async () => {
        ensureIndividualReportsState();

        const sortedTemplates = [...state.individualReportTemplates].sort(
          (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
        );
        const templateOptions = sortedTemplates
          .map(
            (template) =>
              `<option value="${template.id}">${escapeHtml(template.name)}</option>`,
          )
          .join("");

        const studentsOptions = [...state.students]
          .filter((student) => student.status !== "transferido")
          .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || "")),
          )
          .map(
            (student) =>
              `<option value="${student.id}">${escapeHtml(getStudentDisplayLabel(student))}</option>`,
          )
          .join("");

        const courseOptions = getUniqueCourses()
          .map(
            (course) =>
              `<option value="${course.id}">${escapeHtml(course.name)}</option>`,
          )
          .join("");

        const todayIso = new Date().toISOString().split("T")[0];

        await CustomSwal.fire({
          title: "Geração de Relatório Individual",
          width: 980,
          showConfirmButton: false,
          showCloseButton: true,
          html: `
            <div class="swal-modern-form">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="swal-modern-input-group">
                  <label class="swal-modern-label" for="swal-ind-gen-student">Aluno</label>
                  <select id="swal-ind-gen-student" class="swal-modern-select">
                    <option value="">-- Selecione --</option>
                    ${studentsOptions}
                  </select>
                </div>
                <div class="swal-modern-input-group">
                  <label class="swal-modern-label" for="swal-ind-gen-course">Disciplina (opcional)</label>
                  <select id="swal-ind-gen-course" class="swal-modern-select">
                    <option value="">-- Opcional --</option>
                    ${courseOptions}
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="swal-modern-input-group">
                  <label class="swal-modern-label" for="swal-ind-gen-template">Modelo</label>
                  <select id="swal-ind-gen-template" class="swal-modern-select">
                    <option value="">-- Selecione --</option>
                    ${templateOptions}
                  </select>
                </div>
                <div class="swal-modern-input-group">
                  <label class="swal-modern-label" for="swal-ind-gen-date">Data</label>
                  <input id="swal-ind-gen-date" class="swal-modern-input" type="date" value="${todayIso}" />
                </div>
              </div>

              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-gen-title">Título do relatório</label>
                <input id="swal-ind-gen-title" class="swal-modern-input" placeholder="Ex.: Relatório individual do 2º bimestre" />
              </div>

              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-gen-custom-vars">Variáveis extras (uma por linha: CHAVE=valor)</label>
                <textarea id="swal-ind-gen-custom-vars" class="swal-modern-textarea" style="min-height: 90px;" placeholder="CRITERIO=Participacao&#10;OBSERVACAO=Aluno dedicado"></textarea>
              </div>

              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-gen-output">Texto final</label>
                <textarea id="swal-ind-gen-output" class="swal-modern-textarea" style="min-height: 240px;"></textarea>
                <p id="swal-ind-gen-feedback" class="text-xs text-secondary mt-2"></p>
              </div>

              <div class="flex flex-wrap gap-2 justify-end">
                <button id="swal-btn-ind-preview" class="btn btn-subtle" type="button"><i class="fas fa-magnifying-glass mr-2"></i>Gerar prévia</button>
                <button id="swal-btn-ind-save" class="btn btn-primary" type="button"><i class="fas fa-floppy-disk mr-2"></i>Salvar no histórico</button>
              </div>
            </div>
          `,
          didOpen: () => {
            const popup = Swal.getPopup();
            if (!popup) return;

            const studentSelect = popup.querySelector("#swal-ind-gen-student");
            const courseSelectModal = popup.querySelector(
              "#swal-ind-gen-course",
            );
            const templateSelect = popup.querySelector(
              "#swal-ind-gen-template",
            );
            const dateInputModal = popup.querySelector("#swal-ind-gen-date");
            const titleInputModal = popup.querySelector("#swal-ind-gen-title");
            const customVarsInputModal = popup.querySelector(
              "#swal-ind-gen-custom-vars",
            );
            const outputInputModal = popup.querySelector(
              "#swal-ind-gen-output",
            );
            const feedbackEl = popup.querySelector("#swal-ind-gen-feedback");

            const setFeedback = (message = "", type = "info") => {
              if (!feedbackEl) return;
              feedbackEl.textContent = message;
              if (type === "success") {
                feedbackEl.style.color = "#16a34a";
              } else if (type === "warning") {
                feedbackEl.style.color = "#b45309";
              } else {
                feedbackEl.style.color = "var(--text-secondary)";
              }
            };

            const generatePreviewFromModal = () => {
              const selectedStudentId = studentSelect?.value || "";
              if (!selectedStudentId) {
                CustomSwal.fire(
                  "Atenção",
                  "Selecione um aluno para gerar a prévia.",
                  "warning",
                );
                return null;
              }

              const templateId = templateSelect?.value || "";
              const template = state.individualReportTemplates.find(
                (item) => item.id === templateId,
              );
              if (!template) {
                CustomSwal.fire(
                  "Atenção",
                  "Selecione um modelo para gerar a prévia.",
                  "warning",
                );
                return null;
              }

              const standardVariables = buildStandardStudentReportVariables({
                studentId: selectedStudentId,
                courseId: courseSelectModal?.value || "",
                reportDate: dateInputModal?.value || "",
              });
              const registeredVariables =
                getRegisteredIndividualReportVariablesMap();
              const extraVariables = parseCustomVariables(
                customVarsInputModal?.value || "",
              );
              const allVariables = {
                ...registeredVariables,
                ...standardVariables,
                ...extraVariables,
              };
              const finalText = renderTemplateWithVariables(
                template.content || "",
                allVariables,
              );

              if (outputInputModal) {
                outputInputModal.value = finalText;
              }
              setFeedback("Prévia gerada com sucesso.", "success");

              if (titleInputModal && !titleInputModal.value.trim()) {
                const student = state.students.find(
                  (item) => item.id === selectedStudentId,
                );
                titleInputModal.value = `Relatório individual - ${
                  student?.name || "Aluno"
                }`;
              }

              return {
                template,
                finalText,
                variables: allVariables,
              };
            };

            const saveReportFromModal = () => {
              const selectedStudentId = studentSelect?.value || "";
              if (!selectedStudentId) {
                CustomSwal.fire(
                  "Atenção",
                  "Selecione um aluno para salvar o relatório.",
                  "warning",
                );
                return;
              }

              const generated = generatePreviewFromModal();
              if (!generated) return;

              const reportTitle =
                titleInputModal?.value?.trim() ||
                `Relatório individual - ${
                  state.students.find(
                    (student) => student.id === selectedStudentId,
                  )?.name || "Aluno"
                }`;

              state.studentIndividualReports.push({
                id: generateUUID(),
                title: reportTitle,
                studentId: selectedStudentId,
                courseId: courseSelectModal?.value || "",
                templateId: generated.template.id,
                reportDate: dateInputModal?.value || "",
                customVariablesRaw: customVarsInputModal?.value || "",
                variablesSnapshot: generated.variables,
                content: generated.finalText,
                generatedAt: new Date().toISOString(),
              });

              saveData();
              setSelectedStudent(selectedStudentId);
              refreshHistory();
              setFeedback("Relatório salvo no histórico do aluno.", "success");
            };

            popup
              .querySelector("#swal-btn-ind-preview")
              ?.addEventListener("click", () => {
                const generated = generatePreviewFromModal();
                if (!generated) return;
              });

            popup
              .querySelector("#swal-btn-ind-save")
              ?.addEventListener("click", saveReportFromModal);
          },
        });
      };

      const openIndividualConfigAndGenerationModal = async () => {
        await CustomSwal.fire({
          title: "Configuração e Geração",
          width: 560,
          showConfirmButton: false,
          showCloseButton: true,
          html: `
            <div class="swal-modern-form">
              <p class="text-sm text-secondary">Escolha a ação desejada para o Relatório Individual.</p>
              <div class="grid grid-cols-1 gap-2">
                <button id="swal-btn-open-ind-config" type="button" class="btn btn-subtle w-full justify-start">
                  <i class="fas fa-sliders mr-2"></i>Modelos e Variáveis
                </button>
                <button id="swal-btn-open-ind-generation" type="button" class="btn btn-primary w-full justify-start">
                  <i class="fas fa-file-lines mr-2"></i>Gerar Relatório
                </button>
              </div>
            </div>
          `,
          didOpen: () => {
            const popup = Swal.getPopup();
            if (!popup) return;

            popup
              .querySelector("#swal-btn-open-ind-config")
              ?.addEventListener("click", () => {
                Swal.close();
                setTimeout(() => {
                  openTemplateManagementModal();
                }, 80);
              });

            popup
              .querySelector("#swal-btn-open-ind-generation")
              ?.addEventListener("click", () => {
                Swal.close();
                setTimeout(() => {
                  openIndividualReportGenerationModal();
                }, 80);
              });
          },
        });
      };

      const refreshHistory = () => {
        if (!historyList) return;
        const selectedStudentId = studentIdInput?.value || "";
        if (!selectedStudentId) {
          historyList.innerHTML =
            '<p class="text-secondary text-sm">Selecione um aluno para visualizar o histórico.</p>';
          return;
        }
        historyList.innerHTML =
          renderStudentReportHistoryCards(selectedStudentId);
      };

      const generatePreview = () => {
        const templateId = templateGenerateSelect?.value || "";
        const template = state.individualReportTemplates.find(
          (item) => item.id === templateId,
        );
        if (!template) {
          CustomSwal.fire(
            "Atenção",
            "Selecione um modelo para gerar a prévia.",
            "warning",
          );
          return null;
        }

        const standardVariables = buildStandardStudentReportVariables({
          studentId: studentIdInput?.value,
          courseId: courseSelect?.value,
          reportDate: dateInput?.value,
        });
        const registeredVariables = getRegisteredIndividualReportVariablesMap();
        const extraVariables = parseCustomVariables(
          customVarsInput?.value || "",
        );
        const allVariables = {
          ...registeredVariables,
          ...standardVariables,
          ...extraVariables,
        };
        const finalText = renderTemplateWithVariables(
          template.content || "",
          allVariables,
        );

        if (outputInput) {
          outputInput.value = finalText;
        }

        if (titleInput && !titleInput.value.trim()) {
          const student = state.students.find(
            (item) => item.id === (studentIdInput?.value || ""),
          );
          titleInput.value = `Relatório individual - ${student?.name || "Aluno"}`;
        }

        return {
          template,
          finalText,
          variables: allVariables,
        };
      };

      const buildCurrentReportExportEntry = () => {
        const selectedStudentId = studentIdInput?.value || "";
        if (!selectedStudentId) {
          CustomSwal.fire(
            "Atenção",
            "Selecione um aluno para exportar o relatório atual.",
            "warning",
          );
          return null;
        }

        const generated = generatePreview();
        if (!generated) return null;

        const reportTitle =
          titleInput?.value?.trim() ||
          `Relatório individual - ${
            state.students.find((student) => student.id === selectedStudentId)
              ?.name || "Aluno"
          }`;

        return {
          id: generateUUID(),
          title: reportTitle,
          studentId: selectedStudentId,
          courseId: courseSelect?.value || "",
          templateId: generated.template.id,
          reportDate: dateInput?.value || "",
          customVariablesRaw: customVarsInput?.value || "",
          variablesSnapshot: generated.variables,
          content: generated.finalText,
          generatedAt: new Date().toISOString(),
        };
      };

      const collectReportsForExport = (scope = "current", selection = {}) => {
        const selectedStudentId = selection.studentId || "";
        const selectedClassId = selection.classId || "";

        if (scope === "current") {
          const currentReport = buildCurrentReportExportEntry();
          return currentReport ? [currentReport] : null;
        }

        if (scope === "student-latest") {
          if (!selectedStudentId) {
            CustomSwal.fire(
              "Atenção",
              "Selecione um aluno no modal para gerar o relatório.",
              "warning",
            );
            return null;
          }

          const report = [...state.studentIndividualReports]
            .filter((item) => item.studentId === selectedStudentId)
            .sort(
              (a, b) =>
                new Date(b.generatedAt || 0).getTime() -
                new Date(a.generatedAt || 0).getTime(),
            )[0];

          if (!report) {
            CustomSwal.fire(
              "Atenção",
              "Esse aluno ainda não possui relatórios salvos no histórico.",
              "warning",
            );
            return null;
          }

          return [report];
        }

        if (scope === "student") {
          if (!selectedStudentId) {
            CustomSwal.fire(
              "Atenção",
              "Selecione um aluno no modal para exportar o histórico dele.",
              "warning",
            );
            return null;
          }

          const reports = state.studentIndividualReports.filter(
            (report) => report.studentId === selectedStudentId,
          );
          if (!reports.length) {
            CustomSwal.fire(
              "Atenção",
              "Esse aluno ainda não possui relatórios salvos no histórico.",
              "warning",
            );
            return null;
          }
          return reports;
        }

        if (scope === "class") {
          if (!selectedClassId) {
            CustomSwal.fire(
              "Atenção",
              "Selecione uma turma no modal para exportar os relatórios.",
              "warning",
            );
            return null;
          }

          const reports = state.studentIndividualReports.filter((report) => {
            const reportCourse = getUniqueCourses().find(
              (course) => course.id === report.courseId,
            );
            if (reportCourse?.classId) {
              return reportCourse.classId === selectedClassId;
            }
            const student = state.students.find(
              (item) => item.id === report.studentId,
            );
            return student?.classId === selectedClassId;
          });

          if (!reports.length) {
            CustomSwal.fire(
              "Atenção",
              "Não há relatórios salvos para a turma selecionada.",
              "warning",
            );
            return null;
          }
          return reports;
        }

        if (scope === "all") {
          const reports = [...state.studentIndividualReports];
          if (!reports.length) {
            CustomSwal.fire(
              "Atenção",
              "Não há relatórios salvos para exportar.",
              "warning",
            );
            return null;
          }
          return reports;
        }

        return null;
      };

      const getExportFileBaseName = (
        reports,
        scope = "current",
        selection = {},
      ) => {
        const selectedStudentId = selection.studentId || "";
        const selectedClassId = selection.classId || "";

        if (scope === "current") {
          return reports?.[0]?.title || "relatorio_individual";
        }
        if (scope === "student" || scope === "student-latest") {
          const student = state.students.find(
            (item) => item.id === selectedStudentId,
          );
          const suffix = scope === "student-latest" ? "ultimo" : "todos";
          return `relatorios_${student?.name || "aluno"}_${suffix}`;
        }
        if (scope === "class") {
          const classInfo = state.classes.find(
            (item) => item.id === selectedClassId,
          );
          return `relatorios_turma_${classInfo?.name || "turma"}`;
        }
        if (scope === "all") {
          return "relatorios_todas_as_turmas";
        }
        return "relatorios_individuais";
      };

      const openIndividualReportExportModal = async () => {
        const studentsOptions = state.students
          .filter((student) => student.status !== "transferido")
          .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || "")),
          )
          .map(
            (student) =>
              `<option value="${student.id}">${escapeHtml(student.name)}</option>`,
          )
          .join("");

        const classOptions = [...state.classes]
          .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || "")),
          )
          .map(
            (classItem) =>
              `<option value="${classItem.id}">${escapeHtml(classItem.name)}</option>`,
          )
          .join("");

        await CustomSwal.fire({
          title: "Gerar Arquivos",
          width: 680,
          showConfirmButton: false,
          showCloseButton: true,
          html: `
            <div class="swal-modern-form">
              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-class-mode">Escopo de turma</label>
                <select id="swal-ind-class-mode" class="swal-modern-select">
                  <option value="class">Turma específica</option>
                  <option value="all">Todas as turmas</option>
                </select>
              </div>
              <div id="swal-ind-class-wrap" class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-export-class">Turma</label>
                <select id="swal-ind-export-class" class="swal-modern-select">
                  <option value="">-- Selecione --</option>
                  ${classOptions}
                </select>
              </div>
              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-export-student-input">Aluno (caixa de busca)</label>
                <div class="student-picker">
                  <input id="swal-ind-export-student-input" class="swal-modern-input" placeholder="Digite para buscar aluno" autocomplete="off" />
                  <div id="swal-ind-export-student-dropdown" class="student-picker-dropdown"></div>
                  <input id="swal-ind-export-student" type="hidden" />
                </div>
                <p class="text-xs text-secondary mt-2">A lista é filtrada pela turma escolhida. Em "Todas as turmas", busca em todos os alunos.</p>
              </div>
              <div class="swal-modern-input-group">
                <label class="swal-modern-label" for="swal-ind-export-scope">Relatório a gerar</label>
                <select id="swal-ind-export-scope" class="swal-modern-select"></select>
                <p class="text-xs text-secondary mt-2">Após escolher turma/todos e aluno, selecione como deseja gerar.</p>
              </div>
              <div class="flex flex-wrap gap-2 justify-end">
                <button id="swal-btn-export-pdf" class="btn btn-subtle" type="button"><i class="fas fa-file-pdf mr-2"></i>Gerar PDF</button>
                <button id="swal-btn-export-docx" class="btn btn-primary" type="button"><i class="fas fa-file-word mr-2"></i>Gerar DOCX</button>
              </div>
            </div>
          `,
          didOpen: () => {
            const popup = Swal.getPopup();
            if (!popup) return;

            const classModeSelect = popup.querySelector("#swal-ind-class-mode");
            const classWrap = popup.querySelector("#swal-ind-class-wrap");
            const classSelect = popup.querySelector("#swal-ind-export-class");
            const studentInput = popup.querySelector(
              "#swal-ind-export-student-input",
            );
            const studentDropdown = popup.querySelector(
              "#swal-ind-export-student-dropdown",
            );
            const studentIdInput = popup.querySelector(
              "#swal-ind-export-student",
            );
            const scopeSelect = popup.querySelector("#swal-ind-export-scope");
            let modalStudentLookup = new Map();
            let modalDropdownStudents = [];

            const scopeOptionsByClassMode = {
              class: [
                { value: "student-latest", label: "Último relatório do aluno" },
                {
                  value: "student",
                  label: "Todos os relatórios do aluno",
                },
                {
                  value: "class",
                  label: "Todos os relatórios dos alunos da turma selecionada",
                },
              ],
              all: [
                { value: "student-latest", label: "Último relatório do aluno" },
                {
                  value: "student",
                  label: "Todos os relatórios do aluno",
                },
                {
                  value: "all",
                  label: "Todos os relatórios (todas as turmas)",
                },
              ],
            };

            const getModalFilteredStudents = () => {
              const classMode = classModeSelect?.value || "class";
              const selectedClassId = classSelect?.value || "";

              return state.students
                .filter((student) => student.status !== "transferido")
                .filter((student) => {
                  if (classMode === "all") return true;
                  if (!selectedClassId) return false;
                  return student.classId === selectedClassId;
                })
                .sort((a, b) =>
                  String(a.name || "").localeCompare(String(b.name || "")),
                );
            };

            const getModalStudentDisplayLabel = (student) => {
              const classInfo = state.classes.find(
                (cls) => cls.id === student.classId,
              );
              const className = classInfo?.name || "Sem turma";
              return `${student.name} (${className})`;
            };

            const setModalSelectedStudent = (studentId = "") => {
              if (!studentInput || !studentIdInput) return;
              const student = state.students.find(
                (item) => item.id === studentId,
              );
              if (!student) {
                studentIdInput.value = "";
                studentInput.value = "";
                return;
              }
              studentIdInput.value = student.id;
              studentInput.value = getModalStudentDisplayLabel(student);
            };

            const hideModalStudentDropdown = () => {
              studentDropdown?.classList.remove("visible");
            };

            const renderModalStudentDropdown = ({
              query = "",
              forceVisible = false,
            } = {}) => {
              if (!studentDropdown) return;
              const normalizedQuery = String(query || "")
                .trim()
                .toLowerCase();
              const students = getModalFilteredStudents();
              modalDropdownStudents = students.filter((student) => {
                if (!normalizedQuery) return true;
                const label =
                  getModalStudentDisplayLabel(student).toLowerCase();
                const name = String(student.name || "").toLowerCase();
                return (
                  label.includes(normalizedQuery) ||
                  name.includes(normalizedQuery)
                );
              });

              if (!modalDropdownStudents.length) {
                studentDropdown.innerHTML =
                  '<div class="student-picker-empty">Nenhum aluno encontrado para o filtro atual.</div>';
              } else {
                studentDropdown.innerHTML = modalDropdownStudents
                  .map(
                    (student) =>
                      `<button type="button" class="student-picker-option" data-student-id="${student.id}">${escapeHtml(getModalStudentDisplayLabel(student))}</button>`,
                  )
                  .join("");
              }

              const shouldShow =
                forceVisible ||
                document.activeElement === studentInput ||
                normalizedQuery;
              studentDropdown.classList.toggle("visible", Boolean(shouldShow));
            };

            const refreshModalStudentLookup = () => {
              const students = getModalFilteredStudents();
              modalStudentLookup = new Map();
              const normalizedNameCount = new Map();

              students.forEach((student) => {
                const key = String(student?.name || "")
                  .trim()
                  .toLowerCase();
                if (!key) return;
                normalizedNameCount.set(
                  key,
                  (normalizedNameCount.get(key) || 0) + 1,
                );
              });

              students.forEach((student) => {
                const displayLabel = getModalStudentDisplayLabel(student);
                const normalizedLabel = displayLabel.trim().toLowerCase();
                modalStudentLookup.set(normalizedLabel, student.id);

                const normalizedName = String(student.name || "")
                  .trim()
                  .toLowerCase();
                if (normalizedNameCount.get(normalizedName) === 1) {
                  modalStudentLookup.set(normalizedName, student.id);
                }
              });

              renderModalStudentDropdown({ query: studentInput?.value || "" });

              const selectedStudentId = studentIdInput?.value || "";
              const stillAvailable = students.some(
                (student) => student.id === selectedStudentId,
              );
              if (!stillAvailable) {
                if (studentIdInput) studentIdInput.value = "";
                if (studentInput) studentInput.value = "";
              } else {
                setModalSelectedStudent(selectedStudentId);
              }
            };

            const syncModalStudentFromInput = () => {
              const typed = String(studentInput?.value || "").trim();
              if (!typed) {
                if (studentIdInput) studentIdInput.value = "";
                return;
              }

              const normalizedTyped = typed.toLowerCase();
              const directId = modalStudentLookup.get(normalizedTyped);
              if (directId) {
                setModalSelectedStudent(directId);
                return;
              }

              const students = getModalFilteredStudents();
              const partialMatches = students.filter((student) =>
                String(student.name || "")
                  .toLowerCase()
                  .includes(normalizedTyped),
              );

              if (partialMatches.length === 1) {
                setModalSelectedStudent(partialMatches[0].id);
                return;
              }

              if (studentIdInput) studentIdInput.value = "";
            };

            const refreshScopeOptions = () => {
              const classMode = classModeSelect?.value || "class";
              const options = scopeOptionsByClassMode[classMode] || [];

              if (classWrap) {
                classWrap.style.display =
                  classMode === "class" ? "flex" : "none";
              }

              if (!scopeSelect) return;
              scopeSelect.innerHTML = options
                .map(
                  (option) =>
                    `<option value="${option.value}">${escapeHtml(option.label)}</option>`,
                )
                .join("");
            };

            refreshScopeOptions();
            refreshModalStudentLookup();

            classModeSelect?.addEventListener("change", () => {
              refreshScopeOptions();
              refreshModalStudentLookup();
            });

            classSelect?.addEventListener("change", () => {
              refreshModalStudentLookup();
            });

            studentInput?.addEventListener("input", () => {
              syncModalStudentFromInput();
              renderModalStudentDropdown({
                query: studentInput?.value || "",
                forceVisible: true,
              });
            });

            studentInput?.addEventListener("change", syncModalStudentFromInput);

            studentInput?.addEventListener("focus", () => {
              renderModalStudentDropdown({
                query: studentInput?.value || "",
                forceVisible: true,
              });
            });

            studentInput?.addEventListener("keydown", (e) => {
              if (e.key !== "Enter") return;
              if (!modalDropdownStudents.length) return;
              e.preventDefault();
              setModalSelectedStudent(modalDropdownStudents[0].id);
              hideModalStudentDropdown();
            });

            studentDropdown?.addEventListener("click", (e) => {
              const option = e.target.closest(".student-picker-option");
              if (!option) return;
              const selectedId = option.dataset.studentId || "";
              if (!selectedId) return;
              setModalSelectedStudent(selectedId);
              hideModalStudentDropdown();
            });

            const modalStudentPicker = popup.querySelector(".student-picker");
            modalStudentPicker?.addEventListener("focusout", () => {
              setTimeout(() => {
                if (!modalStudentPicker.contains(document.activeElement)) {
                  hideModalStudentDropdown();
                }
              }, 120);
            });

            popup
              .querySelector("#swal-btn-export-pdf")
              ?.addEventListener("click", () => {
                const scope = scopeSelect?.value || "current";
                const reports = collectReportsForExport(scope, {
                  studentId: studentIdInput?.value || "",
                  classId: classSelect?.value || "",
                });
                if (!reports) return;
                exportIndividualReportsPdf(
                  reports,
                  getExportFileBaseName(reports, scope, {
                    studentId: studentIdInput?.value || "",
                    classId: classSelect?.value || "",
                  }),
                );
              });

            popup
              .querySelector("#swal-btn-export-docx")
              ?.addEventListener("click", async () => {
                const scope = scopeSelect?.value || "current";
                const reports = collectReportsForExport(scope, {
                  studentId: studentIdInput?.value || "",
                  classId: classSelect?.value || "",
                });
                if (!reports) return;
                await exportIndividualReportsDocx(
                  reports,
                  getExportFileBaseName(reports, scope, {
                    studentId: studentIdInput?.value || "",
                    classId: classSelect?.value || "",
                  }),
                );
              });
          },
        });
      };

      refreshTemplateOptions();
      refreshStudentAutocomplete();
      refreshHistory();

      mainContent
        .querySelector("#btn-manage-ind-templates")
        ?.addEventListener("click", openTemplateManagementModal);

      mainContent
        .querySelector("#btn-open-ind-config-gen-modal")
        ?.addEventListener("click", openIndividualConfigAndGenerationModal);

      studentInput?.addEventListener("input", () => {
        syncSelectedStudentFromInput();
        refreshHistory();
        renderStudentDropdown({
          query: studentInput?.value || "",
          forceVisible: true,
        });
      });

      studentInput?.addEventListener("change", () => {
        syncSelectedStudentFromInput();
        refreshHistory();
      });

      studentInput?.addEventListener("focus", () => {
        renderStudentDropdown({
          query: studentInput?.value || "",
          forceVisible: true,
        });
      });

      studentInput?.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        if (!dropdownStudents.length) return;
        e.preventDefault();
        setSelectedStudent(dropdownStudents[0].id);
        refreshHistory();
        hideStudentDropdown();
      });

      studentDropdown?.addEventListener("click", (e) => {
        const option = e.target.closest(".student-picker-option");
        if (!option) return;
        const selectedId = option.dataset.studentId || "";
        if (!selectedId) return;
        setSelectedStudent(selectedId);
        refreshHistory();
        hideStudentDropdown();
      });

      studentPicker?.addEventListener("focusout", () => {
        setTimeout(() => {
          if (!studentPicker.contains(document.activeElement)) {
            hideStudentDropdown();
          }
        }, 120);
      });

      courseSelect?.addEventListener("change", () => {
        refreshStudentAutocomplete();
        syncSelectedStudentFromInput();
        refreshHistory();
        renderStudentDropdown({
          query: studentInput?.value || "",
          forceVisible: document.activeElement === studentInput,
        });
      });

      mainContent
        .querySelector("#btn-preview-ind-report")
        ?.addEventListener("click", () => {
          const generated = generatePreview();
          if (!generated) return;
          CustomSwal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Prévia gerada.",
            timer: 1400,
            showConfirmButton: false,
          });
        });

      mainContent
        .querySelector("#btn-save-ind-report")
        ?.addEventListener("click", () => {
          const selectedStudentId = studentIdInput?.value || "";
          if (!selectedStudentId) {
            CustomSwal.fire(
              "Atenção",
              "Selecione um aluno para salvar o relatório.",
              "warning",
            );
            return;
          }

          const generated = generatePreview();
          if (!generated) return;

          const reportTitle =
            titleInput?.value?.trim() ||
            `Relatório individual - ${
              state.students.find((student) => student.id === selectedStudentId)
                ?.name || "Aluno"
            }`;

          state.studentIndividualReports.push({
            id: generateUUID(),
            title: reportTitle,
            studentId: selectedStudentId,
            courseId: courseSelect?.value || "",
            templateId: generated.template.id,
            reportDate: dateInput?.value || "",
            customVariablesRaw: customVarsInput?.value || "",
            variablesSnapshot: generated.variables,
            content: generated.finalText,
            generatedAt: new Date().toISOString(),
          });

          saveData();
          setSelectedStudent(selectedStudentId);
          refreshHistory();

          CustomSwal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Relatório salvo no histórico do aluno.",
            timer: 1800,
            showConfirmButton: false,
          });
        });

      historyList?.addEventListener("click", async (e) => {
        const exportPdfButton = e.target.closest(
          ".btn-export-single-report-pdf",
        );
        if (exportPdfButton) {
          const report = state.studentIndividualReports.find(
            (item) => item.id === exportPdfButton.dataset.id,
          );
          if (!report) return;
          exportIndividualReportsPdf(
            [report],
            report.title || "relatorio_individual",
          );
          return;
        }

        const exportDocxButton = e.target.closest(
          ".btn-export-single-report-docx",
        );
        if (exportDocxButton) {
          const report = state.studentIndividualReports.find(
            (item) => item.id === exportDocxButton.dataset.id,
          );
          if (!report) return;
          await exportIndividualReportsDocx(
            [report],
            report.title || "relatorio_individual",
          );
          return;
        }

        const viewButton = e.target.closest(".btn-view-student-report");
        if (viewButton) {
          const report = state.studentIndividualReports.find(
            (item) => item.id === viewButton.dataset.id,
          );
          if (!report) return;

          const student = state.students.find(
            (item) => item.id === report.studentId,
          );
          const course = getUniqueCourses().find(
            (item) => item.id === report.courseId,
          );

          CustomSwal.fire({
            title: escapeHtml(report.title || "Relatório individual"),
            width: 900,
            showCloseButton: true,
            showConfirmButton: false,
            html: `
              <div class="swal-modern-form text-left">
                <div class="text-xs text-secondary">
                  <p><b>Aluno:</b> ${escapeHtml(student?.name || "Aluno não encontrado")}</p>
                  <p><b>Disciplina:</b> ${escapeHtml(course?.name || "Não informada")}</p>
                  <p><b>Data do relatório:</b> ${escapeHtml(report.reportDate || "-")}</p>
                  <p><b>Gerado em:</b> ${escapeHtml(formatStudentReportDateTime(report.generatedAt))}</p>
                </div>
                <textarea class="swal-modern-textarea" style="min-height:320px;">${escapeHtml(report.content || "")}</textarea>
              </div>
            `,
          });
          return;
        }

        const deleteButton = e.target.closest(".btn-delete-student-report");
        if (!deleteButton) return;

        const reportId = deleteButton.dataset.id;
        const report = state.studentIndividualReports.find(
          (item) => item.id === reportId,
        );
        if (!report) return;

        const result = await CustomSwal.fire({
          title: "Excluir relatório do histórico?",
          html: `Esta ação removerá o relatório <b>${escapeHtml(report.title || "sem título")}</b>.`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Excluir",
          cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;

        state.studentIndividualReports = state.studentIndividualReports.filter(
          (item) => item.id !== reportId,
        );
        saveData();
        refreshHistory();
      });
    }

    // --- 1. DASHBOARD ---
    if (pageId === "dashboard") {
      const carousel = mainContent.querySelector(".week-carousel");
      const prevBtn = mainContent.querySelector("#carousel-prev");
      const nextBtn = mainContent.querySelector("#carousel-next");

      if (carousel && prevBtn && nextBtn) {
        const SCROLL_AMOUNT = 300;

        const updateCarouselButtons = () => {
          const hasOverflow = carousel.scrollWidth > carousel.clientWidth;

          if (hasOverflow) {
            prevBtn.style.display = "block";
            nextBtn.style.display = "block";
            prevBtn.disabled = carousel.scrollLeft < 10;
            nextBtn.disabled =
              carousel.scrollLeft + carousel.clientWidth >=
              carousel.scrollWidth - 10;
          } else {
            prevBtn.style.display = "none";
            nextBtn.style.display = "none";
          }
        };

        prevBtn.addEventListener("click", () => {
          carousel.scrollBy({
            left: -SCROLL_AMOUNT,
            behavior: "smooth",
          });
        });

        nextBtn.addEventListener("click", () => {
          carousel.scrollBy({
            left: SCROLL_AMOUNT,
            behavior: "smooth",
          });
        });

        carousel.addEventListener("scroll", updateCarouselButtons);

        const resizeObserver = new ResizeObserver(updateCarouselButtons);
        resizeObserver.observe(carousel);

        const scrollToToday = () => {
          const todayStr = new Date().toISOString().split("T")[0];
          const allCards = carousel.querySelectorAll(
            ".week-event-card[data-date]",
          );
          let targetCard = null;

          for (const card of allCards) {
            if (card.dataset.date >= todayStr) {
              targetCard = card;
              break;
            }
          }

          if (targetCard) {
            carousel.scrollLeft = targetCard.offsetLeft;
          }
        };

        setTimeout(() => {
          scrollToToday();
          updateCarouselButtons();
        }, 100);
      }

      mainContent
        .querySelector("#btn-prev-month")
        ?.addEventListener("click", (e) => {
          renderPage("dashboard", {
            date: e.currentTarget.dataset.date,
          });
        });
      mainContent.querySelector("#btn-today")?.addEventListener("click", () => {
        renderPage("dashboard");
      });
      mainContent
        .querySelector("#btn-next-month")
        ?.addEventListener("click", (e) => {
          renderPage("dashboard", {
            date: e.currentTarget.dataset.date,
          });
        });

      mainContent.addEventListener("click", (e) => {
        const eventElement = e.target.closest(".calendar-event");
        if (eventElement && eventElement.dataset.event) {
          try {
            const eventData = JSON.parse(eventElement.dataset.event);
            openEventDetailsModal(eventData);
          } catch (error) {
            console.error("Erro ao processar dados do evento:", error);
          }
        }
      });
    }

    // --- 2. RELEASES (LAN�!AMENTOS) ---
    if (pageId === "releases") {
      mainContent
        .querySelector("#releases-prev-week")
        ?.addEventListener("click", (e) => {
          renderPage("releases", {
            currentDate: e.currentTarget.dataset.date,
          });
        });
      mainContent
        .querySelector("#releases-today")
        ?.addEventListener("click", () => {
          renderPage("releases", {
            currentDate: new Date().toISOString().split("T")[0],
          });
        });
      mainContent
        .querySelector("#releases-next-week")
        ?.addEventListener("click", (e) => {
          renderPage("releases", {
            currentDate: e.currentTarget.dataset.date,
          });
        });
      mainContent.querySelectorAll(".btn-go-to-diary").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const courseId = e.currentTarget.dataset.courseId;
          if (courseId) {
            renderPage("diary", {
              preselectedCourseId: courseId,
            });
          }
        });
      });
    }

    // --- 3. ORGANIZATION (ORGANIZA�!ÒO) ---
    if (pageId === "organization") {
      const container = mainContent.querySelector(
        "#organization-page-container",
      );
      const tabsContainer = container.querySelector("#organization-tabs");
      const tabContentContainer = container.querySelector(
        "#organization-tab-content",
      );

      const loadTab = (tabId, tabParams) => {
        tabsContainer
          .querySelector(".page-tab.active")
          ?.classList.remove("active");
        const newActiveTab = tabsContainer.querySelector(
          `[data-tab="${tabId}"]`,
        );
        newActiveTab?.classList.add("active");

        if (tabId === "tasks") {
          tabContentContainer.innerHTML = renderTasksPage(tabParams);
          attachPageEventListeners("tasks", tabParams);
        } else if (tabId === "notes") {
          tabContentContainer.innerHTML = renderNotesPage(true);
          attachPageEventListeners("notes", {});
        }
      };

      tabsContainer.addEventListener("click", (e) => {
        const tabButton = e.target.closest(".page-tab");
        if (tabButton) {
          loadTab(tabButton.dataset.tab, {});
        }
      });

      loadTab(params.tab || "tasks", params);
    }

    if (pageId === "planning") {
      const planningSelect = mainContent.querySelector(
        "#planning-template-select",
      );
      const termSelect = null;
      const currentAttachmentPanelKey = params.openAttachmentPanelKey || "";
      const getSelectedCourse = () => null;
      const getPlanningFilterValue = () =>
        planningSelect?.value || params.planningId || "all";
      const getOpenPlanningState = () => {
        const openPlanningIds = Array.from(
          mainContent.querySelectorAll(
            ".planning-item-draggable[data-planning-id][open]",
          ),
        )
          .map((item) => item.dataset.planningId)
          .filter(Boolean);

        const openThemeKeys = Array.from(
          mainContent.querySelectorAll(
            ".planning-accordion-item[data-planning-id][data-theme-index][open]",
          ),
        )
          .map(
            (item) => `${item.dataset.planningId}::${item.dataset.themeIndex}`,
          )
          .filter(Boolean);

        const openAttachmentPanelKeys = Array.from(
          mainContent.querySelectorAll(
            ".planning-subtopic[data-subtopic-id] .planning-attachments-panel.open",
          ),
        )
          .map(
            (panel) => panel.closest(".planning-subtopic")?.dataset.subtopicId,
          )
          .filter(Boolean);

        return {
          openPlanningIds,
          openThemeKeys,
          openAttachmentPanelKeys,
        };
      };

      const rerenderPlanning = (extraParams = {}, preserveOpenState = true) => {
        const openState = preserveOpenState ? getOpenPlanningState() : {};
        renderPage("planning", {
          planningId: getPlanningFilterValue(),
          ...openState,
          ...extraParams,
        });
      };

      planningSelect?.addEventListener("change", (e) => {
        rerenderPlanning(
          {
            planningId: e.target.value || "all",
          },
          false,
        );
      });

      mainContent
        .querySelector("#btn-add-planning")
        ?.addEventListener("click", async () => {
          const created = await openPlanningCreateModal();
          if (created) {
            rerenderPlanning(
              {
                planningId: "all",
              },
              false,
            );
          }
        });

      mainContent
        .querySelector("#btn-print-planning")
        ?.addEventListener("click", async () => {
          await openPlanningPrintModal("", "", "");
        });

      mainContent
        .querySelector("#btn-export-planning-json")
        ?.addEventListener("click", async () => {
          const exported = await exportPlanningTemplatesJson();
          if (exported) {
            CustomSwal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "Planejamento exportado em JSON.",
              showConfirmButton: false,
              timer: 1800,
            });
          }
        });

      mainContent
        .querySelector("#btn-import-planning-json")
        ?.addEventListener("click", () => {
          mainContent.querySelector("#planning-json-import-input")?.click();
        });

      mainContent
        .querySelector("#planning-json-import-input")
        ?.addEventListener("change", async (e) => {
          const file = e.target?.files?.[0];
          if (!file) return;

          const parsedPayload = await parsePlanningTemplatesImportFile(file);

          if (e.target) e.target.value = "";
          if (!parsedPayload) return;

          const importResult = importPlanningTemplatesPayload({
            importedTemplates: parsedPayload.importedTemplates,
          });

          const totalImported = importResult.imported;
          const totalSkipped = importResult.skipped;

          if (totalImported > 0) {
            saveData();
          }

          if (totalImported > 0) {
            CustomSwal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title:
                totalSkipped > 0
                  ? `${totalImported} tema(s) importado(s). ${totalSkipped} item(ns) ignorado(s).`
                  : `${totalImported} tema(s) importado(s) com sucesso.`,
              showConfirmButton: false,
              timer: 2600,
            });
            rerenderPlanning();
          } else if (totalSkipped > 0) {
            CustomSwal.fire(
              "Atenção",
              "Nenhum tema pôde ser importado. Verifique se o arquivo está compatível com as turmas/disciplinas cadastradas.",
              "warning",
            );
          }
        });

      mainContent
        .querySelector("#btn-edit-vinculos")
        ?.addEventListener("click", async () => {
          const changed = await openEditVinculosModal();
          if (changed) {
            CustomSwal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "Vínculos atualizados com sucesso.",
              showConfirmButton: false,
              timer: 1800,
            });
            rerenderPlanning();
          }
        });

      const getPlanningAndTheme = (planningId, themeIndex) => {
        const planning = findPlanningRecordById(planningId);
        const themes = getPlanningThemes(planning);
        const theme = themes[Number(themeIndex)];
        return { planning, themes, theme };
      };

      mainContent
        .querySelectorAll(".btn-add-planning-theme")
        .forEach((button) => {
          button.addEventListener("click", async (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const planning = findPlanningRecordById(planningId);
            if (!planning) return;

            const result = await CustomSwal.fire({
              title: "Novo Tema",
              html: `
                <div class="swal-modern-form text-left">
                  <div class="swal-modern-input-group">
                    <label for="planning-new-theme-input" class="swal-modern-label">Tema</label>
                    <input id="planning-new-theme-input" class="swal-modern-input" type="text" placeholder="Ex: Geometria plana" />
                  </div>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: "Salvar",
              cancelButtonText: "Cancelar",
              preConfirm: () => {
                const title = document
                  .getElementById("planning-new-theme-input")
                  ?.value.trim();
                const normalizedTitle = normalizePlanningLabelInput(
                  title,
                  "tema",
                );
                if (!normalizedTitle) {
                  Swal.showValidationMessage("Informe um título para o tema.");
                  return false;
                }
                return { title: normalizedTitle };
              },
            });

            if (!result.isConfirmed || !result.value) return;

            planning.themes = Array.isArray(planning.themes)
              ? planning.themes
              : [];
            planning.themes.push({
              title: result.value.title,
              lessons: [],
            });
            planning.updatedAt = new Date().toISOString();
            saveData();
            rerenderPlanning({ openPlanningId: planningId });
          });
        });

      mainContent
        .querySelectorAll(".btn-edit-planning-theme")
        .forEach((button) => {
          button.addEventListener("click", async (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const { planning, theme } = getPlanningAndTheme(
              planningId,
              themeIndex,
            );
            if (!planning || !theme) return;

            const edited = await openPlanningThemeEditModal(theme);
            if (!edited) return;

            planning.updatedAt = new Date().toISOString();
            saveData();
            rerenderPlanning({ openPlanningId: planningId });
          });
        });

      mainContent
        .querySelectorAll(".btn-delete-planning-theme")
        .forEach((button) => {
          button.addEventListener("click", (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const planning = findPlanningRecordById(planningId);
            const themes = getPlanningThemes(planning);
            if (!planning || !themes[themeIndex]) return;

            CustomSwal.fire({
              title: "Excluir tema?",
              text: "Esta ação não poderá ser desfeita.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Excluir",
              cancelButtonText: "Cancelar",
              reverseButtons: true,
            }).then((result) => {
              if (!result.isConfirmed) return;
              planning.themes = themes.filter(
                (_, index) => index !== themeIndex,
              );
              planning.updatedAt = new Date().toISOString();
              saveData();
              rerenderPlanning({ openPlanningId: planningId });
            });
          });
        });

      const addLessonToTheme = (planningId, themeIndex, lessonTitle) => {
        const { planning, theme } = getPlanningAndTheme(planningId, themeIndex);
        if (!planning || !theme) return false;

        const normalizedTitle = normalizePlanningLabelInput(
          lessonTitle,
          "aula",
        );
        if (!normalizedTitle) return false;

        theme.lessons = Array.isArray(theme.lessons) ? theme.lessons : [];
        theme.lessons.push({
          title: normalizedTitle,
          attachments: [],
          completed: false,
        });
        planning.updatedAt = new Date().toISOString();
        saveData();
        rerenderPlanning({ openPlanningId: planningId });
        return true;
      };

      mainContent
        .querySelectorAll(".btn-add-planning-lesson-inline")
        .forEach((button) => {
          button.addEventListener("click", (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const input = mainContent.querySelector(
              `.planning-new-lesson-input[data-planning-id="${planningId}"][data-theme-index="${themeIndex}"]`,
            );
            if (!input) return;

            const created = addLessonToTheme(
              planningId,
              themeIndex,
              input.value,
            );
            if (!created) {
              input.focus();
            }
          });
        });

      mainContent
        .querySelectorAll(".planning-new-lesson-input")
        .forEach((input) => {
          input.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();

            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const created = addLessonToTheme(
              planningId,
              themeIndex,
              e.currentTarget.value,
            );
            if (!created) {
              e.currentTarget.focus();
            }
          });
        });

      mainContent
        .querySelectorAll(".btn-edit-planning-lesson")
        .forEach((button) => {
          button.addEventListener("click", async (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const lessonIndex = Number(e.currentTarget.dataset.lessonIndex);
            const { planning, theme } = getPlanningAndTheme(
              planningId,
              themeIndex,
            );
            const lesson = theme ? getThemeLessons(theme)[lessonIndex] : null;
            if (!planning || !theme || !lesson) return;

            const edited = await openPlanningLessonEditModal(lesson);
            if (!edited) return;

            planning.updatedAt = new Date().toISOString();
            saveData();
            rerenderPlanning({ openPlanningId: planningId });
          });
        });

      mainContent
        .querySelectorAll(".btn-delete-planning-lesson")
        .forEach((button) => {
          button.addEventListener("click", (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const lessonIndex = Number(e.currentTarget.dataset.lessonIndex);
            const planning = findPlanningRecordById(planningId);
            const theme = getPlanningThemes(planning)[themeIndex];
            if (!planning || !theme) return;
            const lessons = getThemeLessons(theme);
            if (!lessons[lessonIndex]) return;

            CustomSwal.fire({
              title: "Excluir aula?",
              text: "Esta ação não poderá ser desfeita.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Excluir",
              cancelButtonText: "Cancelar",
              reverseButtons: true,
            }).then((result) => {
              if (!result.isConfirmed) return;
              theme.lessons = lessons.filter(
                (_, index) => index !== lessonIndex,
              );
              planning.updatedAt = new Date().toISOString();
              saveData();
              rerenderPlanning({ openPlanningId: planningId });
            });
          });
        });

      const addAttachmentToLesson = (
        planningId,
        themeIndex,
        lessonIndex,
        value,
      ) => {
        const { planning, theme } = getPlanningAndTheme(planningId, themeIndex);
        const lesson = theme ? getThemeLessons(theme)[lessonIndex] : null;
        if (!planning || !theme || !lesson) return false;

        const attachment = String(value || "").trim();
        if (!attachment) return false;

        lesson.attachments = Array.isArray(lesson.attachments)
          ? lesson.attachments
          : [];
        lesson.attachments.push(attachment);
        planning.updatedAt = new Date().toISOString();
        saveData();
        rerenderPlanning({ openPlanningId: planningId });
        return true;
      };

      mainContent
        .querySelectorAll(".btn-add-attachment-inline")
        .forEach((button) => {
          button.addEventListener("click", (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const lessonIndex = Number(e.currentTarget.dataset.lessonIndex);
            const input = mainContent.querySelector(
              `.planning-new-attachment-input[data-planning-id="${planningId}"][data-theme-index="${themeIndex}"][data-lesson-index="${lessonIndex}"]`,
            );
            if (!input) return;

            const created = addAttachmentToLesson(
              planningId,
              themeIndex,
              lessonIndex,
              input.value,
            );
            if (!created) {
              input.focus();
            }
          });
        });

      mainContent
        .querySelectorAll(".planning-new-attachment-input")
        .forEach((input) => {
          input.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();

            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const lessonIndex = Number(e.currentTarget.dataset.lessonIndex);
            const created = addAttachmentToLesson(
              planningId,
              themeIndex,
              lessonIndex,
              e.currentTarget.value,
            );
            if (!created) {
              e.currentTarget.focus();
            }
          });
        });

      mainContent
        .querySelectorAll(".planning-subtopic-title-btn")
        .forEach((button) => {
          button.addEventListener("click", (e) => {
            const subtopicItem = e.currentTarget.closest(".planning-subtopic");
            if (!subtopicItem) return;

            const panel = subtopicItem.querySelector(
              ".planning-attachments-panel",
            );
            if (!panel) return;

            panel.classList.toggle("open");
          });
        });

      mainContent.querySelectorAll(".btn-edit-attachment").forEach((button) => {
        button.addEventListener("click", async (e) => {
          const planningId = e.currentTarget.dataset.planningId;
          const themeIndex = Number(e.currentTarget.dataset.themeIndex);
          const lessonIndex = Number(e.currentTarget.dataset.lessonIndex);
          const index = Number(e.currentTarget.dataset.index);
          const { planning, theme } = getPlanningAndTheme(
            planningId,
            themeIndex,
          );
          const lesson = theme ? getThemeLessons(theme)[lessonIndex] : null;
          if (!planning || !theme || !lesson) return;

          const currentItems = normalizeAttachments(
            lesson.attachments || lesson.subsubtopics || [],
          );
          if (!Number.isFinite(index) || !currentItems[index]) return;

          const result = await CustomSwal.fire({
            title: "Editar anexo",
            input: "text",
            inputValue: currentItems[index],
            inputPlaceholder: "Nome do anexo",
            showCancelButton: true,
            confirmButtonText: "Salvar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
              if (!String(value || "").trim()) {
                return "Informe o nome do anexo.";
              }
              return undefined;
            },
          });

          if (!result.isConfirmed) return;

          currentItems[index] = String(result.value || "").trim();
          lesson.attachments = currentItems;
          planning.updatedAt = new Date().toISOString();
          saveData();
          rerenderPlanning({ openPlanningId: planningId });
        });
      });

      mainContent
        .querySelectorAll(".btn-delete-attachment")
        .forEach((button) => {
          button.addEventListener("click", async (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const lessonIndex = Number(e.currentTarget.dataset.lessonIndex);
            const index = Number(e.currentTarget.dataset.index);
            const planning = findPlanningRecordById(planningId);
            const theme = getPlanningThemes(planning)[themeIndex];
            const lesson = theme ? getThemeLessons(theme)[lessonIndex] : null;
            if (
              !planning ||
              !theme ||
              !lesson ||
              !Array.isArray(lesson.attachments)
            )
              return;
            if (!Number.isFinite(index)) return;

            const confirmed = await CustomSwal.fire({
              title: "Excluir anexo?",
              text: "Esta ação não pode ser desfeita.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Excluir",
              cancelButtonText: "Cancelar",
            });
            if (!confirmed.isConfirmed) return;

            lesson.attachments.splice(index, 1);
            planning.updatedAt = new Date().toISOString();
            saveData();
            rerenderPlanning({ openPlanningId: planningId });
          });
        });

      mainContent
        .querySelectorAll(".btn-edit-planning-theme")
        .forEach((button) => {
          button.addEventListener("click", async (e) => {
            const planningId = e.currentTarget.dataset.planningId;
            const themeIndex = Number(e.currentTarget.dataset.themeIndex);
            const planning = findPlanningRecordById(planningId);
            const theme = getPlanningThemes(planning)[themeIndex];
            if (!planning || !theme) return;

            const edited = await openPlanningThemeEditModal(theme);
            if (!edited) return;

            planning.updatedAt = new Date().toISOString();
            saveData();
            rerenderPlanning({ openPlanningId: planningId });
          });
        });

      const draggableSubtopics = mainContent.querySelectorAll(
        ".planning-subtopic-draggable",
      );
      let draggedPlanningId = null;
      let draggedThemeIndex = null;
      let draggedLessonIndex = null;

      const clearDropTargets = () => {
        mainContent
          .querySelectorAll(".planning-subtopic-draggable")
          .forEach((item) => item.classList.remove("drop-target"));
      };

      draggableSubtopics.forEach((item) => {
        item.addEventListener("dragstart", (e) => {
          e.stopPropagation();
          draggedPlanningId = e.currentTarget.dataset.planningId;
          draggedThemeIndex = e.currentTarget.dataset.themeIndex;
          draggedLessonIndex = e.currentTarget.dataset.lessonIndex;
          e.currentTarget.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
        });

        item.addEventListener("dragover", (e) => {
          if (!draggedPlanningId || draggedThemeIndex === null) return;
          if (e.currentTarget.dataset.planningId !== draggedPlanningId) return;
          if (e.currentTarget.dataset.themeIndex !== draggedThemeIndex) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          clearDropTargets();
          e.currentTarget.classList.add("drop-target");
        });

        item.addEventListener("dragleave", (e) => {
          e.currentTarget.classList.remove("drop-target");
        });

        item.addEventListener("drop", (e) => {
          e.preventDefault();
          const targetPlanningId = e.currentTarget.dataset.planningId;
          const targetThemeIndex = e.currentTarget.dataset.themeIndex;
          const targetLessonIndex = e.currentTarget.dataset.lessonIndex;

          if (
            !draggedPlanningId ||
            draggedThemeIndex === null ||
            draggedPlanningId !== targetPlanningId ||
            draggedThemeIndex !== targetThemeIndex ||
            draggedLessonIndex === targetLessonIndex
          ) {
            clearDropTargets();
            return;
          }

          const { planning, theme } = getPlanningAndTheme(
            draggedPlanningId,
            draggedThemeIndex,
          );
          const lessons = theme ? getThemeLessons(theme) : null;
          if (!planning || !theme || !Array.isArray(lessons)) {
            clearDropTargets();
            return;
          }

          const fromIndex = Number(draggedLessonIndex);
          const toIndex = Number(targetLessonIndex);

          if (
            !Number.isFinite(fromIndex) ||
            !Number.isFinite(toIndex) ||
            !lessons[fromIndex] ||
            !lessons[toIndex]
          ) {
            clearDropTargets();
            return;
          }

          const [movedLesson] = lessons.splice(fromIndex, 1);
          lessons.splice(toIndex, 0, movedLesson);
          theme.lessons = lessons;
          planning.updatedAt = new Date().toISOString();

          saveData();
          clearDropTargets();
          rerenderPlanning({ openPlanningId: draggedPlanningId });
        });

        item.addEventListener("dragend", (e) => {
          e.currentTarget.classList.remove("dragging");
          clearDropTargets();
          draggedPlanningId = null;
          draggedThemeIndex = null;
          draggedLessonIndex = null;
        });
      });

      const draggablePlannings = mainContent.querySelectorAll(
        ".planning-item-draggable",
      );
      let draggedPlanningCardId = null;

      const clearPlanningDropTargets = () => {
        mainContent
          .querySelectorAll(".planning-item-draggable")
          .forEach((item) => item.classList.remove("drop-target"));
      };

      draggablePlannings.forEach((item) => {
        item.addEventListener("dragstart", (e) => {
          const isSubtopicDrag = e.target.closest(
            ".planning-subtopic-draggable",
          );
          if (isSubtopicDrag) {
            e.preventDefault();
            return;
          }

          draggedPlanningCardId = e.currentTarget.dataset.planningId;
          e.currentTarget.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
        });

        item.addEventListener("dragover", (e) => {
          if (!draggedPlanningCardId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          clearPlanningDropTargets();
          e.currentTarget.classList.add("drop-target");
        });

        item.addEventListener("dragleave", (e) => {
          e.currentTarget.classList.remove("drop-target");
        });

        item.addEventListener("drop", (e) => {
          e.preventDefault();
          const targetPlanningCardId = e.currentTarget.dataset.planningId;
          if (
            !draggedPlanningCardId ||
            !targetPlanningCardId ||
            draggedPlanningCardId === targetPlanningCardId
          ) {
            clearPlanningDropTargets();
            return;
          }

          const sortedGroup = getPlanningTemplates();
          const fromIndex = sortedGroup.findIndex(
            (planning) => planning.id === draggedPlanningCardId,
          );
          const toIndex = sortedGroup.findIndex(
            (planning) => planning.id === targetPlanningCardId,
          );

          if (fromIndex < 0 || toIndex < 0) {
            clearPlanningDropTargets();
            return;
          }

          const reordered = [...sortedGroup];
          const [movedPlanning] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, movedPlanning);

          reordered.forEach((planning, index) => {
            planning.order = index + 1;
            planning.updatedAt = new Date().toISOString();
          });

          saveData();
          clearPlanningDropTargets();
          rerenderPlanning({ openPlanningId: draggedPlanningCardId });
        });

        item.addEventListener("dragend", (e) => {
          e.currentTarget.classList.remove("dragging");
          clearPlanningDropTargets();
          draggedPlanningCardId = null;
        });
      });

      mainContent.querySelectorAll(".btn-delete-planning").forEach((button) => {
        button.addEventListener("click", (e) => {
          const planningId = e.currentTarget.dataset.planningId;
          CustomSwal.fire({
            title: "Excluir tema?",
            text: "Esta ação não poderá ser desfeita.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Excluir",
            cancelButtonText: "Cancelar",
            reverseButtons: true,
          }).then((result) => {
            if (!result.isConfirmed) return;

            const existsInTemplates = (state.planningTemplates || []).some(
              (item) => item.id === planningId,
            );
            if (existsInTemplates) {
              state.planningTemplates = (state.planningTemplates || []).filter(
                (item) => item.id !== planningId,
              );
              state.plannings = (state.plannings || []).filter(
                (item) => item.sourceTemplateId !== planningId,
              );
            } else {
              state.plannings = (state.plannings || []).filter(
                (item) => item.id !== planningId,
              );
            }
            saveData();
            rerenderPlanning();
          });
        });
      });

      mainContent
        .querySelectorAll(".btn-associate-planning")
        .forEach((button) => {
          button.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const planningId = e.currentTarget.dataset.planningId;
            await openAssociatePlanningModal(planningId);
          });
        });

      mainContent.querySelectorAll(".btn-edit-planning").forEach((button) => {
        button.addEventListener("click", async (e) => {
          const planningId = e.currentTarget.dataset.planningId;
          const planning = findPlanningRecordById(planningId);
          if (!planning) return;

          const edited = await openPlanningEditModal(planning);
          if (!edited) return;

          rerenderPlanning({ openPlanningId: planningId });
        });
      });
    }

    // --- 4. SCHOOL DATA (DADOS DA ESCOLA) ---
    if (pageId === "school-data") {
      const activeTab = params.tab || "schools";
      const pageContainer = mainContent.querySelector(
        "#school-data-page-container",
      );

      pageContainer
        .querySelector("#school-data-tabs")
        ?.addEventListener("click", (e) => {
          if (e.target.matches("button[data-tab]")) {
            const tabId = e.target.dataset.tab;
            renderPage("school-data", {
              tab: tabId,
            });
          }
        });

      if (["schools", "teachers", "subjects"].includes(activeTab)) {
        const itemType = activeTab.slice(0, -1);
        mainContent
          .querySelector("#btn-inline-save")
          ?.addEventListener("click", () => {
            const input = mainContent.querySelector("#inline-add-input");
            let value = input.value.trim();
            if (!value) return;
            state[activeTab].push({
              id: generateUUID(),
              name: value,
            });
            saveData();
            renderPage("school-data", {
              tab: activeTab,
            });
          });
        mainContent
          .querySelectorAll(".btn-edit")
          .forEach((btn) =>
            btn.addEventListener("click", (e) =>
              openEditModal(e.currentTarget.dataset.id, itemType),
            ),
          );
        mainContent
          .querySelectorAll(".btn-delete")
          .forEach((btn) =>
            btn.addEventListener("click", (e) =>
              handleDelete(e.currentTarget.dataset.id, activeTab, params),
            ),
          );
        mainContent.querySelectorAll(".btn-view-schedule").forEach((btn) =>
          btn.addEventListener("click", (e) => {
            const teacherId = e.currentTarget.dataset.id;
            const schedule = state.schedules.find(
              (s) => s.teacherId === teacherId,
            );
            if (schedule) {
              const classInfo = state.classes.find(
                (c) => c.id === schedule.classId,
              );
              if (classInfo) {
                renderPage("schedule-grid", {
                  teacherId,
                  schoolId: classInfo.schoolId,
                });
                return;
              }
            }
            renderPage("schedule-grid", {
              teacherId,
            });
          }),
        );
        mainContent.querySelectorAll(".btn-view-notes").forEach((btn) =>
          btn.addEventListener("click", (e) => {
            renderPage("teacher-notes", {
              teacherId: e.currentTarget.dataset.id,
            });
          }),
        );
      }

      if (activeTab === "notes") {
        mainContent
          .querySelector("#btn-save-notes-settings")
          ?.addEventListener("click", () => {
            const minBlueInput = mainContent.querySelector(
              "#school-notes-min-blue",
            );
            const decimalsInput = mainContent.querySelector(
              "#school-notes-decimals",
            );
            const roundingSelect = mainContent.querySelector(
              "#school-notes-rounding",
            );
            if (!minBlueInput || !decimalsInput || !roundingSelect) return;

            const minBlueValue = parseFloat(minBlueInput.value);
            const decimalsValue = parseInt(decimalsInput.value, 10);
            const roundingValue = roundingSelect.value;

            if (isNaN(minBlueValue) || minBlueValue < 0 || minBlueValue > 10) {
              CustomSwal.fire(
                "Atenção",
                "Informe uma nota válida entre 0 e 10.",
                "warning",
              );
              return;
            }

            if (
              isNaN(decimalsValue) ||
              decimalsValue < 0 ||
              decimalsValue > 4
            ) {
              CustomSwal.fire(
                "Atenção",
                "Informe uma quantidade de casas decimais entre 0 e 4.",
                "warning",
              );
              return;
            }

            if (!["real", "half", "integer"].includes(roundingValue)) {
              CustomSwal.fire(
                "Atenção",
                "Selecione um sistema de arredondamento válido.",
                "warning",
              );
              return;
            }

            state.settings.minimumBlueGrade =
              Math.round(minBlueValue * 10) / 10;
            state.settings.gradeDecimalPlaces = decimalsValue;
            state.settings.gradeRoundingMode = roundingValue;
            saveData();
            CustomSwal.fire(
              "Salvo!",
              "Configurações de notas salvas com sucesso.",
              "success",
            );
            renderPage("school-data", { tab: "notes" });
          });
      }

      if (activeTab === "schedules") {
        const container = mainContent.querySelector(
          "#schedules-page-container",
        );
        if (!container) return;

        const schoolSelect = container.querySelector(
          "#schedules-school-select",
        );
        const configContainer = container.querySelector(
          "#schedule-config-container",
        );

        const handleTabSwitch = (e) => {
          if (!e.target.classList.contains("page-tab")) return;

          configContainer
            .querySelectorAll(".page-tab")
            .forEach((t) => t.classList.remove("active"));
          e.target.classList.add("active");

          configContainer
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.add("hidden"));
          const tabName = e.target.dataset.tab;
          configContainer
            .querySelector(`#${tabName}_tab_content`)
            .classList.remove("hidden");
        };

        const loadConfig = () => {
          const schoolId = schoolSelect.value;
          if (!schoolId) {
            configContainer.innerHTML = "";
            return;
          }
          if (!state.calendars[schoolId]) {
            state.calendars[schoolId] = {
              termType: "bimestre",
              terms: [],
              importantDates: [],
              scheduleConfig: {
                morning: {
                  periodsPerDay: 5,
                  periods: [],
                },
                afternoon: {
                  periodsPerDay: 0,
                  periods: [],
                },
              },
            };
          }
          configContainer.innerHTML = renderScheduleConfig(schoolId);
        };

        schoolSelect.addEventListener("change", loadConfig);
        configContainer.addEventListener("click", handleTabSwitch);

        configContainer.addEventListener("change", (e) => {
          if (e.target.matches("input[data-period-type-control]")) {
            const schoolId = schoolSelect.value;
            if (!schoolId) return;

            const periodType = e.target.dataset.periodTypeControl;
            const inputsContainer = document.getElementById(
              `${periodType}-period-inputs`,
            );
            const newCount = parseInt(e.target.value) || 0;
            const currentCount = inputsContainer.children.length;

            const currentPeriods = [];
            for (let i = 0; i < currentCount; i++) {
              const startTime = inputsContainer.querySelector(
                `input[data-period-index="${i}"][data-field="startTime"]`,
              )?.value;
              const endTime = inputsContainer.querySelector(
                `input[data-period-index="${i}"][data-field="endTime"]`,
              )?.value;
              currentPeriods.push({
                startTime,
                endTime,
              });
            }

            state.calendars[schoolId].scheduleConfig[periodType].periodsPerDay =
              newCount;
            state.calendars[schoolId].scheduleConfig[periodType].periods =
              currentPeriods;

            if (newCount > currentCount) {
              for (let i = currentCount; i < newCount; i++) {
                const div = document.createElement("div");
                div.className = "flex items-center gap-2";
                div.innerHTML = `
                        <label class="w-20 text-secondary">Aula ${i + 1}</label>
                        <input type="time" class="form-input" value="" data-period-type="${periodType}" data-period-index="${i}" data-field="startTime">
                        <input type="time" class="form-input" value="" data-period-type="${periodType}" data-period-index="${i}" data-field="endTime">
                    `;
                inputsContainer.appendChild(div);
              }
            } else {
              while (inputsContainer.children.length > newCount) {
                inputsContainer.removeChild(inputsContainer.lastChild);
              }
            }
          }
        });

        configContainer.addEventListener("click", (e) => {
          if (e.target.id === "btn-save-config") {
            const schoolId = schoolSelect.value;
            if (!schoolId) return;

            const calendar = state.calendars[schoolId];
            if (!calendar) return;

            ["morning", "afternoon"].forEach((periodType) => {
              const periodConfig = calendar.scheduleConfig[periodType];
              const periodsPerDay =
                parseInt(
                  container.querySelector(`#periods-per-day-${periodType}`)
                    .value,
                ) || 0;
              periodConfig.periodsPerDay = periodsPerDay;

              const periods = [];
              for (let i = 0; i < periodsPerDay; i++) {
                const startTime =
                  container.querySelector(
                    `input[data-period-type="${periodType}"][data-period-index="${i}"][data-field="startTime"]`,
                  )?.value || "";
                const endTime =
                  container.querySelector(
                    `input[data-period-type="${periodType}"][data-period-index="${i}"][data-field="endTime"]`,
                  )?.value || "";
                periods.push({
                  startTime,
                  endTime,
                });
              }
              periodConfig.periods = periods;
            });

            saveData();
            CustomSwal.fire(
              "Sucesso",
              "Configuração de horários salva!",
              "success",
            );
          }
        });
      }

      if (activeTab === "calendar") {
        const calendarContainer = mainContent.querySelector(
          "#calendar-page-container",
        );
        if (!calendarContainer) return;

        const schoolSelect = calendarContainer.querySelector(
          "#calendar-school-select",
        );
        const contentWrapper = calendarContainer.querySelector(
          "#calendar-content-wrapper",
        );

        const loadCalendarContent = (schoolId) => {
          contentWrapper.innerHTML = generateCalendarContentHTML(schoolId);
        };

        schoolSelect?.addEventListener("change", (e) => {
          const schoolId = e.target.value;
          if (schoolId) {
            if (!state.calendars[schoolId]) {
              state.calendars[schoolId] = {
                termType: "bimestre",
                terms: [],
                importantDates: [],
                scheduleConfig: {
                  morning: {
                    periodsPerDay: 5,
                    periods: [],
                  },
                  afternoon: {
                    periodsPerDay: 0,
                    periods: [],
                  },
                },
              };
              saveData();
            }
            loadCalendarContent(schoolId);
          } else {
            contentWrapper.innerHTML = "";
          }
        });

        calendarContainer.addEventListener("change", (e) => {
          if (e.target.name === "termType") {
            const schoolId = schoolSelect.value;
            if (schoolId && state.calendars[schoolId]) {
              state.calendars[schoolId].termType = e.target.value;
              loadCalendarContent(schoolId);
            }
          }
        });

        calendarContainer.addEventListener("click", (e) => {
          const schoolId = schoolSelect.value;
          if (!schoolId) return;

          if (e.target.id === "btn-save-terms") {
            const calendar = state.calendars[schoolId];
            const termType = calendar.termType;
            const newTerms = [];
            calendarContainer
              .querySelectorAll("#terms-container [data-term-id]")
              .forEach((input) => {
                const id = parseInt(input.dataset.termId);
                let term = newTerms.find((t) => t.id === id);
                if (!term) {
                  term = {
                    id: id,
                  };
                  newTerms.push(term);
                }
                term[input.dataset.field] = input.value;
              });
            calendar.terms = newTerms;
            saveData();
            CustomSwal.fire(
              "Salvo!",
              `Os ${termType === "bimestre" ? "Bimestres" : "Trimestres"} foram salvos com sucesso.`,
              "success",
            );
          }

          const deleteBtn = e.target.closest(".btn-delete-date");
          if (deleteBtn) {
            const idToDelete = deleteBtn.dataset.id;
            CustomSwal.fire({
              title: "Confirmar exclusão?",
              text: "A data será removida permanentemente.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Sim, excluir",
              cancelButtonText: "Cancelar",
            }).then((result) => {
              if (result.isConfirmed) {
                const calendar = state.calendars[schoolId];
                calendar.importantDates = calendar.importantDates.filter(
                  (d) => d.id !== idToDelete,
                );
                saveData();
                loadCalendarContent(schoolId);
              }
            });
          }

          const editDateBtn = e.target.closest(".btn-edit-date");
          if (editDateBtn) {
            openEditDateModal(schoolId, editDateBtn.dataset.id);
          }
        });

        calendarContainer.addEventListener("submit", (e) => {
          if (e.target.id === "form-add-date") {
            e.preventDefault();
            const schoolId = schoolSelect.value;
            if (!schoolId) return;

            const dateInput =
              calendarContainer.querySelector("#new-date-input");
            const descInput =
              calendarContainer.querySelector("#new-desc-input");
            const isSchoolDayInput = calendarContainer.querySelector(
              "#new-is-school-day-input",
            );

            if (dateInput.value && descInput.value) {
              const calendar = state.calendars[schoolId];
              calendar.importantDates.push({
                id: generateUUID(),
                date: dateInput.value,
                description: descInput.value,
                isSchoolDay: isSchoolDayInput.checked,
              });
              saveData();
              loadCalendarContent(schoolId);
              e.target.reset();
            }
          }
        });
      }
    }

    // --- 5. CLASSES (TURMAS) ---
    if (pageId === "classes") {
      mainContent
        .querySelector("#btn-add-class")
        ?.addEventListener("click", () => openClassModal());
      mainContent
        .querySelectorAll(".btn-edit-class")
        .forEach((btn) =>
          btn.addEventListener("click", (e) =>
            openClassModal(e.currentTarget.dataset.id),
          ),
        );
      mainContent
        .querySelectorAll(".btn-delete-class")
        .forEach((btn) =>
          btn.addEventListener("click", (e) =>
            handleDelete(e.currentTarget.dataset.id, "classes", {}),
          ),
        );
      mainContent.querySelectorAll(".btn-manage-class").forEach((btn) =>
        btn.addEventListener("click", (e) =>
          renderPage("manage-class", {
            id: e.currentTarget.dataset.id,
          }),
        ),
      );

      mainContent
        .querySelector("#btn-export-classes")
        ?.addEventListener("click", async () => {
          const exportOptions = await openClassExportModal({ all: true });
          if (!exportOptions) return;
          if (exportOptions.format === "excel") {
            generateClassListExcel({
              selectedClassIds: exportOptions.selectedClassIds,
              ...exportOptions,
            });
          } else {
            generateClassListPdf(exportOptions);
          }
        });

      mainContent
        .querySelectorAll(".btn-export-single-class")
        .forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const classId = e.currentTarget?.dataset?.id;
            if (!classId) return;
            const exportOptions = await openClassExportModal({ classId });
            if (!exportOptions) return;
            if (exportOptions.format === "excel") {
              generateClassListExcel({ classId, ...exportOptions });
            } else {
              generateClassListPdf({
                ...exportOptions,
                selectedClassIds: [classId],
              });
            }
          });
        });
    }

    // --- 6. MANAGE CLASS (GERENCIAR TURMA) ---
    if (pageId === "manage-class") {
      mainContent
        .querySelector("#btn-back-to-classes")
        ?.addEventListener("click", () => renderPage("classes"));
      mainContent
        .querySelector("#btn-add-student")
        ?.addEventListener("click", () => openStudentModal(params.id));
      mainContent
        .querySelector("#btn-bulk-add-student")
        ?.addEventListener("click", () => openBulkAddStudentModal(params.id));
      mainContent
        .querySelectorAll(".btn-edit-student")
        .forEach((btn) =>
          btn.addEventListener("click", (e) =>
            openStudentModal(params.id, e.currentTarget.dataset.id),
          ),
        );
      mainContent
        .querySelectorAll(".btn-remanejar-student")
        .forEach((btn) =>
          btn.addEventListener("click", (e) =>
            openStudentTransferModal(params.id, e.currentTarget.dataset.id),
          ),
        );
      mainContent.querySelectorAll(".btn-delete-student").forEach((btn) =>
        btn.addEventListener("click", (e) =>
          handleDelete(e.currentTarget.dataset.id, "students", {
            id: params.id,
          }),
        ),
      );
      mainContent
        .querySelector("#btn-generate-class-pdf")
        ?.addEventListener("click", () =>
          generateSimpleClassListPdf(params.id),
        );

      mainContent.querySelectorAll(".laudo-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          const studentId = e.target.dataset.studentId;
          const student = state.students.find((s) => s.id === studentId);
          if (student) {
            student.hasLaudo = e.target.checked;
            saveData();
          }
        });
      });

      mainContent.querySelectorAll(".btn-copy-ra").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const rawRa = e.currentTarget.dataset.ra;
          const cleanRa = rawRa.replace(/-/g, "");

          if (cleanRa) {
            navigator.clipboard
              .writeText(cleanRa)
              .then(() => {
                CustomSwal.fire({
                  toast: true,
                  position: "top-end",
                  icon: "success",
                  title: `RA copiado: ${cleanRa}`,
                  showConfirmButton: false,
                  timer: 1500,
                });
              })
              .catch((err) => {
                console.error("Erro ao copiar", err);
              });
          }
        });
      });
    }

    // --- 7. TASKS (TAREFAS) ---
    if (pageId === "tasks") {
      const container = mainContent.querySelector("#tasks-page-container");
      if (!container) return;

      container
        .querySelector("#btn-add-task")
        ?.addEventListener("click", () => openTaskModal());

      container.querySelectorAll(".tasks-view-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const view = e.currentTarget.dataset.view;
          renderPage("organization", {
            tab: "tasks",
            view,
          });
        });
      });

      container.querySelectorAll(".btn-edit-task").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const taskId =
            e.target.closest("[data-task-id]")?.dataset.taskId ||
            e.currentTarget.dataset.id;
          if (taskId) openTaskModal(taskId);
        });
      });

      container.querySelectorAll(".btn-restore-task").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const taskId = e.currentTarget.dataset.id;
          const task = state.tasks.find((t) => t.id === taskId);
          if (task) {
            task.isArchived = false;
            saveData();
            renderPage("organization", {
              tab: "tasks",
              view: "archived",
            });
            CustomSwal.fire({
              toast: true,
              icon: "success",
              title: "Tarefa restaurada!",
              position: "top-end",
              timer: 1500,
              showConfirmButton: false,
            });
          }
        });
      });

      container.querySelectorAll(".btn-delete-task").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const taskId = e.currentTarget.dataset.id;
          handleDelete(taskId, "tasks", {
            tab: "tasks",
          });
        });
      });

      container
        .querySelectorAll('.todo-item input[type="checkbox"]')
        .forEach((checkbox) => {
          checkbox.addEventListener("change", (e) => {
            const taskId = e.target.dataset.id;
            const task = state.tasks.find((t) => t.id === taskId);
            if (task) {
              task.status = e.target.checked ? "concluido" : "a_fazer";
              saveData();
              renderPage("organization", {
                tab: "tasks",
                view: "todo",
              });
            }
          });
        });

      const draggables = container.querySelectorAll(".kanban-card");
      const columns = container.querySelectorAll(".kanban-cards");

      draggables.forEach((draggable) => {
        draggable.addEventListener("dragstart", () =>
          draggable.classList.add("dragging"),
        );
        draggable.addEventListener("dragend", () =>
          draggable.classList.remove("dragging"),
        );
      });

      columns.forEach((column) => {
        column.addEventListener("dragover", (e) => e.preventDefault());
        column.addEventListener("drop", (e) => {
          e.preventDefault();
          const draggingCard = document.querySelector(".dragging");
          if (draggingCard) {
            const taskId = draggingCard.dataset.taskId;
            const newStatus = column.closest(".kanban-column").dataset.status;
            const task = state.tasks.find((t) => t.id === taskId);
            if (task && task.status !== newStatus) {
              task.status = newStatus;
              saveData();
              renderPage("organization", {
                tab: "tasks",
                view: "kanban",
              });
            }
          }
        });
      });
    }

    // --- 8. NOTES (ANOTA�!�"ES) ---
    if (pageId === "notes") {
      const container = mainContent.querySelector("#notes-page-container");
      if (!container) return;

      const teacherSelect = container.querySelector("#notes-teacher-select");
      const addBtn = container.querySelector("#btn-add-note");
      const listContainer = container.querySelector("#notes-list-container");

      teacherSelect.addEventListener("change", () => {
        const teacherId = teacherSelect.value;
        if (teacherId) {
          addBtn.disabled = false;
          addBtn.dataset.teacherId = teacherId;
          const teacherNotes = state.notes
            .filter((n) => n.teacherId === teacherId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

          const noteRows =
            teacherNotes
              .map(
                (note) => `
                <tr>
                    <td>${note.title}</td>
                    <td>${new Date(note.date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td class="text-right">
                        <button class="btn-edit-note-metadata text-blue-500 hover:text-blue-700 mr-2" data-id="${note.id}" title="Editar Título/Data">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-edit-note-content text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${note.id}" title="Editar Conteúdo (Caderno)">
                            <i class="fas fa-book-open"></i>
                        </button>
                        <button class="btn-delete-note text-red-500 hover:text-red-700" data-id="${note.id}" title="Excluir Anotação">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`,
              )
              .join("") ||
            `<tr><td colspan="3" class="text-center py-4 text-secondary">Nenhuma anotação encontrada para este professor.</td></tr>`;

          listContainer.innerHTML = `
                <div class="card p-0">
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead><tr><th>Título</th><th>Data</th><th class="text-right">Ações</th></tr></thead>
                            <tbody>${noteRows}</tbody>
                        </table>
                    </div>
                </div>`;
        } else {
          addBtn.disabled = true;
          listContainer.innerHTML = `<div class="card p-6 text-center text-secondary"><i class="fas fa-arrow-up fa-2x mb-4"></i><p>Selecione um professor para visualizar as anotações.</p></div>`;
        }
      });

      addBtn.addEventListener("click", (e) =>
        openNoteModal(e.currentTarget.dataset.teacherId),
      );

      listContainer.addEventListener("click", (e) => {
        const editMetadataBtn = e.target.closest(".btn-edit-note-metadata");
        const editBtn = e.target.closest(".btn-edit-note-content");
        const deleteBtn = e.target.closest(".btn-delete-note");

        if (editMetadataBtn) {
          openEditNoteMetadataModal(editMetadataBtn.dataset.id, "organization");
        }
        if (editBtn) {
          renderPage("edit-note", {
            noteId: editBtn.dataset.id,
          });
        }
        if (deleteBtn) {
          handleDelete(deleteBtn.dataset.id, "notes", {
            tab: "notes",
          });
        }
      });
    }

    // --- 9. TEACHER NOTES (ANOTA�!�"ES DO PROFESSOR) ---
    if (pageId === "teacher-notes") {
      mainContent
        .querySelector("#btn-back-to-teachers")
        ?.addEventListener("click", () =>
          renderPage("school-data", {
            tab: "teachers",
          }),
        );
      mainContent
        .querySelector("#btn-add-note")
        ?.addEventListener("click", (e) =>
          openNoteModal(e.currentTarget.dataset.teacherId),
        );

      mainContent.querySelectorAll(".btn-edit-note-metadata").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          openEditNoteMetadataModal(e.currentTarget.dataset.id, "school-data"),
        );
      });

      mainContent.querySelectorAll(".btn-edit-note-content").forEach((btn) => {
        btn.addEventListener("click", (e) =>
          renderPage("edit-note", {
            noteId: e.currentTarget.dataset.id,
          }),
        );
      });

      mainContent.querySelectorAll(".btn-delete-note").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const noteId = e.currentTarget.dataset.id;
          handleDelete(noteId, "notes", {
            teacherId: params.teacherId,
          });
        });
      });
    }

    // --- 10. EDIT NOTE (EDITOR DE ANOTA�!ÒO) ---
    if (pageId === "edit-note") {
      let quill;

      const backBtn = mainContent.querySelector("#btn-back-to-notes");
      backBtn?.addEventListener("click", (e) => {
        const fromPage = e.currentTarget.dataset.from;
        const teacherId = e.currentTarget.dataset.teacherId;
        if (fromPage === "organization") {
          renderPage("organization", {
            tab: "notes",
          });
        } else {
          renderPage("teacher-notes", {
            teacherId: teacherId,
          });
        }
      });

      if (typeof Quill !== "undefined") {
        const note = state.notes.find((n) => n.id === params.noteId);

        quill = new Quill("#note-editor", {
          modules: {
            toolbar: [
              [
                {
                  header: [1, 2, 3, 4, false],
                },
              ],
              ["bold", "italic", "underline"],
              [
                {
                  list: "ordered",
                },
                {
                  list: "bullet",
                },
              ],
            ],
          },
          placeholder: "Digite sua anotação aqui...",
          theme: "snow",
        });

        if (note && note.content) {
          quill.root.innerHTML = note.content;
        }

        mainContent
          .querySelector("#btn-save-note")
          ?.addEventListener("click", (e) => {
            const noteId = e.currentTarget.dataset.noteId;
            const noteToSave = state.notes.find((n) => n.id === noteId);
            if (noteToSave && quill) {
              noteToSave.content = quill.root.innerHTML;
              saveData();
              CustomSwal.fire(
                "Salvo!",
                "Anotação salva com sucesso.",
                "success",
              );
            }
          });
      } else {
        console.error("Quill.js is not loaded.");
      }
    }

    // --- 11. DIARY (DIÁRIO DE CLASSE) ---
    if (pageId === "diary") {
      const container = mainContent.querySelector("#diary-page-container");
      if (!container) return;

      const courseSelect = container.querySelector("#diary-course-select");
      const termSelectorContainer = container.querySelector(
        "#term-selector-container",
      );
      const tabContentContainer = container.querySelector("#diary-tab-content");
      const actionsContainerTop = container.querySelector(
        "#diary-actions-container-top",
      );
      const actionsContainerBottom = container.querySelector(
        "#diary-actions-container-bottom",
      );
      const classInfoContainer = container.querySelector(
        "#class-info-container",
      );
      const tabsContainer = container.querySelector("#diary-tabs");

      const loadTabContent = () => {
        const activeTab =
          tabsContainer.querySelector(".page-tab.active")?.dataset.tab;
        if (!activeTab) return;

        const courseId = courseSelect.value;
        const termSelect =
          termSelectorContainer.querySelector("#diary-term-select");
        const termValue = termSelect?.value;
        const onlyActiveStudents =
          container.querySelector("#diary-active-only-toggle")?.checked !==
          false;

        actionsContainerTop.innerHTML = "";
        actionsContainerBottom.innerHTML = "";

        if (!courseId || !termValue) {
          const message = !courseId
            ? "Selecione uma turma e disciplina."
            : "Selecione um período.";
          tabContentContainer.innerHTML = `<p class="text-center text-secondary">${message}</p>`;
          classInfoContainer.innerHTML = "";
          if (activeTab === "bulletins" && courseId) {
            // Boletim não precisa de período
          } else {
            return;
          }
        }

        const course = getUniqueCourses().find((c) => c.id === courseId);
        const [startDate, endDate] = termValue
          ? termValue.split("|")
          : [null, null];
        const termKey =
          termValue === "5th-council"
            ? "5th-council"
            : `${startDate}|${endDate}`;

        const classDates = getScheduledDatesForTerm(course, startDate, endDate);
        const schoolDaysCount = classDates
          .filter((d) => d.isSchoolDay)
          .reduce((total, day) => total + day.numPeriods, 0);
        const studentCount = getDiaryStudentsForClass(
          course.classId,
          true,
        ).length;
        const hasSchoolDays =
          classDates.filter((d) => d.isSchoolDay).length > 0;
        const studentLabel = "Alunos Ativos";

        classInfoContainer.innerHTML = `
            <span class="inline-flex items-center"><i class="fas fa-users mr-2 text-secondary"></i><strong>${studentCount}</strong>&nbsp;${studentLabel}</span>
            ${schoolDaysCount > 0 ? `<span class="inline-flex items-center"><i class="fas fa-calendar-alt mr-2 text-secondary"></i><strong>${schoolDaysCount}</strong>&nbsp;Aulas no Período</span>` : ""}
         `;

        let content, actions;
        if (activeTab === "attendance") {
          ({ gridHtml: content, actionsHtml: actions } = generateAttendanceGrid(
            course,
            classDates,
            { onlyActive: onlyActiveStudents },
          ));
          tabContentContainer.innerHTML = content;
          if (hasSchoolDays) {
            actionsContainerTop.innerHTML = actions;
            actionsContainerBottom.innerHTML = actions;
          }
          updateAttendanceCalculations(course, classDates);
        } else if (activeTab === "content") {
          ({ gridHtml: content, actionsHtml: actions } = generateContentGrid(
            course,
            classDates,
            startDate,
            endDate,
          ));
          tabContentContainer.innerHTML = content;
          if (hasSchoolDays) {
            actionsContainerTop.innerHTML = actions;
            actionsContainerBottom.innerHTML = actions;
          }
        } else if (activeTab === "homework") {
          ({ gridHtml: content, actionsHtml: actions } = renderHomeworkList(
            courseId,
            startDate,
            endDate,
          ));
          tabContentContainer.innerHTML = content;
          actionsContainerTop.innerHTML = actions;
          actionsContainerBottom.innerHTML = actions;
        } else if (activeTab === "occurrences") {
          ({ gridHtml: content, actionsHtml: actions } = renderOccurrencesList(
            courseId,
            startDate,
            endDate,
          ));
          tabContentContainer.innerHTML = content;
          actionsContainerTop.innerHTML = actions;
          actionsContainerBottom.innerHTML = actions;
        } else if (activeTab === "assessments") {
          ({ gridHtml: content, actionsHtml: actions } = renderAssessmentsPage(
            course,
            classDates,
            termKey,
            { onlyActive: onlyActiveStudents },
          ));
          tabContentContainer.innerHTML = content;
          actionsContainerBottom.innerHTML = actions;

          if (termKey === "5th-council") {
            const situationMap = {
              Aprovado: "Aprovado",
              "Aprovado pelo conselho": "Ap. Cons.",
              "Retido por frequência": "Ret. Freq.",
              "Retido por rendimento": "Ret. Rend.",
              "Retido por frequência e rendimento": "Ret. Freq. Rend.",
              Pendente: "Pendente",
            };

            const updateSelectText = (select, isFocused) => {
              const selectedOption = select.options[select.selectedIndex];
              if (selectedOption) {
                const fullText = selectedOption.value;
                if (isFocused) {
                  Array.from(select.options).forEach((opt) => {
                    opt.text = opt.value;
                  });
                } else {
                  const abbr = situationMap[fullText] || fullText;
                  selectedOption.text = abbr;
                }
              }
            };

            const selects = tabContentContainer.querySelectorAll(
              ".final-situation-select",
            );
            selects.forEach((select) => {
              updateSelectText(select, false);

              select.addEventListener("focus", () =>
                updateSelectText(select, true),
              );
              select.addEventListener("blur", () =>
                updateSelectText(select, false),
              );
              select.addEventListener("change", () => {
                const newSituation = select.value;
                select.classList.remove(
                  "text-blue-700",
                  "text-red-600",
                  "text-secondary",
                );
                if (
                  newSituation.includes("Aprovado") ||
                  newSituation.includes("Ap.")
                ) {
                  select.classList.add("text-blue-700", "font-bold");
                } else if (
                  newSituation.includes("Retido") ||
                  newSituation.includes("Ret.")
                ) {
                  select.classList.add("text-red-600", "font-bold");
                } else {
                  select.classList.add("text-secondary");
                }
                select.blur();
              });
            });
          }
        } else if (activeTab === "bulletins") {
          ({ gridHtml: content, actionsHtml: actions } = renderBulletinsPage(
            course,
            { onlyActive: onlyActiveStudents },
          ));
          tabContentContainer.innerHTML = content;
          actionsContainerBottom.innerHTML = actions;
        }
      };

      const activeOnlyToggle = container.querySelector(
        "#diary-active-only-toggle",
      );
      if (activeOnlyToggle) {
        activeOnlyToggle.checked = isDiaryOnlyActiveStudentsEnabled();
        activeOnlyToggle.addEventListener("change", () => {
          if (!state.settings) state.settings = {};
          state.settings.diaryShowOnlyActiveStudents = activeOnlyToggle.checked;
          saveData();
          loadTabContent();
        });
      }

      courseSelect.addEventListener("change", () => {
        const courseId = courseSelect.value;
        termSelectorContainer.innerHTML = "";
        tabContentContainer.innerHTML = `<p class="text-center text-secondary">Selecione uma turma, disciplina e período.</p>`;
        actionsContainerTop.innerHTML = "";
        actionsContainerBottom.innerHTML = "";
        classInfoContainer.innerHTML = "";

        if (!courseId) return;

        const course = getUniqueCourses().find((c) => c.id === courseId);
        if (!course) return;

        const schoolCalendar = state.calendars[course.schoolId];
        const activeTab =
          tabsContainer.querySelector(".page-tab.active")?.dataset.tab;
        if (activeTab === "bulletins") {
          loadTabContent();
          return;
        }

        if (
          !schoolCalendar ||
          !schoolCalendar.terms ||
          schoolCalendar.terms.length === 0
        ) {
          termSelectorContainer.innerHTML = `<p class="text-red-500 mt-2">Nenhum período cadastrado. Configure em "Dados da Escola > Calendário".</p>`;
          return;
        }

        const termOptions = schoolCalendar.terms
          .filter((term) => term.startDate && term.endDate)
          .map((term) => {
            const termName = `${term.id}º ${schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre"}`;
            return `<option value="${term.startDate}|${term.endDate}">${termName}</option>`;
          })
          .join("");

        const finalCouncilOption =
          activeTab === "assessments"
            ? '<option value="5th-council">5º Conselho (Final)</option>'
            : "";

        if (termOptions.length === 0 && finalCouncilOption === "") {
          termSelectorContainer.innerHTML = `<p class="text-red-500 mt-2">Os períodos não têm datas. Configure em "Dados da Escola > Calendário".</p>`;
          return;
        }

        termSelectorContainer.innerHTML = `
            <select id="diary-term-select" class="form-select w-auto flex-grow">
                <option value="">Selecione o período...</option>
                ${termOptions}
                ${finalCouncilOption}
            </select>
        `;

        const termSelect = termSelectorContainer.querySelector("select");
        const currentTerm = getCurrentTerm(schoolCalendar, new Date());
        if (currentTerm) {
          const termValue = `${currentTerm.startDate}|${currentTerm.endDate}`;
          if (termSelect.querySelector(`[value="${termValue}"]`)) {
            termSelect.value = termValue;
          }
        }
        termSelect.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );
      });

      termSelectorContainer.addEventListener("change", (e) => {
        if (e.target.id === "diary-term-select") {
          loadTabContent();
        }
      });

      tabsContainer.addEventListener("click", (e) => {
        const tabButton = e.target.closest(".page-tab");
        if (tabButton) {
          tabsContainer
            .querySelector(".page-tab.active")
            ?.classList.remove("active");
          tabButton.classList.add("active");

          courseSelect.dispatchEvent(
            new Event("change", {
              bubbles: true,
            }),
          );

          if (tabButton.dataset.tab === "bulletins") {
            termSelectorContainer.classList.add("hidden");
          } else {
            termSelectorContainer.classList.remove("hidden");
          }
        }
      });

      container.addEventListener("click", (e) => {
        if (!courseSelect) return;
        const courseId = courseSelect.value;
        const termSelect = container.querySelector("#diary-term-select");
        const termValue = termSelect?.value;

        if (e.target.closest("#btn-save-attendance")) {
          const course = getUniqueCourses().find((c) => c.id === courseId);
          if (!course) return;

          container
            .querySelectorAll(".attendance-cell:not(.disabled)")
            .forEach((cell) => {
              const { studentId, date, periodIndex, status } = cell.dataset;

              // Obtém versão vigente da grade para a data da aula
              const gradeVigente = getGradeHorariaVigente(date);
              const versaoSuffix = gradeVigente
                ? `_v${gradeVigente.versao}`
                : "";

              const key = `${course.classId}_${course.subjectId}_${date}_${periodIndex}${versaoSuffix}`;
              if (!state.attendance[key]) state.attendance[key] = {};
              state.attendance[key][studentId] = status;
            });

          state.termAttendance = {};

          saveData();
          CustomSwal.fire(
            "Salvo!",
            "Dados de frequência salvos com sucesso.",
            "success",
          );
        }

        const viewPlanningBtn = e.target.closest(".btn-view-planning");
        if (viewPlanningBtn) {
          const { classId, subjectId, termKey } = viewPlanningBtn.dataset;
          openViewPlanningModal(classId, termKey, subjectId);
        }

        const linkPlanningBtn = e.target.closest(".btn-link-planning-content");
        if (linkPlanningBtn) {
          const { classId, subjectId, termKey, date, periodIndex } =
            linkPlanningBtn.dataset;
          openPlanningLinkModal(classId, subjectId, termKey, (data) => {
            const { aulas, anexos } = data;
            if (aulas.length > 0) {
              const textAulas = aulas
                .map(
                  (group) => `${group.themeLabel}: ${group.titles.join(" / ")}`,
                )
                .join("\n");
              const textareaContent = container.querySelector(
                `textarea[data-date="${date}"][data-period-index="${periodIndex}"][data-field="content"]`,
              );
              if (textareaContent) {
                const current = textareaContent.value.trim();
                textareaContent.value = current
                  ? `${current}\n${textAulas}`
                  : textAulas;
              }
            }
            if (anexos.length > 0) {
              const textAnexos = anexos.join(" / ");
              const textareaObs = container.querySelector(
                `textarea[data-date="${date}"][data-period-index="${periodIndex}"][data-field="observations"]`,
              );
              if (textareaObs) {
                const current = textareaObs.value.trim();
                textareaObs.value = current
                  ? `${current}\n${textAnexos}`
                  : textAnexos;
              }
            }
          });
        }

        if (e.target.closest(".btn-save-content")) {
          const course = getUniqueCourses().find((c) => c.id === courseId);
          if (!course || !termValue) return;

          const [startDate, endDate] = termValue.split("|");
          const termKey = `${course.classId}_${course.subjectId}_${startDate}_${endDate}`;

          if (!state.content[termKey])
            state.content[termKey] = {
              dailyRecords: {},
            };

          container
            .querySelectorAll("textarea[data-date]")
            .forEach((textarea) => {
              const { date, periodIndex, field } = textarea.dataset;

              // Obtém versão vigente da grade para a data da aula
              const gradeVigente = getGradeHorariaVigente(date);
              const versaoSuffix = gradeVigente
                ? `_v${gradeVigente.versao}`
                : "";

              const lessonKey = `${date}_${periodIndex}${versaoSuffix}`;
              if (!state.content[termKey].dailyRecords[lessonKey]) {
                state.content[termKey].dailyRecords[lessonKey] = {
                  content: "",
                  observations: "",
                };
              }
              state.content[termKey].dailyRecords[lessonKey][field] =
                textarea.value;
            });

          saveData();
          CustomSwal.fire(
            "Salvo!",
            "Seu registro de aulas foi salvo com sucesso.",
            "success",
          );
        }

        if (e.target.closest("#btn-add-homework")) {
          if (courseId) {
            const [termStart, termEnd] =
              termValue && termValue.includes("|")
                ? termValue.split("|")
                : [undefined, undefined];
            openHomeworkModal(courseId, undefined, termStart, termEnd);
          }
        }
        const editHwBtn = e.target.closest(".btn-edit-homework");
        if (editHwBtn) {
          if (courseId) {
            const [termStart, termEnd] =
              termValue && termValue.includes("|")
                ? termValue.split("|")
                : [undefined, undefined];
            openHomeworkModal(
              courseId,
              editHwBtn.dataset.id,
              termStart,
              termEnd,
            );
          }
        }
        const deleteHwBtn = e.target.closest(".btn-delete-homework");
        if (deleteHwBtn) {
          handleDelete(deleteHwBtn.dataset.id, "homeworks", {
            pageId: "diary",
            courseId: courseId,
            termValue: termValue,
          });
        }

        if (e.target.closest("#btn-add-occurrence")) {
          if (courseId && termValue) {
            const [termStart, termEnd] = termValue.split("|");
            openOccurrenceModal(courseId, termStart, termEnd);
          }
        }

        const viewOccurrenceBtn = e.target.closest(".btn-view-occurrence");
        if (viewOccurrenceBtn) {
          openOccurrenceViewModal(viewOccurrenceBtn.dataset.id);
        }

        const editOccurrenceBtn = e.target.closest(".btn-edit-occurrence");
        if (editOccurrenceBtn) {
          if (courseId && termValue) {
            const [termStart, termEnd] = termValue.split("|");
            openOccurrenceModal(
              courseId,
              termStart,
              termEnd,
              editOccurrenceBtn.dataset.id,
            );
          }
        }

        const deleteOccurrenceBtn = e.target.closest(".btn-delete-occurrence");
        if (deleteOccurrenceBtn) {
          handleDelete(deleteOccurrenceBtn.dataset.id, "occurrences", {
            pageId: "diary",
            courseId: courseId,
            termValue: termValue,
          });
        }

        const dateHeader = e.target.closest(".date-header");
        if (dateHeader && !e.target.classList.contains("filter-icon")) {
          const date = dateHeader.dataset.dateCol;
          const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
            "pt-BR",
          );

          const setAll = (status) => {
            container
              .querySelectorAll(`.attendance-cell[data-date="${date}"]`)
              .forEach((cell) => {
                if (!cell.classList.contains("disabled")) {
                  cell.dataset.status = status;
                  cell.textContent = {
                    present: "P",
                    absent: "F",
                    excused: "J",
                    unset: "",
                  }[status];
                }
              });
            const course = getUniqueCourses().find((c) => c.id === courseId);
            const [startDate, endDate] = termValue.split("|");
            const classDates = getScheduledDatesForTerm(
              course,
              startDate,
              endDate,
            );
            updateAttendanceCalculations(course, classDates);
            Swal.close();
          };

          CustomSwal.fire({
            title: `Ações para ${formattedDate}`,
            html: `
                    <div class="swal-attendance-actions">
                        <button id="swal-set-present" class="btn btn-primary w-full"><i class="fas fa-check-circle mr-2"></i>Presença para Todos</button>
                        <button id="swal-set-absent" class="btn btn-danger w-full"><i class="fas fa-times-circle mr-2"></i>Falta para Todos</button>
                        <button id="swal-set-unset" class="btn btn-subtle w-full"><i class="fas fa-eraser mr-2"></i>Limpar Dia</button>
                    </div>
                `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: "Fechar",
            didOpen: () => {
              document
                .getElementById("swal-set-present")
                .addEventListener("click", () => setAll("present"));
              document
                .getElementById("swal-set-absent")
                .addEventListener("click", () => setAll("absent"));
              document
                .getElementById("swal-set-unset")
                .addEventListener("click", () => setAll("unset"));
            },
          });
        }

        const filterIcon = e.target.closest(".filter-icon");
        if (filterIcon) {
          e.stopPropagation();
          const date = filterIcon.dataset.dateCol;
          const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
            "pt-BR",
          );
          const filterStatusBar = mainContent.querySelector(
            "#filter-status-container",
          );

          filterStatusBar.innerHTML = `
                <div id="filter-status-bar" class="flex justify-between items-center">
                    <span><i class="fas fa-filter mr-2"></i>Exibindo apenas alunos com falta em <strong>${formattedDate}</strong>.</span>
                    <button id="clear-filter-btn" class="btn btn-danger text-sm py-1 px-2">Limpar Filtro</button>
                </div>`;
          filterStatusBar.classList.remove("hidden");

          mainContent.querySelectorAll("tbody tr").forEach((row) => {
            const studentId = row.dataset.studentRowId;
            const cellsForDate = mainContent.querySelectorAll(
              `.attendance-cell[data-student-id="${studentId}"][data-date="${date}"]`,
            );
            const hasAbsence = Array.from(cellsForDate).some(
              (cell) => cell.dataset.status === "absent",
            );
            row.classList.toggle("hidden-row", !hasAbsence);
          });
        }

        if (e.target.closest("#clear-filter-btn")) {
          mainContent
            .querySelector("#filter-status-container")
            .classList.add("hidden");
          mainContent
            .querySelectorAll("tbody tr")
            .forEach((row) => row.classList.remove("hidden-row"));
        }

        const cell = e.target.closest(".attendance-cell");
        if (cell && !cell.classList.contains("disabled")) {
          const statuses = ["present", "absent", "excused", "unset"];
          const currentStatus = cell.dataset.status;
          const nextIndex =
            (statuses.indexOf(currentStatus) + 1) % statuses.length;
          cell.dataset.status = statuses[nextIndex];
          cell.textContent = {
            present: "P",
            absent: "F",
            excused: "J",
            unset: "",
          }[statuses[nextIndex]];

          const course = getUniqueCourses().find((c) => c.id === courseId);
          const [startDate, endDate] = termValue.split("|");
          const classDates = getScheduledDatesForTerm(
            course,
            startDate,
            endDate,
          );
          updateAttendanceCalculations(course, classDates);
        }

        if (e.target.id === "btn-add-assessment") {
          if (courseId && termValue) {
            openAssessmentModal(courseId, termValue);
          }
        }
        const editAssessmentBtn = e.target.closest(".btn-edit-assessment");
        if (editAssessmentBtn) {
          if (courseId && termValue) {
            openAssessmentModal(
              courseId,
              termValue,
              editAssessmentBtn.dataset.id,
            );
          }
        }
        const deleteAssessmentBtn = e.target.closest(".btn-delete-assessment");
        if (deleteAssessmentBtn) {
          const idToDelete = deleteAssessmentBtn.dataset.id;
          const assessment = state.assessments.find((a) => a.id === idToDelete);

          CustomSwal.fire({
            title: "Você tem certeza?",
            text: "A avaliação e todas as notas associadas serão excluídas! As médias calculadas para este período serão zeradas.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim, deletar!",
          }).then((result) => {
            if (result.isConfirmed) {
              state.assessments = state.assessments.filter(
                (a) => a.id !== idToDelete,
              );
              for (const key in state.grades) {
                if (key.endsWith(`_${idToDelete}`)) {
                  delete state.grades[key];
                }
              }
              if (assessment && courseId) {
                const termKey = assessment.termKey;
                const studentsInClass = state.students.filter(
                  (s) => s.classId === assessment.classId,
                );
                studentsInClass.forEach((student) => {
                  const averageKey = `${student.id}_${courseId}_${termKey}`;
                  delete state.calculatedAverages[averageKey];
                  const attendanceKey = `${student.id}_${courseId}_${termKey}`;
                  delete state.termAttendance[attendanceKey];
                });
              }

              saveData();
              loadTabContent();
            }
          });
        }

        if (e.target.id === "btn-calculate-averages") {
          if (!courseId || !termValue) return;

          const course = getUniqueCourses().find((c) => c.id === courseId);
          const [termStart, termEnd] = termValue.split("|");
          const settingsKey = `${courseId}_${termValue}`;
          const settings = state.assessmentSettings[settingsKey] || {
            averageType: "ponderada",
          };
          const averageType = settings.averageType;

          const assessmentsForTerm = state.assessments.filter(
            (a) =>
              a.classId === course.classId &&
              a.subjectId === course.subjectId &&
              a.termKey === termValue,
          );
          const classDates = getScheduledDatesForTerm(
            course,
            termStart,
            termEnd,
          );

          mainContent
            .querySelectorAll("tbody tr[data-student-id]")
            .forEach((row) => {
              const studentId = row.dataset.studentId;
              const student = state.students.find((s) => s.id === studentId);
              const averageKey = `${studentId}_${courseId}_${termValue}`;

              let calculatedAverage = 0;
              let totalWeight = 0;
              let sumOfGrades = 0;
              let sumOfWeightedGrades = 0;
              let gradesEntered = 0;

              assessmentsForTerm.forEach((assessment) => {
                const gradeKey = `${studentId}_${assessment.id}`;
                const grade = state.grades[gradeKey];
                const numericGrade = parseGradeNumericValue(grade);

                if (numericGrade === null) return;
                sumOfGrades += numericGrade;
                sumOfWeightedGrades += numericGrade * assessment.weight;
                totalWeight += assessment.weight;
                gradesEntered++;
              });

              if (averageType === "ponderada") {
                calculatedAverage =
                  totalWeight > 0 ? sumOfWeightedGrades / totalWeight : 0;
              } else {
                calculatedAverage =
                  gradesEntered > 0 ? sumOfGrades / gradesEntered : 0;
              }

              calculatedAverage = roundGradeValue(calculatedAverage);

              state.calculatedAverages[averageKey] = calculatedAverage;
              const averageCell = row.querySelector(
                '[data-result="final-average"]',
              );
              averageCell.textContent = formatGradeValue(calculatedAverage);
              applyGradeStyles(averageCell, calculatedAverage);

              const attendanceData = getTermAttendance(student, course, {
                startDate: termStart,
                endDate: termEnd,
              });
              const attendanceKey = `${studentId}_${courseId}_${termValue}`;
              state.termAttendance[attendanceKey] = attendanceData;

              row.querySelector('[data-result="absences"]').textContent =
                attendanceData.absences;
              row.querySelector(
                '[data-result="excused-absences"]',
              ).textContent = attendanceData.excusedAbsences;
              row.querySelector(
                '[data-result="absence-percentage"]',
              ).textContent = `${attendanceData.absencePercentage.toFixed(0)}%`;
            });

          saveData();
          CustomSwal.fire(
            "Calculado!",
            "As médias e faltas foram atualizadas na tabela e salvas.",
            "success",
          );
        }

        if (e.target.closest("#btn-export-assessments-excel")) {
          if (!courseId || !termValue) return;
          const course = getUniqueCourses().find((c) => c.id === courseId);
          if (!course) return;
          const onlyActiveStudents =
            container.querySelector("#diary-active-only-toggle")?.checked !==
            false;
          generateAssessmentsExcel(course, termValue, {
            onlyActive: onlyActiveStudents,
          });
        }

        if (e.target.matches(".final-situation-select")) {
          const studentId = e.target.dataset.studentId;
          const courseId = e.target.dataset.courseId;
          const newSituation = e.target.value;

          const key = `${studentId}_${courseId}`;
          if (!state.finalResults[key]) {
            state.finalResults[key] = {};
          }
          state.finalResults[key].situation = newSituation;
          saveData();
        }
      });

      // --- DELEGA�!ÒO DE EVENTOS DO DIÁRIO (Substitua este bloco inteiro) ---
      container.addEventListener("change", (e) => {
        const value = e.target.value;
        const termSelect = container.querySelector("#diary-term-select");
        const termValue = termSelect?.value;

        // 1. Salvar Notas Parciais
        if (e.target.classList.contains("grade-input")) {
          const { studentId, assessmentId } = e.target.dataset;
          const gradeKey = `${studentId}_${assessmentId}`;

          if (value === "") {
            delete state.grades[gradeKey];
          } else {
            let numVal = parseGradeNumericValue(value);
            if (numVal === null) {
              delete state.grades[gradeKey];
            } else {
              if (numVal < 0) numVal = 0;
              if (numVal > 10) numVal = 10;
              state.grades[gradeKey] = numVal;
            }
          }
          saveData();
        }

        // 2. Salvar Ajuste de Nota (Recuperação Bimestral)
        if (e.target.classList.contains("adjustment-input")) {
          const { studentId, courseId } = e.target.dataset;
          if (!termValue) return;
          const adjustmentKey = `${studentId}_${courseId}_${termValue}`;

          if (value === "") {
            delete state.gradesAdjustments[adjustmentKey];
          } else {
            let numVal = parseGradeNumericValue(value);
            if (numVal === null) {
              delete state.gradesAdjustments[adjustmentKey];
            } else {
              if (numVal < 0) numVal = 0;
              if (numVal > 10) numVal = 10;
              state.gradesAdjustments[adjustmentKey] = numVal;
            }
          }
          saveData();
        }

        // 3. Salvar Ajuste do Conselho (Nota Final Manual)
        if (e.target.classList.contains("council-adjustment-input")) {
          const { studentId, courseId } = e.target.dataset;
          const key = `${studentId}_${courseId}`;

          if (!state.finalAdjustments) state.finalAdjustments = {};

          if (value === "") {
            delete state.finalAdjustments[key];
          } else {
            let numVal = parseGradeNumericValue(value);
            if (numVal === null) {
              delete state.finalAdjustments[key];
            } else {
              if (numVal < 0) numVal = 0;
              if (numVal > 10) numVal = 10;
              state.finalAdjustments[key] = numVal;
            }
          }
          saveData();
        }

        // 4. [CORRE�!ÒO] Salvar Situação Final (Select: Aprovado, Retido, etc.)
        if (e.target.classList.contains("final-situation-select")) {
          const { studentId, courseId } = e.target.dataset;
          const resultKey = `${studentId}_${courseId}`;

          if (!state.finalResults) state.finalResults = {};
          if (!state.finalResults[resultKey])
            state.finalResults[resultKey] = {};

          state.finalResults[resultKey].situation = value;
          saveData();

          // Feedback visual imediato: atualiza a cor do select
          e.target.className = e.target.className.replace(
            /grade-\w+|text-\w+/g,
            "",
          ); // Remove cores antigas
          e.target.classList.add(
            "form-select",
            "final-situation-select",
            "text-sm",
            "p-1",
          ); // Restaura classes base

          if (value.includes("Aprov")) e.target.classList.add("grade-success");
          else if (value.includes("Ret") || value.includes("Reprov"))
            e.target.classList.add("grade-danger");
          else e.target.classList.add("text-secondary");
        }
      });

      container.addEventListener("input", (e) => {
        const courseId = courseSelect.value;
        const termSelect = container.querySelector("#diary-term-select");
        const termValue = termSelect?.value;

        if (
          e.target.matches(
            ".grade-input, .adjustment-input, .council-adjustment-input",
          )
        ) {
          applyGradeStyles(e.target, e.target.value);
        }

        let value = e.target.value;
        if (
          e.target.matches(
            ".grade-input, .adjustment-input, .council-adjustment-input",
          )
        ) {
          const numericValue = parseGradeNumericValue(value);
          if (numericValue !== null && numericValue > 10) {
            value = "10";
            e.target.value = "10";
          }
          if (numericValue !== null && numericValue < 0) {
            value = "0";
            e.target.value = "0";
          }
        }

        if (e.target.classList.contains("grade-input")) {
          const { studentId, assessmentId } = e.target.dataset;
          const gradeKey = `${studentId}_${assessmentId}`;

          if (value === "") {
            delete state.grades[gradeKey];
          } else {
            const numericValue = parseGradeNumericValue(value);
            if (numericValue === null) {
              delete state.grades[gradeKey];
            } else {
              state.grades[gradeKey] = Math.max(0, Math.min(10, numericValue));
            }
          }
          saveData();
        }

        if (e.target.classList.contains("adjustment-input")) {
          if (!courseId || !termValue) return;
          const studentId = e.target.dataset.studentId;
          const adjustmentKey = `${studentId}_${courseId}_${termValue}`;

          if (value === "") {
            delete state.gradesAdjustments[adjustmentKey];
          } else {
            const numericValue = parseGradeNumericValue(value);
            if (numericValue === null) {
              delete state.gradesAdjustments[adjustmentKey];
            } else {
              state.gradesAdjustments[adjustmentKey] = Math.max(
                0,
                Math.min(10, numericValue),
              );
            }
          }
          saveData();
        }

        if (e.target.classList.contains("council-adjustment-input")) {
          const { studentId, courseId: currentCourseId } = e.target.dataset;
          const key = `${studentId}_${currentCourseId}`;

          if (value === "") {
            delete state.finalAdjustments[key];
          } else {
            const numericValue = parseGradeNumericValue(value);
            if (numericValue === null) {
              delete state.finalAdjustments[key];
            } else {
              state.finalAdjustments[key] = Math.max(
                0,
                Math.min(10, numericValue),
              );
            }
          }
          saveData();
        }
      });

      if (params.preselectedCourseId) {
        setTimeout(() => {
          if (courseSelect) {
            courseSelect.value = params.preselectedCourseId;
            courseSelect.dispatchEvent(
              new Event("change", {
                bubbles: true,
              }),
            );
          }
        }, 0);
      }
    }

    // --- 12. SCHEDULE GRID (GRADE HORÁRIA) ---
    if (pageId === "schedule-grid") {
      const container = mainContent.querySelector(
        "#schedule-grid-page-container",
      );
      if (!container) return;

      const schoolSelect = container.querySelector("#grid-school-select");
      const teacherSelectContainer = container.querySelector(
        "#grid-teacher-selector-container",
      );
      const gridContainer = container.querySelector(
        "#final-schedule-grid-container",
      );

      const generateTeacherSchedulePdf = async () => {
        const teacherSelect = container.querySelector("#grid-teacher-select");
        const teacherId = teacherSelect?.value;
        if (
          !schoolSelect.value ||
          !teacherId ||
          !gridContainer.innerHTML.trim()
        ) {
          CustomSwal.fire(
            "Atenção",
            "Selecione uma escola e um professor para gerar o PDF da grade.",
            "warning",
          );
          return;
        }

        const periodChoice = await CustomSwal.fire({
          title: "Gerar PDF da Grade",
          html: `
            <div class="text-left space-y-4">
              <div>
                <label for="pdf-period-select" class="block text-sm font-medium mb-2">Selecione o período para exportar:</label>
                <select id="pdf-period-select" class="swal-modern-select" style="width:100%;">
                  <option value="both">Manhã e Tarde</option>
                  <option value="morning">Somente Manhã</option>
                  <option value="afternoon">Somente Tarde</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="pdf-include-saturday" class="form-checkbox" />
                <label for="pdf-include-saturday" class="text-sm font-medium">Incluir Sábado</label>
              </div>
            </div>
          `,
          confirmButtonText: "Gerar PDF",
          showCancelButton: true,
          cancelButtonText: "Cancelar",
          preConfirm: () => {
            const selected =
              document.getElementById("pdf-period-select")?.value;
            const includeSaturday =
              document.getElementById("pdf-include-saturday")?.checked || false;
            if (!selected) {
              Swal.showValidationMessage("Selecione um período.");
              return false;
            }
            return { period: selected, includeSaturday };
          },
        });

        if (!periodChoice.isConfirmed) return;
        const selectedPeriod = periodChoice.value.period;
        const includeSaturday = periodChoice.value.includeSaturday;

        const schoolId = schoolSelect.value;
        const versionSelect = container.querySelector("#version-select");
        const versao = versionSelect?.value || null;

        const calendar = state.calendars[schoolId];
        if (!calendar?.scheduleConfig) {
          CustomSwal.fire(
            "Atenção",
            'A configuração de horários da escola precisa ser definida primeiro na página "Config. Horários".',
            "warning",
          );
          return;
        }

        const school = state.schools.find((s) => s.id === schoolId);
        const teacher = state.teachers.find((t) => t.id === teacherId);

        let schedulesToUse = state.schedules;
        let versionText = "Versão inicial";
        if (versao) {
          const version = state.gradesHorarias?.find((v) => v.versao == versao);
          if (version) {
            schedulesToUse = version.schedules || [];
            versionText = `Versão ${version.versao}`;
          }
        }

        const days = [
          { d: 1, n: "Segunda" },
          { d: 2, n: "Terça" },
          { d: 3, n: "Quarta" },
          { d: 4, n: "Quinta" },
          { d: 5, n: "Sexta" },
          { d: 6, n: "Sábado" },
        ].filter((day) => includeSaturday || day.d !== 6);

        const toRgbArray = (hexColor, fallback = [255, 255, 255]) => {
          if (!hexColor || typeof hexColor !== "string") return fallback;
          let value = hexColor.replace("#", "").trim();
          if (value.length === 3) {
            value = value
              .split("")
              .map((char) => char + char)
              .join("");
          }
          if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
          return [
            parseInt(value.slice(0, 2), 16),
            parseInt(value.slice(2, 4), 16),
            parseInt(value.slice(4, 6), 16),
          ];
        };

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
        const pageWidth =
          doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
        const pageHeight =
          doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

        doc.setFillColor(255, 255, 255);
        doc.rect(
          0,
          0,
          pageWidth,
          doc.internal.pageSize.height || doc.internal.pageSize.getHeight(),
          "F",
        );

        doc.setFont(undefined, "bold");
        doc.setFontSize(14);
        doc.text(
          teacher?.name || "Professor não informado",
          pageWidth / 2,
          10,
          {
            align: "center",
          },
        );

        doc.setFont(undefined, "normal");
        doc.setFontSize(9);
        doc.text(school?.name || "Escola não informada", pageWidth / 2, 15, {
          align: "center",
        });

        doc.setFontSize(7);
        doc.text(versionText, pageWidth / 2, 19, { align: "center" });

        const buildPeriodBody = (periodType) => {
          const periodConfig = calendar.scheduleConfig[periodType];
          if (
            !periodConfig ||
            periodConfig.periodsPerDay === 0 ||
            !periodConfig.periods ||
            periodConfig.periods.length === 0
          ) {
            return [];
          }

          const teacherSchedules = schedulesToUse.filter(
            (s) => s.teacherId === teacherId,
          );

          return periodConfig.periods.map((period) => {
            const row = [
              {
                content: `${period.startTime || "--:--"} - ${period.endTime || "--:--"}`,
                styles: {
                  fontStyle: "bold",
                  fillColor: [255, 255, 255],
                  halign: "center",
                  valign: "middle",
                },
              },
            ];

            days.forEach((day) => {
              const schedule = teacherSchedules.find(
                (s) =>
                  s.dayOfWeek === day.d && s.startTime === period.startTime,
              );

              if (schedule?.classId && schedule?.subjectId) {
                const cls = state.classes.find(
                  (c) => c.id === schedule.classId,
                );
                const subject = state.subjects.find(
                  (s) => s.id === schedule.subjectId,
                );
                const bgHex = cls?.color || "#ffffff";
                const textHex = getContrastColor(bgHex);

                row.push({
                  content: `${cls?.name || ""}\n${subject?.name || ""}`.trim(),
                  styles: {
                    fillColor: toRgbArray(bgHex),
                    textColor: toRgbArray(textHex, [0, 0, 0]),
                    fontStyle: "bold",
                    halign: "center",
                    valign: "middle",
                  },
                });
                return;
              }

              if (schedule?.visualText) {
                row.push({
                  content: schedule.visualText,
                  styles: {
                    fillColor: [245, 245, 245],
                    textColor: [80, 80, 80],
                    fontStyle: "bold",
                    halign: "center",
                    valign: "middle",
                  },
                });
                return;
              }

              row.push({
                content: "",
                styles: {
                  fillColor: [255, 255, 255],
                  halign: "center",
                  valign: "middle",
                },
              });
            });

            return row;
          });
        };

        const head = [["Horário", ...days.map((d) => d.n)]];
        const fullMorningBody = buildPeriodBody("morning");
        const fullAfternoonBody = buildPeriodBody("afternoon");

        const morningBody =
          selectedPeriod === "both" || selectedPeriod === "morning"
            ? fullMorningBody
            : [];
        const afternoonBody =
          selectedPeriod === "both" || selectedPeriod === "afternoon"
            ? fullAfternoonBody
            : [];

        const selectedSections =
          (morningBody.length > 0 ? 1 : 0) + (afternoonBody.length > 0 ? 1 : 0);
        const totalRows = morningBody.length + afternoonBody.length;

        // Calcular espaço do cabeçalho (do início até a versão)
        const headerEndY = 21; // Aproximadamente onde termina o cabeçalho
        const bottomMargin = 3;
        const tailSpaceForHeaders = selectedSections * 4; // Espaço dos títulos de períodos
        const interSectionGap = selectedSections > 1 ? 3 : 0;

        // Espaço total disponível para as tabelas (85% do restante)
        const usableHeight = pageHeight - headerEndY - bottomMargin;
        const availableRowsHeight = Math.floor(
          usableHeight * 0.85 - tailSpaceForHeaders - interSectionGap,
        );

        // Calcular dimensões dinâmicas baseadas no espaço disponível
        let adaptiveFontSize = 8;
        let adaptiveCellPadding = 0.8;
        let adaptiveMinCellHeight = 8;
        let adaptiveHeadMinCellHeight = 8;

        if (totalRows > 0) {
          const targetRowHeight = availableRowsHeight / totalRows;
          adaptiveMinCellHeight = Math.max(7, Math.min(18, targetRowHeight));
          adaptiveHeadMinCellHeight = adaptiveMinCellHeight;
          adaptiveFontSize = Math.max(
            6.5,
            Math.min(9, adaptiveMinCellHeight * 0.7),
          );
          adaptiveCellPadding = Math.max(
            0.6,
            Math.min(1.5, adaptiveMinCellHeight * 0.1),
          );
        }

        let startY = 22;

        // Calcular larguras das colunas dinamicamente baseadas no número de dias
        const numDays = days.length;
        const horarioColWidth = 26;
        const availableWidth = pageWidth - 12; // margins left+right = 6+6
        const dayColWidth = (availableWidth - horarioColWidth) / numDays;

        const columnStyles = { 0: { cellWidth: horarioColWidth } };
        for (let i = 0; i < numDays; i++) {
          columnStyles[i + 1] = { cellWidth: dayColWidth };
        }

        if (morningBody.length > 0) {
          doc.setFont(undefined, "bold");
          doc.setFontSize(9);
          doc.text("Período da Manhã", 8, startY);
          doc.autoTable({
            startY: startY + 2,
            head,
            body: morningBody,
            theme: "grid",
            margin: { left: 6, right: 6 },
            tableWidth: "auto",
            styles: {
              fontSize: adaptiveFontSize,
              cellPadding: adaptiveCellPadding,
              overflow: "linebreak",
              valign: "middle",
              halign: "center",
              textColor: [0, 0, 0],
              minCellHeight: adaptiveMinCellHeight,
            },
            headStyles: {
              fillColor: [230, 230, 230],
              textColor: [0, 0, 0],
              fontStyle: "bold",
              halign: "center",
              valign: "middle",
              minCellHeight: adaptiveHeadMinCellHeight,
            },
            columnStyles,
            rowPageBreak: "avoid",
          });
          startY = doc.lastAutoTable.finalY + 3;
        }

        if (afternoonBody.length > 0) {
          doc.setFont(undefined, "bold");
          doc.setFontSize(9);
          doc.text("Período da Tarde", 8, startY);
          doc.autoTable({
            startY: startY + 2,
            head,
            body: afternoonBody,
            theme: "grid",
            margin: { left: 6, right: 6 },
            tableWidth: "auto",
            styles: {
              fontSize: adaptiveFontSize,
              cellPadding: adaptiveCellPadding,
              overflow: "linebreak",
              valign: "middle",
              halign: "center",
              textColor: [0, 0, 0],
              minCellHeight: adaptiveMinCellHeight,
            },
            headStyles: {
              fillColor: [230, 230, 230],
              textColor: [0, 0, 0],
              fontStyle: "bold",
              halign: "center",
              valign: "middle",
              minCellHeight: adaptiveHeadMinCellHeight,
            },
            columnStyles,
            rowPageBreak: "avoid",
          });
        }

        if (morningBody.length === 0 && afternoonBody.length === 0) {
          CustomSwal.fire(
            "Atenção",
            "Não há horários configurados para o período selecionado.",
            "warning",
          );
          return;
        }

        const safeTeacherName = (teacher?.name || "Professor")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_\u00C0-\u00FF-]/g, "");
        const dateStr = new Date().toISOString().split("T")[0];
        doc.save(`Grade_Horaria_${safeTeacherName}_${dateStr}.pdf`);
      };

      const loadTeachers = () => {
        const schoolId = schoolSelect.value;
        teacherSelectContainer.innerHTML = "";
        gridContainer.innerHTML = "";
        if (!schoolId) return;

        const teacherOptions = state.teachers
          .map((t) => `<option value="${t.id}">${t.name}</option>`)
          .join("");
        teacherSelectContainer.innerHTML = `
            <div>
                 <label for="grid-teacher-select" class="block text-lg font-bold mb-3">2. Selecione o Professor</label>
                 <select id="grid-teacher-select" class="form-select">
                    <option value="">-- Selecione --</option>
                    ${teacherOptions}
                 </select>
            </div>`;

        if (params && params.teacherId) {
          setTimeout(() => {
            const teacherSelect = teacherSelectContainer.querySelector(
              "#grid-teacher-select",
            );
            if (teacherSelect) {
              teacherSelect.value = params.teacherId;
              teacherSelect.dispatchEvent(
                new Event("change", {
                  bubbles: true,
                }),
              );
              params.teacherId = null;
            }
          }, 0);
        }
      };

      schoolSelect.addEventListener("change", loadTeachers);

      if (params && params.schoolId) {
        schoolSelect.dispatchEvent(new Event("change"));
      }

      container.addEventListener("change", (e) => {
        if (
          e.target.id === "grid-teacher-select" ||
          e.target.id === "version-select"
        ) {
          const schoolId = schoolSelect.value;
          const teacherSelect = container.querySelector("#grid-teacher-select");
          const teacherId = teacherSelect?.value;
          const versionSelect = container.querySelector("#version-select");
          const versao = versionSelect?.value || null;

          if (schoolId && teacherId) {
            gridContainer.innerHTML = renderScheduleGrid(
              schoolId,
              teacherId,
              versao,
            );
          } else {
            gridContainer.innerHTML = "";
          }
        }
      });

      container.addEventListener("click", (e) => {
        if (e.target.closest("#btn-print-teacher-schedule")) {
          generateTeacherSchedulePdf();
          return;
        }

        if (e.target.closest("#btn-manage-versions")) {
          openManageVersionsModal();
          return;
        }

        const cell = e.target.closest(".schedule-cell");
        if (cell) {
          const schoolId = schoolSelect.value;
          const teacherSelect = container.querySelector("#grid-teacher-select");
          const teacherId = teacherSelect?.value;

          const activeTabButton = gridContainer.querySelector(
            "#grid-tabs .page-tab.active",
          );
          const activeTabName = activeTabButton
            ? activeTabButton.dataset.tab
            : "morning";

          if (!schoolId || !teacherId) {
            CustomSwal.fire(
              "Atenção",
              "Selecione uma escola e um professor para editar a grade.",
              "warning",
            );
            return;
          }

          openScheduleCellModal({
            schoolId,
            teacherId,
            dayOfWeek: cell.dataset.dayOfWeek,
            startTime: cell.dataset.startTime,
            endTime: cell.dataset.endTime,
            scheduleId: cell.dataset.scheduleId,
            activeTab: activeTabName,
          });
        } else if (e.target.closest(".page-tab")) {
          const tab = e.target.closest(".page-tab");
          gridContainer
            .querySelectorAll(".page-tab")
            .forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");

          gridContainer
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.add("hidden"));
          const tabName = tab.dataset.tab;
          gridContainer
            .querySelector(`#${tabName}_grid_content`)
            .classList.remove("hidden");
        }
      });
    }

    // --- 13. REPORTS (RELAT�RIOS) ---
    if (pageId === "reports") {
      const reportsTabsContainer = mainContent.querySelector("#reports-tabs");
      reportsTabsContainer?.addEventListener("click", (e) => {
        const tab = e.target.closest(".page-tab");
        if (!tab) return;

        reportsTabsContainer
          .querySelectorAll(".page-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        mainContent
          .querySelectorAll(".reports-tab-content")
          .forEach((content) => content.classList.add("hidden"));

        const tabName = tab.dataset.tab;
        mainContent
          .querySelector(`#reports-${tabName}-content`)
          ?.classList.remove("hidden");
      });

      mainContent
        .querySelector("#btn-generate-classlist-report")
        ?.addEventListener("click", generateClassListReport);
      mainContent
        .querySelector("#btn-generate-class-report")
        ?.addEventListener("click", generateClassReport);
      mainContent
        .querySelector("#btn-generate-laudados-report")
        ?.addEventListener("click", generateLaudadosReport);
      mainContent
        .querySelector("#btn-generate-complete-log-report")
        ?.addEventListener("click", generateCompleteLogReport);

      mainContent
        .querySelector("#btn-generate-planning-report")
        ?.addEventListener("click", async () => {
          const courseId = mainContent.querySelector(
            "#report-course-select",
          ).value;
          const termValue = mainContent.querySelector(
            "#report-term-select",
          ).value;
          if (!courseId || !termValue) {
            CustomSwal.fire(
              "Atenção",
              "Selecione uma turma/disciplina e um período para gerar o relatório de planejamento.",
              "warning",
            );
            return;
          }
          const course = getUniqueCourses().find((c) => c.id === courseId);
          if (!course) return;
          const result = await CustomSwal.fire({
            title: "Imprimir Planejamento",
            html: `
              <div class="text-left space-y-3">
                <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-[var(--stripe-color)]">
                  <input type="radio" name="print-option-report" value="completo" checked />
                  <span><strong>Completo</strong><br><span class="text-sm text-secondary">Mostrar todos os temas e aulas</span></span>
                </label>
                <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-[var(--stripe-color)]">
                  <input type="radio" name="print-option-report" value="concluidos" />
                  <span><strong>Temas Concluídos</strong><br><span class="text-sm text-secondary">Apenas temas com 100% concluído</span></span>
                </label>
                <label class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-[var(--stripe-color)]">
                  <input type="radio" name="print-option-report" value="nao-abordados" />
                  <span><strong>Temas Não Abordados</strong><br><span class="text-sm text-secondary">Apenas temas com 0% concluído</span></span>
                </label>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "Gerar PDF",
            cancelButtonText: "Cancelar",
            preConfirm: () => {
              const selected = document.querySelector(
                'input[name="print-option-report"]:checked',
              )?.value;
              return selected || "completo";
            },
          });
          if (!result.isConfirmed) return;
          await generatePlanningPDF(course.classId, termValue, result.value);
        });

      mainContent
        .querySelector("#btn-generate-grades-report")
        ?.addEventListener("click", () => {
          const type = document.getElementById("grades-report-type").value;
          if (type === "averages") {
            generateAveragesReport();
          } else if (type === "assessments") {
            generateAssessmentsReport();
          } else if (type === "bulletins") {
            generateDetailedBulletinReport(); // Centralizado: Gera Individual ou Coletivo
          }
        });

      mainContent
        .querySelector("#btn-generate-grades-excel-report")
        ?.addEventListener("click", () => {
          const type = document.getElementById("grades-report-type").value;
          if (type === "averages") {
            generateAveragesExcelReport();
          } else if (type === "assessments") {
            const courseId = document.getElementById(
              "grades-report-course-select",
            ).value;
            const termKey = document.getElementById(
              "grades-report-term-select",
            ).value;
            const course = getUniqueCourses().find((c) => c.id === courseId);
            generateAssessmentsExcel(course, termKey);
          } else if (type === "bulletins") {
            generateDetailedBulletinExcelReport();
          }
        });

      const populateTermSelect = (courseId, termSelectElement) => {
        if (!courseId) {
          termSelectElement.innerHTML =
            '<option value="">-- Primeiro selecione a turma --</option>';
          termSelectElement.disabled = true;
          return;
        }

        const course = getUniqueCourses().find((c) => c.id === courseId);
        const schoolCalendar = state.calendars[course.schoolId];

        if (schoolCalendar && schoolCalendar.terms?.length > 0) {
          const termOptions = schoolCalendar.terms
            .filter((term) => term.startDate && term.endDate)
            .map((term) => {
              const termName = `${term.id}º ${schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre"}`;
              return `<option value="${term.startDate}|${term.endDate}">${termName}</option>`;
            })
            .join("");
          termSelectElement.innerHTML = `<option value="">Selecione o período...</option>${termOptions}`;
          termSelectElement.disabled = false;

          // Seleciona automaticamente o bimestre/trimestre vigente
          const currentTerm = getCurrentTerm(schoolCalendar, new Date());
          if (currentTerm) {
            const currentTermValue = `${currentTerm.startDate}|${currentTerm.endDate}`;
            if (
              termSelectElement.querySelector(`[value="${currentTermValue}"]`)
            ) {
              termSelectElement.value = currentTermValue;
            }
          }
        } else {
          termSelectElement.innerHTML =
            '<option value="">-- Nenhum período cadastrado para esta escola --</option>';
          termSelectElement.disabled = true;
        }
      };

      const populateStudentSelect = (courseId, studentSelectElement) => {
        if (!courseId) {
          studentSelectElement.innerHTML = "";
          studentSelectElement.disabled = true;
          return;
        }
        const course = getUniqueCourses().find((c) => c.id === courseId);
        const students = getStudentsForClass(
          course.classId,
          isReportOnlyActiveStudentsEnabled(),
          "name",
        );

        studentSelectElement.innerHTML = students
          .map((s) => `<option value="${s.id}">${s.name}</option>`)
          .join("");
        studentSelectElement.disabled = false;
      };

      mainContent
        .querySelector("#report-course-select")
        ?.addEventListener("change", (e) => {
          populateTermSelect(
            e.target.value,
            mainContent.querySelector("#report-term-select"),
          );
        });

      const gradesCourseSelect = mainContent.querySelector(
        "#grades-report-course-select",
      );
      gradesCourseSelect?.addEventListener("change", (e) => {
        populateTermSelect(
          e.target.value,
          mainContent.querySelector("#grades-report-term-select"),
        );
        populateStudentSelect(
          e.target.value,
          mainContent.querySelector("#grades-report-student-select"),
        );
      });

      mainContent
        .querySelector("#grades-report-type")
        ?.addEventListener("change", (e) => {
          const termSelectDiv = mainContent.querySelector(
            "#grades-report-filters > div:first-child",
          );
          // Esconde o seletor de período se for Médias (Anual) OU Boletins (Anual)
          const shouldShowTerm = e.target.value === "assessments";
          if (termSelectDiv) {
            termSelectDiv.style.display = shouldShowTerm ? "block" : "none";
          }

          if (shouldShowTerm) {
            populateTermSelect(
              gradesCourseSelect.value,
              mainContent.querySelector("#grades-report-term-select"),
            );
          }
        });

      mainContent
        .querySelectorAll('input[name="grades-report-format"]')
        .forEach((radio) => {
          radio.addEventListener("change", (e) => {
            const studentSelectorContainer = mainContent.querySelector(
              "#grades-report-student-selector-container",
            );
            studentSelectorContainer.classList.toggle(
              "hidden",
              e.target.value !== "individual",
            );
          });
        });

      const populateAbsenceStudentSelect = (courseId) => {
        const studentSelect = absenceStudentSelect;
        if (!studentSelect) return;

        if (!courseId) {
          studentSelect.innerHTML =
            '<option value="all">Todos os alunos</option>';
          studentSelect.disabled = true;
          return;
        }

        const selectedCourse = getUniqueCourses().find(
          (course) => course.id === courseId,
        );
        if (!selectedCourse) return;

        const students = getStudentsForClass(
          selectedCourse.classId,
          isReportOnlyActiveStudentsEnabled(),
          "number",
        );

        const studentOptions = students
          .map(
            (student) =>
              `<option value="${student.id}">${student.number || "-"} - ${student.name}</option>`,
          )
          .join("");

        studentSelect.innerHTML = `<option value="all">Todos os alunos</option>${studentOptions}`;
        studentSelect.disabled = false;
        studentSelect.value = "all";
      };

      mainContent
        .querySelector("#report-active-students-only")
        ?.addEventListener("change", () => {
          if (gradesCourseSelect?.value) {
            populateStudentSelect(
              gradesCourseSelect.value,
              mainContent.querySelector("#grades-report-student-select"),
            );
          }

          if (absenceCourseSelect?.value) {
            populateAbsenceStudentSelect(absenceCourseSelect.value);
          }
        });

      mainContent
        .querySelector("#laudados-school-select")
        ?.addEventListener("change", (e) => {
          const schoolId = e.target.value;
          const classSelect = mainContent.querySelector(
            "#laudados-class-select",
          );
          if (!schoolId) {
            classSelect.innerHTML =
              '<option value="">-- Primeiro selecione a escola --</option>';
            classSelect.disabled = true;
            return;
          }

          const classOptions = state.classes
            .filter((c) => c.schoolId === schoolId)
            .map((c) => `<option value="${c.id}">${c.name}</option>`)
            .join("");

          classSelect.innerHTML = `<option value="">Todas as Turmas da Escola</option>${classOptions}`;
          classSelect.disabled = false;
        });

      if (gradesCourseSelect) {
        mainContent
          .querySelector("#grades-report-type")
          .dispatchEvent(new Event("change"));
      }

      // --- Eventos para o relatório de Baixa Frequência ---
      mainContent
        .querySelector("#btn-generate-low-freq-report")
        ?.addEventListener("click", generateLowFrequencyReport);

      mainContent
        .querySelector("#btn-generate-absence-content-report")
        ?.addEventListener("click", generateAbsenceContentReport);

      const absenceCourseSelect = mainContent.querySelector(
        "#absence-report-course-select",
      );
      const absenceStudentSelect = mainContent.querySelector(
        "#absence-report-student-select",
      );

      absenceCourseSelect?.addEventListener("change", (e) => {
        populateTermSelect(
          e.target.value,
          mainContent.querySelector("#absence-report-term-select"),
        );
        populateAbsenceStudentSelect(e.target.value);
      });

      absenceStudentSelect?.addEventListener("change", (e) => {
        const selectedValues = Array.from(e.target.selectedOptions).map(
          (opt) => opt.value,
        );
        const allOption = e.target.querySelector('option[value="all"]');

        if (!allOption) return;

        if (selectedValues.length === 0) {
          allOption.selected = true;
          return;
        }

        if (selectedValues.includes("all") && selectedValues.length > 1) {
          Array.from(e.target.options).forEach((option) => {
            if (option.value !== "all") option.selected = false;
          });
        } else if (!selectedValues.includes("all")) {
          allOption.selected = false;
        }
      });

      mainContent
        .querySelector("#low-freq-school-select")
        ?.addEventListener("change", (e) => {
          const schoolId = e.target.value;
          const classSelect = mainContent.querySelector(
            "#low-freq-class-select",
          );
          const termSelect = mainContent.querySelector("#low-freq-term-select");

          // Lógica para popular o seletor de turmas
          if (classSelect) {
            if (!schoolId) {
              classSelect.innerHTML = "";
              classSelect.disabled = true;
            } else {
              const classOptions = state.classes
                .filter((c) => c.schoolId === schoolId)
                .map((c) => `<option value="${c.id}">${c.name}</option>`)
                .join("");
              classSelect.innerHTML = classOptions;
              classSelect.disabled = false;
            }
          }

          // Lógica para popular o seletor de períodos
          if (termSelect) {
            if (!schoolId) {
              termSelect.innerHTML =
                '<option value="all">Ano Letivo Completo</option>';
              termSelect.disabled = true;
            } else {
              const schoolCalendar = state.calendars[schoolId];
              if (schoolCalendar && schoolCalendar.terms?.length > 0) {
                const termOptions = schoolCalendar.terms
                  .filter((term) => term.startDate && term.endDate)
                  .map((term) => {
                    const termName = `${term.id}º ${schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre"}`;
                    return `<option value="${term.startDate}|${term.endDate}">${termName}</option>`;
                  })
                  .join("");
                termSelect.innerHTML = `<option value="all">Ano Letivo Completo</option>${termOptions}`;
                termSelect.disabled = false;

                // Seleciona automaticamente o bimestre/trimestre vigente
                const currentTerm = getCurrentTerm(schoolCalendar, new Date());
                if (currentTerm) {
                  const currentTermValue = `${currentTerm.startDate}|${currentTerm.endDate}`;
                  if (
                    termSelect.querySelector(`[value="${currentTermValue}"]`)
                  ) {
                    termSelect.value = currentTermValue;
                  }
                }
              } else {
                termSelect.innerHTML =
                  '<option value="all">Ano Letivo Completo</option>';
                termSelect.disabled = true;
              }
            }
          }
        });

      // --- Eventos para Relatório de Notas Vermelhas ---
      mainContent
        .querySelector("#btn-generate-red-grades-report")
        ?.addEventListener("click", generateRedGradesReport);

      mainContent
        .querySelector("#btn-generate-red-grades-excel-report")
        ?.addEventListener("click", generateRedGradesExcelReport);

      const redGradesClassSelect = mainContent.querySelector(
        "#red-grades-class-select",
      );
      const redGradesTermSelect = mainContent.querySelector(
        "#red-grades-term-select",
      );
      const redGradesCriteriaContainer = mainContent.querySelector(
        "#red-grades-criteria-container",
      );
      const redGradesCriteriaSelect = mainContent.querySelector(
        "#red-grades-criteria-select",
      );
      const redGradesClassLabel = mainContent.querySelector(
        "#red-grades-class-label",
      );
      const redGradesClassHelp = mainContent.querySelector(
        "#red-grades-class-help",
      );

      const getRedGradesScopeMode = () => {
        const selected = mainContent.querySelector(
          'input[name="red-grades-scope"]:checked',
        );
        return selected?.value || "multi";
      };

      const resetRedGradesCriteria = (
        placeholder = "-- Selecione turma e período --",
      ) => {
        if (!redGradesCriteriaSelect) return;
        redGradesCriteriaSelect.innerHTML = `<option value="">${placeholder}</option>`;
        redGradesCriteriaSelect.disabled = true;
      };

      const updateRedGradesModeUi = () => {
        if (!redGradesClassSelect) return;

        const mode = getRedGradesScopeMode();
        const isSingleMode = mode === "single";

        redGradesClassSelect.multiple = !isSingleMode;
        redGradesClassSelect.size = isSingleMode ? 1 : 3;

        if (redGradesClassLabel) {
          redGradesClassLabel.textContent = isSingleMode ? "Turma" : "Turma(s)";
        }

        if (redGradesClassHelp) {
          redGradesClassHelp.textContent = isSingleMode
            ? "Selecione uma única turma."
            : "Ctrl/Cmd + Clique";
        }

        if (redGradesCriteriaContainer) {
          redGradesCriteriaContainer.classList.toggle("hidden", !isSingleMode);
        }

        if (!isSingleMode) {
          resetRedGradesCriteria("-- Não se aplica para várias turmas --");
        }
      };

      const updateRedGradesCriteriaOptions = () => {
        const mode = getRedGradesScopeMode();
        if (mode !== "single") return;

        if (!redGradesClassSelect || !redGradesTermSelect) return;

        const selectedClassId = redGradesClassSelect.value;
        const termKey = redGradesTermSelect.value;

        if (!selectedClassId || !termKey) {
          resetRedGradesCriteria();
          return;
        }

        if (termKey === "5th-council") {
          resetRedGradesCriteria(
            "-- 5º Conselho não possui critérios por avaliação --",
          );
          return;
        }

        const criteria = getRedGradesCriteriaForSingleClass(
          selectedClassId,
          termKey,
        );

        if (!criteria.length) {
          resetRedGradesCriteria(
            "-- Nenhum critério encontrado para o período --",
          );
          return;
        }

        redGradesCriteriaSelect.innerHTML = [
          '<option value="">-- Selecione o critério --</option>',
          ...criteria.map(
            (criterion) =>
              `<option value="${criterion.value}">${escapeHtml(criterion.label)}</option>`,
          ),
        ].join("");
        redGradesCriteriaSelect.disabled = false;
      };

      mainContent
        .querySelectorAll('input[name="red-grades-scope"]')
        .forEach((radio) => {
          radio.addEventListener("change", () => {
            updateRedGradesModeUi();
            updateRedGradesCriteriaOptions();
          });
        });

      mainContent
        .querySelector("#red-grades-school-select")
        ?.addEventListener("change", (e) => {
          const schoolId = e.target.value;
          const classSelect = mainContent.querySelector(
            "#red-grades-class-select",
          );
          const termSelect = mainContent.querySelector(
            "#red-grades-term-select",
          );

          if (!schoolId) {
            classSelect.innerHTML = "";
            classSelect.disabled = true;
            termSelect.innerHTML =
              '<option value="">-- Selecione a Escola --</option>';
            termSelect.disabled = true;
            resetRedGradesCriteria();
          } else {
            // Popula turmas
            const classOptions = state.classes
              .filter((c) => c.schoolId === schoolId)
              .map((c) => `<option value="${c.id}">${c.name}</option>`)
              .join("");
            classSelect.innerHTML = classOptions;
            classSelect.disabled = false;

            // Popula períodos
            const schoolCalendar = state.calendars[schoolId];
            let termOptions = "";

            if (schoolCalendar && schoolCalendar.terms?.length > 0) {
              termOptions = schoolCalendar.terms
                .filter((term) => term.startDate && term.endDate)
                .map((term) => {
                  const termName = `${term.id}º ${schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre"}`;
                  return `<option value="${term.startDate}|${term.endDate}">${termName}</option>`;
                })
                .join("");
            }

            // ADICIONA OPÇÃO DO 5º CONSELHO
            termOptions += `<option value="5th-council">5º Conselho (Final)</option>`;

            termSelect.innerHTML = `<option value="">Selecione o período...</option>${termOptions}`;
            termSelect.disabled = false;

            // Seleciona automaticamente o bimestre/trimestre vigente
            if (schoolCalendar) {
              const currentTerm = getCurrentTerm(schoolCalendar, new Date());
              if (currentTerm) {
                const currentTermValue = `${currentTerm.startDate}|${currentTerm.endDate}`;
                if (termSelect.querySelector(`[value="${currentTermValue}"]`)) {
                  termSelect.value = currentTermValue;
                }
              }
            }

            updateRedGradesModeUi();
            updateRedGradesCriteriaOptions();
          }
        });

      redGradesClassSelect?.addEventListener("change", () => {
        updateRedGradesCriteriaOptions();
      });

      redGradesTermSelect?.addEventListener("change", () => {
        updateRedGradesCriteriaOptions();
      });

      updateRedGradesModeUi();
      resetRedGradesCriteria();
    }
  };

  const generateDetailedBulletinReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    // Obtém valores dos seletores da interface
    const courseId = document.getElementById(
      "grades-report-course-select",
    ).value;
    const format = document.querySelector(
      'input[name="grades-report-format"]:checked',
    ).value;
    const studentSelect = document.getElementById(
      "grades-report-student-select",
    );
    const selectedStudentIds = Array.from(studentSelect.selectedOptions).map(
      (opt) => opt.value,
    );

    // Validações básicas
    if (!courseId) {
      CustomSwal.fire("Atenção", "Selecione uma turma/disciplina.", "warning");
      return;
    }
    // Carrega dados necessários
    const course = getUniqueCourses().find((c) => c.id === courseId);
    const cls = state.classes.find((c) => c.id === course.classId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const subject = state.subjects.find((s) => s.id === course.subjectId);
    const subjectName = subject ? subject.name : "Disciplina não encontrada";
    const scheduleEntry = getScheduleEntryForCourse(
      course,
      new Date().toISOString().split("T")[0],
    );
    const teacher = scheduleEntry
      ? state.teachers.find((t) => t.id === scheduleEntry.teacherId)
      : null;
    const schoolCalendar = state.calendars[school.id];

    if (
      !schoolCalendar ||
      !schoolCalendar.terms ||
      schoolCalendar.terms.length === 0
    ) {
      CustomSwal.fire(
        "Dados Incompletos",
        "O calendário para a escola desta turma não foi configurado.",
        "error",
      );
      return;
    }

    const terms = schoolCalendar.terms
      .filter((t) => t.startDate && t.endDate)
      .sort((a, b) => a.id - b.id);
    const termTypeName =
      schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre";

    // Mapa de abreviações para Situação Final
    const situationMap = {
      Aprovado: "Aprovado",
      "Aprovado pelo conselho": "Ap. Cons.",
      "Aprovado pelo Conselho": "Ap. Cons.",
      "Retido por frequência": "Ret. Freq.",
      "Retido por rendimento": "Ret. Rend.",
      "Retido por frequência e rendimento": "Ret. Freq. Rend.",
      Pendente: "Pendente",
    };

    if (format === "coletivo") {
      // --- FORMATO COLETIVO (TABELA GERAL) ---
      const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
      const pageWidth =
        doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

      // Função de rodapé
      const drawFooter = (data) => {
        const pageHeight =
          doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerY = pageHeight - 10;
        doc.text(
          `Boletim Geral da Turma - Emitido em ${new Date().toLocaleDateString()}`,
          data.settings.margin.left,
          footerY,
        );
        doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
          align: "center",
        });
        doc.text(
          `Página ${data.pageNumber}`,
          pageWidth - data.settings.margin.right,
          footerY,
          { align: "right" },
        );
        doc.setTextColor(0);
      };

      // Cabeçalho do Documento
      doc.setFontSize(16);
      doc.text("Boletim Geral (Notas e Frequência Detalhada)", 14, 15);
      doc.setFontSize(10);
      const schoolYear = new Date(terms[0].startDate).getFullYear();
      doc.text(`Ano Letivo: ${schoolYear}`, 14, 21);
      doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 26);
      doc.text(`Turma: ${cls.name} - Disciplina: ${subjectName}`, 14, 31);
      doc.text(`Professor(a): ${teacher?.name || "N/D"}`, 14, 36);

      // --- CONSTRU�!ÒO DO CABE�!ALHO DA TABELA ---

      // Linha 1: Títulos Superiores
      const headerRow1 = [
        {
          content: "Nº",
          rowSpan: 2,
          styles: { valign: "middle", halign: "center", fontStyle: "bold" },
        },
        {
          content: "Aluno",
          rowSpan: 2,
          styles: { valign: "middle", halign: "left", fontStyle: "bold" },
        },
      ];

      // Linha 2: Colunas de Detalhe
      const headerRow2 = [];

      // Rastreamento dos índices das colunas espaçadoras
      const spacerColumnIndices = [];
      let currentColumnIndex = 2;

      // Adiciona colunas para cada período
      terms.forEach((term, index) => {
        headerRow1.push({
          content: `${term.id}º ${termTypeName}`,
          colSpan: 4,
          styles: { halign: "center", fontStyle: "bold" },
        });

        headerRow2.push("Média", "F", "% Aus", "F/J");
        currentColumnIndex += 4;

        if (index < terms.length - 1) {
          headerRow1.push({
            content: "",
            rowSpan: 2,
            styles: { cellWidth: 2 },
          });

          spacerColumnIndices.push(currentColumnIndex);
          currentColumnIndex += 1;
        }
      });

      // Adiciona Espaçador antes do Resultado Final
      headerRow1.push({ content: "", rowSpan: 2, styles: { cellWidth: 2 } });
      spacerColumnIndices.push(currentColumnIndex);
      currentColumnIndex += 1;

      // Adiciona colunas para o Resultado Final
      headerRow1.push({
        content: "Resultado Final",
        colSpan: 4,
        styles: { halign: "center", fontStyle: "bold" },
      });
      headerRow2.push("Média", "Total F", "Total %", "Situação");

      // --- CONSTRU�!ÒO DO CORPO DA TABELA ---
      const students = getStudentsForClass(
        course.classId,
        isReportOnlyActiveStudentsEnabled(),
      );

      const body = students.map((student) => {
        const row = [
          student.number || "-",
          buildPdfStudentNameCell(student, cls?.name || ""),
        ];

        terms.forEach((term, index) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          const grade = getDefinitiveGrade(student.id, course.id, termKey);
          const attendance = getTermAttendance(student, course, term);

          // CORRE�!ÒO: Uso de || 0 para evitar erro de undefined
          row.push(grade !== null ? formatGradeValue(grade) : "--");
          row.push((attendance.absences || 0).toString());
          row.push(`${(attendance.absencePercentage || 0).toFixed(0)}%`);
          row.push((attendance.excusedAbsences || 0).toString());

          if (index < terms.length - 1) {
            row.push("");
          }
        });

        row.push("");

        const finalResult = getFinalResult(student.id, course);

        // Use consolidated attendance from all classes for transferred students
        const schoolCalendar = state.calendars[course.schoolId];
        const termStart =
          schoolCalendar.terms[0]?.startDate ||
          new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
        const termEnd =
          schoolCalendar.terms[schoolCalendar.terms.length - 1]?.endDate ||
          new Date(new Date().getFullYear(), 11, 31)
            .toISOString()
            .split("T")[0];
        const consolidatedData = calculateConsolidatedAttendance(
          student.id,
          course.subjectId,
          termStart,
          termEnd,
          course.schoolId,
        );

        const finalAverage =
          finalResult.finalGrade !== null
            ? formatGradeValue(finalResult.finalGrade)
            : "--";

        // CORRE�!ÒO: Uso de || 0
        row.push(finalAverage);
        row.push((consolidatedData.absences || 0).toString());
        row.push(`${(100 - consolidatedData.frequency || 0).toFixed(0)}%`);

        const savedResultKey = `${student.id}_${course.id}`;
        const savedSituation = state.finalResults[savedResultKey]?.situation;
        const effectiveSituation = savedSituation || finalResult.situation;
        let situacaoDisplay =
          situationMap[effectiveSituation] || effectiveSituation;

        if (!situationMap[effectiveSituation]) {
          if (effectiveSituation.includes("Aprovado"))
            situacaoDisplay = "Aprov.";
          else if (effectiveSituation.includes("Retido"))
            situacaoDisplay = "Retido";
        }
        row.push(situacaoDisplay);

        return row;
      });

      // Estilos
      const columnStyles = {
        0: { cellWidth: 8 },
        1: { halign: "left", cellWidth: "auto" },
      };

      spacerColumnIndices.forEach((index) => {
        columnStyles[index] = { cellWidth: 2 };
      });

      const lastColIndex = body.length > 0 ? body[0].length - 1 : 0;
      columnStyles[lastColIndex] = { fontStyle: "bold", cellWidth: 15 };

      doc.autoTable({
        startY: 40,
        head: [headerRow1, headerRow2],
        body: body,
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 1,
          halign: "center",
          valign: "middle",
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: themeColor,
          textColor: 255,
          lineWidth: 0.1,
          lineColor: [255, 255, 255],
        },
        alternateRowStyles: {
          fillColor: "#dadada",
        },
        columnStyles: columnStyles,
        didDrawPage: drawFooter,
        didParseCell: (data) => {
          if (spacerColumnIndices.includes(data.column.index)) {
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineColor = [255, 255, 255];
            if (data.section === "head") {
              data.cell.styles.fillColor = [255, 255, 255];
            }
            return;
          }

          if (data.section === "body") {
            const lastIndex = lastColIndex;
            const finalGradeColIndex = lastIndex - 3;

            if (data.column.index === lastIndex) {
              const text = data.cell.text[0];
              if (text.startsWith("Aprov") || text.startsWith("Ap.")) {
                data.cell.styles.textColor = "#2980b9";
                data.cell.styles.fontStyle = "bold";
              } else if (text.startsWith("Ret") || text.startsWith("Repr")) {
                data.cell.styles.textColor = "#e74c3c";
                data.cell.styles.fontStyle = "bold";
              }
            }

            const isGradeColumn =
              data.column.index === 2 ||
              spacerColumnIndices.includes(data.column.index - 1);
            const isFinalGradeColumn = data.column.index === finalGradeColIndex;

            if (isGradeColumn || isFinalGradeColumn) {
              applyGradeStylesToPdfCell(data);
            }
          }
        },
      });

      doc.save(`Boletim_Geral_${course.name.replace(/\s/g, "_")}.pdf`);
    } else {
      // --- FORMATO INDIVIDUAL ---
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth =
        doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      const schoolYear = new Date(terms[0].startDate).getFullYear();
      const activeClassStudents = getStudentsForClass(
        course.classId,
        isReportOnlyActiveStudentsEnabled(),
      );
      const reportStudentIds =
        selectedStudentIds.length > 0
          ? selectedStudentIds
          : activeClassStudents.map((student) => student.id);
      const students = state.students.filter((s) =>
        reportStudentIds.includes(s.id),
      );

      students.forEach((student, index) => {
        if (index > 0) doc.addPage();

        // Cabeçalho Individual
        doc.setFontSize(18);
        doc.text(`Boletim Individual - ${school.name}`, pageWidth / 2, 15, {
          align: "center",
        });
        if (terms.length > 0) {
          doc.setFontSize(11);
          doc.text(
            `Ano Letivo: ${new Date(terms[0].startDate).getFullYear()}`,
            pageWidth / 2,
            22,
            { align: "center" },
          );
        }

        // Info do Aluno
        const studentDisplay = getPdfStudentNameDisplay(student, cls.name);
        const studentInfo = [
          [
            {
              content: `Aluno(a): ${studentDisplay.text}`,
              styles: {
                fontStyle: studentDisplay.fontStyle,
              },
              __pdfStudentStrike: studentDisplay.strike,
            },
            `RA: ${student.ra || "Não informado"}`,
          ],
          [`Turma: ${cls.name}`, `Componente Curricular: ${subjectName}`],
          [`Professor(a): ${teacher?.name || "Não informado"}`, ""],
        ];
        doc.autoTable({
          startY: 28,
          body: studentInfo,
          theme: "plain",
          styles: { fontSize: 10, cellPadding: 1 },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 0) {
              drawPdfStudentStrikeThrough(doc, data);
            }
          },
        });

        let finalY = doc.autoTable.previous.finalY + 10;

        const termResults = terms.map((term) => {
          const grade = getDefinitiveGrade(
            student.id,
            course.id,
            `${term.startDate}|${term.endDate}`,
          );
          const attendance = getTermAttendance(student, course, term);
          return { grade, attendance };
        });

        const finalResult = getFinalResult(student.id, course);

        // Use consolidated attendance from all classes for transferred students
        const schoolCalendar = state.calendars[course.schoolId];
        const termStart =
          schoolCalendar.terms[0]?.startDate ||
          new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
        const termEnd =
          schoolCalendar.terms[schoolCalendar.terms.length - 1]?.endDate ||
          new Date(new Date().getFullYear(), 11, 31)
            .toISOString()
            .split("T")[0];
        const consolidatedYearly = calculateConsolidatedAttendance(
          student.id,
          course.subjectId,
          termStart,
          termEnd,
          course.schoolId,
        );

        const head = [["Descrição"]];
        terms.forEach((term) =>
          head[0].push(`${term.id}º ${termTypeName.toUpperCase()}`),
        );
        head[0].push("RESULTADO FINAL");

        const notesRow = ["Média / Nota"];
        const absencesRow = ["Faltas (F)"];
        const excusedRow = ["Faltas Justificadas (F/J)"];
        const frequencyRow = ["% de Ausência"];

        termResults.forEach((result) => {
          // CORRE�!ÒO: Uso de || 0 para evitar o erro de toString em undefined
          notesRow.push(
            result.grade !== null ? formatGradeValue(result.grade) : "--",
          );
          absencesRow.push((result.attendance.absences || 0).toString());
          excusedRow.push((result.attendance.excusedAbsences || 0).toString());
          frequencyRow.push(
            `${(result.attendance.absencePercentage || 0).toFixed(0)}%`,
          );
        });

        // CORRE�!ÒO: Uso de || 0 nas variáveis anuais também
        notesRow.push(
          finalResult.finalGrade !== null
            ? formatGradeValue(finalResult.finalGrade)
            : "--",
        );
        absencesRow.push((consolidatedYearly.absences || 0).toString());
        // Aqui provavelmente estava o erro (totalExcused podia ser undefined)
        excusedRow.push(
          (0) // Consolidated attendance doesn't track excused separately
            .toString(),
        );
        frequencyRow.push(
          `${(100 - consolidatedYearly.frequency || 0).toFixed(0)}%`,
        );

        const body = [notesRow, absencesRow, excusedRow, frequencyRow];

        doc.autoTable({
          startY: finalY,
          head: head,
          body: body,
          theme: "grid",
          headStyles: {
            fillColor: themeColor,
            textColor: "#FFFFFF",
            fontStyle: "bold",
            halign: "center",
          },
          alternateRowStyles: { fillColor: "#dadada" },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 50, halign: "left" },
          },
          styles: {
            halign: "center",
            valign: "middle",
            fontSize: 10,
            cellPadding: 3,
          },
          didParseCell: (data) => {
            if (
              data.section === "body" &&
              data.row.index === 0 &&
              data.column.index > 0
            ) {
              applyGradeStylesToPdfCell(data);
            }
            if (data.column.index === head[0].length - 1) {
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
        finalY = doc.autoTable.previous.finalY;

        // Situação Final
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text("Situação Final na Disciplina:", 14, finalY + 10);
        doc.setFont(undefined, "normal");

        if (finalResult.situationClass === "grade-success") {
          doc.setTextColor(41, 128, 185);
        } else {
          doc.setTextColor(231, 76, 60);
        }

        const savedResultKey = `${student.id}_${course.id}`;
        const savedSituation = state.finalResults[savedResultKey]?.situation;
        doc.text(savedSituation || finalResult.situation, 65, finalY + 10);
        doc.setTextColor(0);

        const chartStartY = finalY + 18;

        const footerY =
          (doc.internal.pageSize.height || doc.internal.pageSize.getHeight()) -
          20;
        doc.text("_________________________", pageWidth / 2, footerY - 5, {
          align: "center",
        });
        doc.text("Assinatura do Responsável", pageWidth / 2, footerY, {
          align: "center",
        });

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Sistema actEducação", 14, footerY + 10);
        doc.setTextColor(0);

        const comparativeMetrics = terms.map((term) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          return {
            label: `${term.id}º ${termTypeName}`,
            studentGrade: getDefinitiveGrade(student.id, course.id, termKey),
            classGrades: activeClassStudents
              .map((classStudent) =>
                getDefinitiveGrade(classStudent.id, course.id, termKey),
              )
              .filter((grade) => grade !== null),
          };
        });

        comparativeMetrics.push({
          label: "Média Final",
          studentGrade: finalResult.finalGrade,
          classGrades: activeClassStudents
            .map(
              (classStudent) =>
                getFinalResult(classStudent.id, course).finalGrade,
            )
            .filter((grade) => grade !== null),
        });

        appendStudentComparativeChartPage(doc, {
          reportTitle: "Comparativo do Aluno x Sala - Boletim",
          studentName: student.name,
          className: cls?.name || "N/D",
          subjectName: subjectName,
          metrics: comparativeMetrics,
          yearLabel: schoolYear,
          inline: true,
          startY: chartStartY,
          includeMetricsTable: false,
        });
      });

      doc.save(`Boletins_Individuais_${course.name.replace(/\s/g, "_")}.pdf`);
    }
  };

  const handleDelete = (id, type, params) => {
    const itemTypeSingular = type.slice(0, -1);
    const item = state[type].find((i) => i.id === id);
    if (!item) return;

    const findLinks = (id, type) => {
      const links = [];
      const typeSingular = type.slice(0, -1);

      switch (typeSingular) {
        case "school":
          if (state.classes.some((c) => c.schoolId === id))
            links.push("Turmas");
          break;
        case "teacher":
          if (state.schedules.some((s) => s.teacherId === id))
            links.push("Grades Horárias");
          if (state.notes.some((n) => n.teacherId === id))
            links.push("Anotações");
          break;
        case "subject":
          if (state.schedules.some((s) => s.subjectId === id))
            links.push("Grades Horárias");
          if (state.homeworks.some((h) => h.subjectId === id))
            links.push("Atividades");
          if ((state.occurrences || []).some((o) => o.subjectId === id))
            links.push("Ocorrências");
          if (state.assessments.some((a) => a.subjectId === id))
            links.push("Avaliações");
          break;
        case "class":
          if (state.students.some((s) => s.classId === id))
            links.push("Alunos");
          if (state.schedules.some((s) => s.classId === id))
            links.push("Grades Horárias");
          if ((state.occurrences || []).some((o) => o.classId === id))
            links.push("Ocorrências");
          break;
        case "student":
          // Alunos geralmente não têm dependências que impeçam a exclusão.
          break;
      }
      return links;
    };

    const dependencies = findLinks(id, type);

    if (dependencies.length > 0) {
      CustomSwal.fire(
        "Não é possível excluir",
        `Este item não pode ser excluído porque está associado a: ${dependencies.join(", ")}.`,
        "error",
      );
      return;
    }

    CustomSwal.fire({
      title: "Você tem certeza?",
      html: `O item "<b>${item.name || item.title || "este item"}</b>" será excluído permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir!",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        state[type] = state[type].filter((i) => i.id !== id);
        saveData();

        // Lógica para recarregar a página/visualização correta
        if (params.pageId === "diary") {
          const diaryPageContainer = document.getElementById(
            "diary-page-container",
          );
          if (diaryPageContainer) {
            const activeTabButton = diaryPageContainer.querySelector(
              "#diary-tabs .page-tab.active",
            );
            if (activeTabButton) {
              activeTabButton.click();
            }
          }
        } else if (type === "notes" && params.teacherId) {
          renderPage("teacher-notes", { teacherId: params.teacherId });
        } else if (type === "notes" && params.tab) {
          renderPage("organization", { tab: params.tab });
        } else if (type === "students") {
          renderPage("manage-class", { id: params.id });
        } else if (params.tab) {
          renderPage("school-data", { tab: params.tab });
        } else {
          renderPage(type);
        }
      }
    });
  };

  const INDIVIDUAL_REPORT_STANDARD_VARIABLES = [
    "NOME DO ALUNO",
    "SÉRIE",
    "DISCIPLINA",
    "PROFESSOR",
    "DATA",
    "ESCOLA",
  ];

  const ensureIndividualReportsState = () => {
    if (!Array.isArray(state.individualReportTemplates)) {
      state.individualReportTemplates = [];
    }
    if (!Array.isArray(state.individualReportVariables)) {
      state.individualReportVariables = [];
    }
    state.individualReportVariables = state.individualReportVariables
      .map((variable) => {
        if (typeof variable === "string") {
          return {
            id: generateUUID(),
            name: normalizeIndividualReportVariableName(variable),
            defaultValue: "",
          };
        }
        return {
          id: variable?.id || generateUUID(),
          name: normalizeIndividualReportVariableName(variable?.name || ""),
          defaultValue: String(variable?.defaultValue || ""),
        };
      })
      .filter((variable) => variable.name);
    if (!Array.isArray(state.studentIndividualReports)) {
      state.studentIndividualReports = [];
    }
  };

  const normalizeIndividualReportVariableName = (value = "") =>
    String(value).trim().replace(/\s+/g, " ").toUpperCase();

  const getRegisteredIndividualReportVariablesMap = () => {
    const output = {};
    (state.individualReportVariables || []).forEach((variable) => {
      const key = normalizeIndividualReportVariableName(variable?.name || "");
      if (!key) return;
      output[key] = String(variable?.defaultValue || "");
    });
    return output;
  };

  const escapeRegExp = (value = "") =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const extractVariablesFromTemplate = (templateText = "") => {
    const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
    const found = new Set();
    let match = regex.exec(templateText);
    while (match) {
      const variableName = String(match[1] || "").trim();
      if (variableName) {
        found.add(variableName);
      }
      match = regex.exec(templateText);
    }
    return Array.from(found);
  };

  const parseCustomVariables = (text = "") => {
    const output = {};
    String(text)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex <= 0) return;
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!key) return;
        output[key] = value;
      });
    return output;
  };

  const renderTemplateWithVariables = (templateText = "", variables = {}) => {
    let finalText = String(templateText || "");
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(
        `\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`,
        "gi",
      );
      finalText = finalText.replace(regex, value ?? "");
    });
    return finalText;
  };

  const getTeacherNamesForCourse = (classId, subjectId) => {
    const scheduleSources = [
      ...(Array.isArray(state.schedules) ? state.schedules : []),
      ...(Array.isArray(state.gradesHorarias)
        ? state.gradesHorarias
        : []
      ).flatMap((grade) =>
        Array.isArray(grade?.schedules) ? grade.schedules : [],
      ),
    ];

    const teacherIds = [
      ...new Set(
        scheduleSources
          .filter(
            (schedule) =>
              schedule?.classId === classId &&
              schedule?.subjectId === subjectId,
          )
          .map((schedule) => schedule.teacherId)
          .filter(Boolean),
      ),
    ];

    const teacherNames = teacherIds
      .map((teacherId) =>
        state.teachers.find((teacher) => teacher.id === teacherId),
      )
      .filter(Boolean)
      .map((teacher) => teacher.name)
      .filter(Boolean);

    return teacherNames.length > 0 ? teacherNames.join(" / ") : "Não definido";
  };

  const buildStandardStudentReportVariables = ({
    studentId,
    courseId,
    reportDate,
  } = {}) => {
    const student =
      state.students.find((item) => item.id === studentId) || null;
    const selectedCourse = getUniqueCourses().find(
      (course) => course.id === courseId,
    );

    const resolvedClassId = selectedCourse?.classId || student?.classId || "";
    const classInfo =
      state.classes.find((cls) => cls.id === resolvedClassId) || null;
    const subjectInfo = selectedCourse
      ? state.subjects.find(
          (subject) => subject.id === selectedCourse.subjectId,
        )
      : null;
    const schoolInfo = classInfo
      ? state.schools.find((school) => school.id === classInfo.schoolId)
      : null;
    const dateString = reportDate
      ? new Date(`${reportDate}T12:00:00`).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

    return {
      "NOME DO ALUNO": student?.name || "",
      SÉRIE: classInfo?.name || "",
      DISCIPLINA: subjectInfo?.name || "",
      PROFESSOR: selectedCourse
        ? getTeacherNamesForCourse(
            selectedCourse.classId,
            selectedCourse.subjectId,
          )
        : "Não definido",
      DATA: dateString,
      ESCOLA: schoolInfo?.name || "",
    };
  };

  const formatStudentReportDateTime = (isoDate) => {
    if (!isoDate) return "-";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("pt-BR");
  };

  const renderStudentReportHistoryCards = (studentId = "") => {
    ensureIndividualReportsState();

    const reports = [...state.studentIndividualReports]
      .filter((report) => !studentId || report.studentId === studentId)
      .sort((a, b) => {
        const dateA = new Date(a.generatedAt || 0).getTime();
        const dateB = new Date(b.generatedAt || 0).getTime();
        return dateB - dateA;
      });

    if (reports.length === 0) {
      return `<div class="card p-4 text-center text-secondary">Nenhum relatório individual gerado para o filtro selecionado.</div>`;
    }

    return reports
      .map((report) => {
        const student = state.students.find(
          (item) => item.id === report.studentId,
        );
        const classInfo = state.classes.find(
          (item) => item.id === student?.classId,
        );
        const course = getUniqueCourses().find(
          (item) => item.id === report.courseId,
        );
        const title = report.title || "Relatório sem título";
        const previewText = String(report.content || "").slice(0, 220);

        return `
          <details class="student-report-accordion-item" data-report-id="${report.id}">
            <summary>
              <div class="student-report-accordion-main">
                <div>
                  <h4 class="font-bold">${escapeHtml(title)}</h4>
                  <p class="text-sm text-secondary">${escapeHtml(student?.name || "Aluno não encontrado")} ${classInfo?.name ? `• ${escapeHtml(classInfo.name)}` : ""}</p>
                  <p class="text-xs text-secondary">Gerado em ${formatStudentReportDateTime(report.generatedAt)}</p>
                </div>
                <div class="student-report-accordion-meta">
                  <span class="tag-badge">${escapeHtml(course?.name || "Sem disciplina")}</span>
                </div>
              </div>
            </summary>
            <div class="student-report-accordion-body">
              <div class="flex items-center justify-end gap-2 mb-3 flex-wrap">
                <button class="btn btn-subtle btn-export-single-report-pdf" data-id="${report.id}"><i class="fas fa-file-pdf mr-1"></i>PDF</button>
                <button class="btn btn-primary btn-export-single-report-docx" data-id="${report.id}"><i class="fas fa-file-word mr-1"></i>DOCX</button>
                <button class="btn btn-subtle btn-view-student-report" data-id="${report.id}"><i class="fas fa-eye mr-1"></i>Visualizar</button>
                <button class="btn btn-danger btn-delete-student-report" data-id="${report.id}"><i class="fas fa-trash mr-1"></i>Excluir</button>
              </div>
              <pre class="student-report-history-preview">${escapeHtml(previewText)}${
                report.content && report.content.length > 220 ? "..." : ""
              }</pre>
            </div>
          </details>
        `;
      })
      .join("");
  };

  const downloadBlobFile = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const sanitizeFileName = (value = "arquivo") =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]+/g, "")
      .trim()
      .replace(/\s+/g, "_") || "arquivo";

  const buildIndividualReportExportMeta = (report) => {
    const student = state.students.find((item) => item.id === report.studentId);
    const course = getUniqueCourses().find(
      (item) => item.id === report.courseId,
    );
    const classInfo = state.classes.find(
      (item) => item.id === (course?.classId || student?.classId),
    );
    const subjectInfo = state.subjects.find(
      (item) => item.id === course?.subjectId,
    );

    return {
      title: report.title || "Relatório individual",
      studentName: student?.name || "Aluno não encontrado",
      className: classInfo?.name || "Turma não informada",
      subjectName: subjectInfo?.name || "Disciplina não informada",
      reportDate: report.reportDate || "-",
      generatedAt: formatStudentReportDateTime(report.generatedAt),
      content: String(report.content || "").trim(),
    };
  };

  const exportIndividualReportsPdf = (
    reports,
    fileNameBase = "relatorios_individuais",
  ) => {
    if (!Array.isArray(reports) || reports.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Nenhum relatório disponível para exportar.",
        "warning",
      );
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const topY = 18;
    const maxWidth = pageWidth - marginX * 2;

    const drawPageNumber = () => {
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Sistema actEducação`, marginX, pageHeight - 8);
      doc.text(
        `Página ${doc.getCurrentPageInfo().pageNumber}`,
        pageWidth - marginX,
        pageHeight - 8,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    reports.forEach((report, index) => {
      if (index > 0) {
        drawPageNumber();
        doc.addPage();
      }

      const meta = buildIndividualReportExportMeta(report);
      let cursorY = topY;

      doc.setFont(undefined, "bold");
      doc.setFontSize(15);
      doc.text(sanitizePdfText(meta.title), marginX, cursorY);

      cursorY += 8;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      [
        `Aluno: ${meta.studentName}`,
        `Turma: ${meta.className}`,
        `Disciplina: ${meta.subjectName}`,
        `Data do relatório: ${meta.reportDate}`,
        `Gerado em: ${meta.generatedAt}`,
      ].forEach((line) => {
        doc.text(sanitizePdfText(line), marginX, cursorY);
        cursorY += 5;
      });

      cursorY += 3;
      doc.setDrawColor(210);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 7;

      doc.setFontSize(11);

      const normalizedLines = String(meta.content || "")
        .replace(/\r/g, "")
        .split("\n");

      normalizedLines.forEach((rawLine) => {
        const safeLine = sanitizePdfText(rawLine || " ") || " ";
        const wrappedLines = doc.splitTextToSize(safeLine, maxWidth);
        const linesToDraw = wrappedLines.length ? wrappedLines : [" "];

        linesToDraw.forEach((line) => {
          if (cursorY > pageHeight - 18) {
            drawPageNumber();
            doc.addPage();
            cursorY = topY;
          }
          doc.text(line, marginX, cursorY);
          cursorY += 5;
        });
      });

      drawPageNumber();
    });

    doc.save(`${sanitizeFileName(fileNameBase)}.pdf`);
  };

  const exportIndividualReportsDocx = async (
    reports,
    fileNameBase = "relatorios_individuais",
  ) => {
    if (!Array.isArray(reports) || reports.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Nenhum relatório disponível para exportar.",
        "warning",
      );
      return;
    }

    if (!window.docx) {
      CustomSwal.fire(
        "Erro",
        "A biblioteca de DOCX não foi carregada.",
        "error",
      );
      return;
    }

    const {
      AlignmentType,
      Document,
      HeadingLevel,
      Packer,
      PageBreak,
      Paragraph,
      TextRun,
    } = window.docx;

    const children = [];

    reports.forEach((report, index) => {
      const meta = buildIndividualReportExportMeta(report);

      if (index > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      children.push(
        new Paragraph({
          text: meta.title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
      );

      [
        `Aluno: ${meta.studentName}`,
        `Turma: ${meta.className}`,
        `Disciplina: ${meta.subjectName}`,
        `Data do relatório: ${meta.reportDate}`,
        `Gerado em: ${meta.generatedAt}`,
      ].forEach((line) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line })],
            spacing: { after: 120 },
          }),
        );
      });

      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Conteúdo", bold: true })],
          spacing: { before: 120, after: 120 },
        }),
      );

      const contentLines = String(meta.content || "")
        .replace(/\r/g, "")
        .split("\n");

      contentLines.forEach((line) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line || " " })],
            spacing: { after: 120 },
          }),
        );
      });
    });

    const documentDocx = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(documentDocx);
    downloadBlobFile(blob, `${sanitizeFileName(fileNameBase)}.docx`);
  };

  const renderStudentIndividualReportsPage = () => {
    ensureIndividualReportsState();

    const sortedTemplates = [...state.individualReportTemplates].sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );
    const templateOptions = sortedTemplates
      .map(
        (template) =>
          `<option value="${template.id}">${escapeHtml(template.name)}</option>`,
      )
      .join("");

    const students = [...state.students]
      .filter((student) => student.status !== "transferido")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    const studentOptions = students
      .map(
        (student) =>
          `<option value="${student.id}">${escapeHtml(student.name)}</option>`,
      )
      .join("");

    const courseOptions = getUniqueCourses()
      .map(
        (course) =>
          `<option value="${course.id}">${escapeHtml(course.name)}</option>`,
      )
      .join("");

    const todayIso = new Date().toISOString().split("T")[0];

    return `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 class="text-3xl font-bold">Relatórios Individuais</h2>
          <div class="flex items-center gap-2">
            <p class="text-secondary text-sm">Configure e gere relatórios por aluno, mantendo histórico.</p>
            <button id="btn-manage-ind-templates" class="btn btn-subtle"><i class="fas fa-file-lines mr-2"></i>Modelos e Variáveis</button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <section class="card p-6 space-y-4">
            <h3 class="text-xl font-bold">Gerar Relatório</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-medium mb-2 text-sm" for="ind-report-student-select">Aluno</label>
                <select id="ind-report-student-select" class="form-select">
                  <option value="">-- Selecione --</option>
                  ${studentOptions}
                </select>
              </div>
              <div>
                <label class="block font-medium mb-2 text-sm" for="ind-report-course-select">Disciplina (turma/disciplina)</label>
                <select id="ind-report-course-select" class="form-select">
                  <option value="">-- Opcional --</option>
                  ${courseOptions}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-medium mb-2 text-sm" for="ind-report-template-generate">Modelo</label>
                <select id="ind-report-template-generate" class="form-select">
                  <option value="">-- Selecione --</option>
                  ${templateOptions}
                </select>
                <p class="text-xs text-secondary mt-2">Para criar/editar modelos e variáveis, use o botão "Modelos e Variáveis" no topo.</p>
              </div>
              <div>
                <label class="block font-medium mb-2 text-sm" for="ind-report-date">Data</label>
                <input id="ind-report-date" class="form-input" type="date" value="${todayIso}" />
              </div>
            </div>

            <div>
              <label class="block font-medium mb-2 text-sm" for="ind-report-title">Título do relatório</label>
              <input id="ind-report-title" class="form-input" placeholder="Ex.: Relatório individual do 2º bimestre" />
            </div>

            <div>
              <label class="block font-medium mb-2 text-sm" for="ind-report-custom-vars">Variáveis extras (uma por linha: CHAVE=valor)</label>
              <textarea id="ind-report-custom-vars" class="form-textarea" style="min-height: 90px;" placeholder="CRITÉRIO=Participação\nOBSERVAÇÃO=Aluno dedicado"></textarea>
            </div>

            <div class="flex flex-wrap gap-2">
              <button id="btn-preview-ind-report" class="btn btn-subtle"><i class="fas fa-magnifying-glass mr-2"></i>Gerar prévia</button>
              <button id="btn-save-ind-report" class="btn btn-primary"><i class="fas fa-floppy-disk mr-2"></i>Salvar no histórico</button>
            </div>

            <div>
              <label class="block font-medium mb-2 text-sm" for="ind-report-output">Texto final</label>
              <textarea id="ind-report-output" class="form-textarea" style="min-height: 220px;"></textarea>
            </div>
          </section>
        </div>

        <section class="space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 class="text-2xl font-bold">Histórico por Aluno</h3>
            <div class="w-full sm:w-80">
              <select id="ind-history-student-filter" class="form-select">
                <option value="">Todos os alunos</option>
                ${studentOptions}
              </select>
            </div>
          </div>
          <div id="ind-history-list" class="space-y-3">
            ${renderStudentReportHistoryCards("")}
          </div>
        </section>
      </div>
    `;
  };

  const renderReportsPage = () => {
    ensureIndividualReportsState();

    const courseOptions = getUniqueCourses()
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
    const schoolOptions = state.schools
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join("");
    const classOptions = state.classes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");

    return `
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
      <h2 class="text-3xl font-bold">Relatórios</h2>
      <p class="text-secondary text-sm">Selecione os filtros e gere seus relatórios em PDF</p>
    </div>

    <div id="reports-tabs" class="border-b border-[var(--border-color)] overflow-x-auto whitespace-nowrap">
      <button class="page-tab active" data-tab="diario"><i class="fas fa-book-reader"></i>Diário</button>
      <button class="page-tab" data-tab="notas"><i class="fas fa-award"></i>Notas</button>
      <button class="page-tab" data-tab="frequencia"><i class="fas fa-user-clock"></i>Frequência</button>
      <button class="page-tab" data-tab="alunos"><i class="fas fa-users"></i>Alunos</button>
    </div>

    <div class="card p-4 border-l-4" style="border-left-color: var(--theme-color);">
      <label class="flex items-center text-sm">
        <input type="checkbox" id="report-active-students-only" class="form-checkbox" checked>
        <span class="ml-2">Exibir apenas alunos ativos</span>
      </label>
    </div>

    <div id="reports-diario-content" class="reports-tab-content space-y-6">
      <div class="card p-6 border-l-4" style="border-left-color: var(--theme-color);">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold flex items-center"><i class="fas fa-book-reader mr-3 text-[var(--theme-color)]"></i>Diário de Classe e Relatórios Detalhados</h3>
            <p class="text-xs text-secondary mt-1">Gere diários completos ou relatórios detalhados com frequência, conteúdo e atividades</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="report-course-select" class="block font-medium mb-2 text-sm">Turma/Disciplina</label>
            <select id="report-course-select" class="form-select w-full">
              <option value="">-- Selecione --</option>
              ${courseOptions}
            </select>
          </div>
          <div>
            <label for="report-term-select" class="block font-medium mb-2 text-sm">Período</label>
            <select id="report-term-select" class="form-select w-full" disabled>
              <option value="">-- Primeiro selecione a turma --</option>
            </select>
          </div>
          <div>
            <label class="block font-medium mb-2 text-sm">Orientação</label>
            <div class="flex items-center gap-3 pt-1">
              <label class="flex items-center text-sm"><input type="radio" name="report-orientation-class" value="p" class="form-radio"> <span class="ml-1">Retrato</span></label>
              <label class="flex items-center text-sm"><input type="radio" name="report-orientation-class" value="l" class="form-radio" checked> <span class="ml-1">Paisagem</span></label>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <div>
            <p class="font-medium text-sm mb-2 block">Seções do Relatório:</p>
            <div class="space-y-2">
              <label class="flex items-center text-sm"><input type="checkbox" id="report-include-attendance" class="form-checkbox" checked> <span class="ml-2">Frequência</span></label>
              <label class="flex items-center text-sm"><input type="checkbox" id="report-include-content" class="form-checkbox" checked> <span class="ml-2">Conteúdo Ministrado</span></label>
              <label class="flex items-center text-sm"><input type="checkbox" id="report-include-homework" class="form-checkbox" checked> <span class="ml-2">Atividades em sala</span></label>
              <label class="flex items-center text-sm"><input type="checkbox" id="report-include-occurrences" class="form-checkbox" checked> <span class="ml-2">Ocorrências de indisciplina</span></label>
            </div>
          </div>
          <div>
            <p class="font-medium text-sm mb-2 block">Filtros:</p>
            <div class="space-y-2">
              <label class="flex items-center text-sm"><input type="checkbox" id="report-school-days-only" class="form-checkbox" checked> <span class="ml-2">Apenas dias letivos</span></label>
              <label class="flex items-center text-sm"><input type="checkbox" id="report-show-events" class="form-checkbox"> <span class="ml-2">Listar eventos</span></label>
              <label class="flex items-center text-sm"><input type="checkbox" id="report-given-classes-only" class="form-checkbox" checked> <span class="ml-2">Apenas aulas com registro</span></label>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mt-4 pt-4 border-t justify-end">
          <button id="btn-generate-complete-log-report" class="btn btn-subtle"><i class="fas fa-th-list mr-2"></i>Diário Completo</button>
          <button id="btn-generate-planning-report" class="btn btn-subtle"><i class="fas fa-chalkboard-teacher mr-2"></i>Planejamento</button>
          <button id="btn-generate-class-report" class="btn btn-primary"><i class="fas fa-file-notebook mr-2"></i>Relatório Detalhado</button>
        </div>
      </div>
    </div>

    <div id="reports-notas-content" class="reports-tab-content hidden space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6 border-l-4" style="border-left-color: var(--theme-color);">
          <div class="mb-4">
            <h3 class="text-lg font-bold flex items-center"><i class="fas fa-award mr-3 text-[var(--theme-color)]"></i>Notas e Médias</h3>
            <p class="text-xs text-secondary mt-1">Relatórios de notas e médias por período</p>
          </div>
          <div class="space-y-3">
            <div>
              <label for="grades-report-course-select" class="block font-medium mb-2 text-sm">Turma/Disciplina</label>
              <select id="grades-report-course-select" class="form-select w-full">
                <option value="">-- Selecione --</option>
                ${courseOptions}
              </select>
            </div>
            <div>
              <label for="grades-report-type" class="block font-medium mb-2 text-sm">Tipo</label>
              <select id="grades-report-type" class="form-select w-full">
                <option value="averages">Médias por Período</option>
                <option value="assessments">Notas das Avaliações</option>
                <option value="bulletins">Boletins (Notas e Frequência)</option>
              </select>
            </div>
            <div>
              <label for="grades-report-term-select" class="block font-medium mb-2 text-sm">Período</label>
              <select id="grades-report-term-select" class="form-select w-full" disabled>
                <option value="">-- Selecione a turma --</option>
              </select>
            </div>
            <div>
              <label class="block font-medium mb-2 text-sm">Formato</label>
              <div class="flex items-center gap-3">
                <label class="flex items-center text-sm"><input type="radio" name="grades-report-format" value="coletivo" class="form-radio" checked> <span class="ml-1">Coletivo</span></label>
                <label class="flex items-center text-sm"><input type="radio" name="grades-report-format" value="individual" class="form-radio"> <span class="ml-1">Individual</span></label>
              </div>
            </div>
            <div id="grades-report-student-selector-container" class="hidden">
              <label for="grades-report-student-select" class="block font-medium mb-2 text-sm">Aluno(s)</label>
              <select id="grades-report-student-select" class="form-select w-full" multiple size="4"></select>
              <p class="text-xs text-secondary mt-1">Ctrl/Cmd + Clique</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              <button id="btn-generate-grades-report" class="btn btn-primary w-full"><i class="fas fa-file-pdf mr-2"></i>Gerar PDF</button>
              <button id="btn-generate-grades-excel-report" class="btn btn-export-excel w-full"><i class="fas fa-file-excel mr-2"></i>Gerar Excel</button>
            </div>
          </div>
        </div>

        <div class="card p-6 border-l-4" style="border-left-color: var(--theme-color);">
          <div class="mb-4">
            <h3 class="text-lg font-bold flex items-center"><i class="fas fa-exclamation-triangle mr-3 text-[var(--theme-color)]"></i>Notas Vermelhas</h3>
            <p class="text-xs text-secondary mt-1">Alunos com notas abaixo da nota mínima azul (${formatPassingGradeThresholdPtBr()})</p>
          </div>
          <div class="space-y-3">
            <div>
              <label for="red-grades-school-select" class="block font-medium mb-2 text-sm">Escola</label>
              <select id="red-grades-school-select" class="form-select w-full">
                <option value="">-- Selecione --</option>
                ${schoolOptions}
              </select>
            </div>
            <div>
              <label class="block font-medium mb-2 text-sm">Escopo</label>
              <div class="flex items-center gap-4">
                <label class="flex items-center text-sm"><input type="radio" name="red-grades-scope" value="single" class="form-radio"> <span class="ml-1">Turma única</span></label>
                <label class="flex items-center text-sm"><input type="radio" name="red-grades-scope" value="multi" class="form-radio" checked> <span class="ml-1">Várias turmas</span></label>
              </div>
            </div>
            <div>
              <label for="red-grades-class-select" id="red-grades-class-label" class="block font-medium mb-2 text-sm">Turma(s)</label>
              <select id="red-grades-class-select" class="form-select w-full" disabled multiple size="3"></select>
              <p id="red-grades-class-help" class="text-xs text-secondary mt-1">Ctrl/Cmd + Clique</p>
            </div>
            <div>
              <label for="red-grades-term-select" class="block font-medium mb-2 text-sm">Período</label>
              <select id="red-grades-term-select" class="form-select w-full" disabled>
                <option value="">-- Selecione Escola --</option>
              </select>
            </div>
            <div id="red-grades-criteria-container" class="hidden">
              <label for="red-grades-criteria-select" class="block font-medium mb-2 text-sm">Critério de Avaliação</label>
              <select id="red-grades-criteria-select" class="form-select w-full" disabled>
                <option value="">-- Selecione turma e período --</option>
              </select>
              <p class="text-xs text-secondary mt-1">Inclui avaliações cadastradas e a média do período por disciplina.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              <button id="btn-generate-red-grades-report" class="btn btn-primary w-full"><i class="fas fa-file-pdf mr-2"></i>Gerar PDF</button>
              <button id="btn-generate-red-grades-excel-report" class="btn btn-export-excel w-full"><i class="fas fa-file-excel mr-2"></i>Gerar Excel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="reports-frequencia-content" class="reports-tab-content hidden space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6 border-l-4" style="border-left-color: var(--theme-color);">
          <div class="mb-4">
            <h3 class="text-lg font-bold flex items-center"><i class="fas fa-user-clock mr-3 text-[var(--theme-color)]"></i>Baixa Frequência</h3>
            <p class="text-xs text-secondary mt-1">Alunos com frequência abaixo do limite</p>
          </div>
          <div class="space-y-3">
            <div>
              <label for="low-freq-school-select" class="block font-medium mb-2 text-sm">Escola</label>
              <select id="low-freq-school-select" class="form-select w-full">
                <option value="">-- Selecione --</option>
                ${schoolOptions}
              </select>
            </div>
            <div>
              <label for="low-freq-class-select" class="block font-medium mb-2 text-sm">Turma(s)</label>
              <select id="low-freq-class-select" class="form-select w-full" disabled multiple size="3"></select>
              <p class="text-xs text-secondary mt-1">Deixar vazio = todas</p>
            </div>
            <div>
              <label for="low-freq-term-select" class="block font-medium mb-2 text-sm">Período</label>
              <select id="low-freq-term-select" class="form-select w-full" disabled>
                <option value="all">Ano Letivo Completo</option>
              </select>
            </div>
            <div>
              <label for="low-freq-threshold" class="block font-medium mb-2 text-sm">Frequência Mínima (%)</label>
              <input type="number" id="low-freq-threshold" class="form-input w-full" value="75" min="1" max="100">
            </div>
            <div>
              <label class="block font-medium mb-2 text-sm">Orientação</label>
              <div class="flex items-center gap-3">
                <label class="flex items-center text-sm"><input type="radio" name="report-orientation-low-freq" value="p" class="form-radio" checked> <span class="ml-1">Retrato</span></label>
                <label class="flex items-center text-sm"><input type="radio" name="report-orientation-low-freq" value="l" class="form-radio"> <span class="ml-1">Paisagem</span></label>
              </div>
            </div>
            <button id="btn-generate-low-freq-report" class="btn btn-primary w-full"><i class="fas fa-file-pdf mr-2"></i>Gerar Relatório</button>
          </div>
        </div>

        <div class="card p-6 border-l-4" style="border-left-color: var(--theme-color);">
          <div class="mb-4">
            <h3 class="text-lg font-bold flex items-center"><i class="fas fa-calendar-xmark mr-3 text-[var(--theme-color)]"></i>Faltas por Aluno com Conteúdo</h3>
            <p class="text-xs text-secondary mt-1">Lista os dias de falta no período e o conteúdo ministrado em cada ausência</p>
          </div>
          <div class="space-y-3">
            <div>
              <label for="absence-report-course-select" class="block font-medium mb-2 text-sm">Turma/Disciplina</label>
              <select id="absence-report-course-select" class="form-select w-full">
                <option value="">-- Selecione --</option>
                ${courseOptions}
              </select>
            </div>
            <div>
              <label for="absence-report-term-select" class="block font-medium mb-2 text-sm">Período</label>
              <select id="absence-report-term-select" class="form-select w-full" disabled>
                <option value="">-- Primeiro selecione a turma --</option>
              </select>
            </div>
            <div>
              <label for="absence-report-student-select" class="block font-medium mb-2 text-sm">Aluno</label>
              <select id="absence-report-student-select" class="form-select w-full" multiple size="6" disabled>
                <option value="all">Todos os alunos</option>
              </select>
              <p class="text-xs text-secondary mt-1">Caixa de multiseleção: Ctrl/Cmd + Clique para escolher aluno por aluno</p>
            </div>
            <div>
              <label class="flex items-center text-sm">
                <input type="checkbox" id="absence-report-include-content" class="form-checkbox" checked>
                <span class="ml-2">Exibir conteúdo ministrado no dia da falta</span>
              </label>
            </div>
            <button id="btn-generate-absence-content-report" class="btn btn-primary w-full"><i class="fas fa-file-pdf mr-2"></i>Gerar Relatório</button>
          </div>
        </div>
      </div>
    </div>

    <div id="reports-alunos-content" class="reports-tab-content hidden space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6 border-l-4" style="border-left-color: var(--theme-color);">
          <div class="mb-4">
            <h3 class="text-lg font-bold flex items-center"><i class="fas fa-users mr-3 text-[var(--theme-color)]"></i>Lista de Alunos</h3>
            <p class="text-xs text-secondary mt-1">Lista de alunos por turma</p>
          </div>
          <div class="space-y-3">
            <div>
              <label for="report-classlist-select" class="block font-medium mb-2 text-sm">Turma</label>
              <select id="report-classlist-select" class="form-select w-full">
                <option value="">-- Selecione --</option>
                <option value="all">Todas as Turmas</option>
                ${classOptions}
              </select>
            </div>
            <button id="btn-generate-classlist-report" class="btn btn-primary w-full mt-6"><i class="fas fa-file-pdf mr-2"></i>Gerar Relatório</button>
          </div>
        </div>

        <div class="card p-6 border-l-4" style="border-left-color: var(--theme-color);">
          <div class="mb-4">
            <h3 class="text-lg font-bold flex items-center"><i class="fas fa-user-md mr-3 text-[var(--theme-color)]"></i>Alunos com Laudo</h3>
            <p class="text-xs text-secondary mt-1">Alunos com deficiência ou transtorno</p>
          </div>
          <div class="space-y-3">
            <div>
              <label for="laudados-school-select" class="block font-medium mb-2 text-sm">Escola</label>
              <select id="laudados-school-select" class="form-select w-full">
                <option value="">Todas as Escolas</option>
                ${schoolOptions}
              </select>
            </div>
            <div>
              <label for="laudados-class-select" class="block font-medium mb-2 text-sm">Turma</label>
              <select id="laudados-class-select" class="form-select w-full" disabled>
                <option value="">-- Selecione Escola --</option>
              </select>
            </div>
            <div>
              <label class="block font-medium mb-2 text-sm">Orientação</label>
              <div class="flex items-center gap-3">
                <label class="flex items-center text-sm"><input type="radio" name="report-orientation-laudados" value="p" class="form-radio"> <span class="ml-1">Retrato</span></label>
                <label class="flex items-center text-sm"><input type="radio" name="report-orientation-laudados" value="l" class="form-radio" checked> <span class="ml-1">Paisagem</span></label>
              </div>
            </div>
            <button id="btn-generate-laudados-report" class="btn btn-primary w-full"><i class="fas fa-user-md mr-2"></i>Gerar Relatório</button>
          </div>
        </div>
      </div>

      <section class="card p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 class="text-xl font-bold">Relatório Individual</h3>
          <button id="btn-open-ind-config-gen-modal" class="btn btn-primary"><i class="fas fa-sliders mr-2"></i>Configuração e Geração</button>
        </div>

        <div class="space-y-4">
          <h4 class="text-lg font-bold">Consulta por Aluno</h4>

          <div>
            <label class="block font-medium mb-2 text-sm" for="ind-report-student-input">Aluno</label>
            <div class="student-picker">
              <input id="ind-report-student-input" class="form-input" placeholder="Digite o nome e selecione na lista" autocomplete="off" />
              <div id="ind-report-student-dropdown" class="student-picker-dropdown"></div>
              <input id="ind-report-student-id" type="hidden" />
            </div>
            <p class="text-xs text-secondary mt-2">Selecione um aluno para visualizar todo o histórico de relatórios.</p>
          </div>

          <section class="space-y-3 pt-3 border-t border-[var(--border-color)]">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h4 class="text-lg font-bold">Histórico Completo do Aluno Selecionado</h4>
            </div>
            <div id="ind-history-list" class="space-y-3">
              <p class="text-secondary text-sm">Selecione um aluno para visualizar o histórico completo.</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  </div>
  `;
  };

  const generateClassReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const courseId = document.getElementById("report-course-select").value;
    const termValue = document.getElementById("report-term-select").value;

    if (!courseId || !termValue) {
      CustomSwal.fire(
        "Atenção",
        "Selecione uma turma e um período para gerar o relatório.",
        "warning",
      );
      return;
    }

    const orientation = document.querySelector(
      'input[name="report-orientation-class"]:checked',
    ).value;
    const [termStart, termEnd] = termValue.split("|");
    const includeAttendance = document.getElementById(
      "report-include-attendance",
    ).checked;
    const includeContent = document.getElementById(
      "report-include-content",
    ).checked;
    const includeHomework = document.getElementById(
      "report-include-homework",
    ).checked;
    const includeOccurrences = document.getElementById(
      "report-include-occurrences",
    ).checked;
    const schoolDaysOnly = document.getElementById(
      "report-school-days-only",
    ).checked;
    const showEvents = document.getElementById("report-show-events").checked;
    const givenClassesOnly = document.getElementById(
      "report-given-classes-only",
    ).checked;

    const course = getUniqueCourses().find((c) => c.id === courseId);
    const classInfo = state.classes.find((c) => c.id === course.classId);
    const subjectInfo = state.subjects.find((s) => s.id === course.subjectId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const scheduleEntry = getScheduleEntryForCourse(course, termStart);
    const teacher = scheduleEntry
      ? state.teachers.find((t) => t.id === scheduleEntry.teacherId)
      : null;
    const teacherName = teacher ? teacher.name : "Professor não atribuído";
    const schoolCalendar = state.calendars[school.id] || {
      terms: [],
      importantDates: [],
    };

    let allClassDates = getScheduledDatesForTerm(course, termStart, termEnd);
    let reportClassDates = schoolDaysOnly
      ? allClassDates.filter((d) => d.isSchoolDay)
      : allClassDates;

    const students = getStudentsForClass(
      course.classId,
      isReportOnlyActiveStudentsEnabled(),
    );

    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
    });
    const termName = document.querySelector(
      "#report-term-select option:checked",
    ).textContent;
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;

      doc.text(termName, data.settings.margin.left, footerY);
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      }); // Identificação do Sistema
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    const schoolYear = new Date(
      schoolCalendar.terms[0].startDate,
    ).getFullYear();
    doc.setFontSize(16);
    doc.text(`Relatório Detalhado - ${course.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Ano Letivo: ${schoolYear}`, 14, 21);
    doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 26);
    doc.text(`Professor(a): ${teacherName}`, 14, 31);

    let finalY = 40;
    let isFirstSection = true;

    const addPageIfNeeded = () => {
      if (!isFirstSection) {
        doc.addPage();
      }
      isFirstSection = false;
    };

    if (includeAttendance) {
      addPageIfNeeded();
      let sectionY = 38;
      doc.setFontSize(14);
      doc.text("Relatório de Frequência", 14, sectionY);

      const totalClassesInPeriod = reportClassDates.reduce(
        (total, day) => total + day.numPeriods,
        0,
      );

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Total de aulas no período: ${totalClassesInPeriod}`,
        pageWidth - 14,
        sectionY,
        { align: "right" },
      );
      doc.setTextColor(0);
      sectionY += 10;

      const attendanceData = students.map((student) => {
        // MODIFICADO: Usa frequência consolidada de TODAS as turmas pelas quais o aluno passou
        const consolidatedAttendance = calculateConsolidatedAttendance(
          student.id,
          course.subjectId,
          termStart,
          termEnd,
          course.schoolId,
        );
        return {
          student,
          absences: consolidatedAttendance.absences,
          frequency: consolidatedAttendance.frequency,
        };
      });

      const head = [["Nº", "Aluno", "Status", "% Frequência", "Faltas"]];
      const body = attendanceData.map((data) => [
        data.student.number || "-",
        data.student.name,
        data.student.status,
        `${data.frequency.toFixed(0)}%`,
        data.absences,
      ]);

      doc.autoTable({
        startY: sectionY,
        head,
        body,
        theme: "striped",
        headStyles: { fillColor: themeColor },
        alternateRowStyles: { fillColor: "#dadada" },
        didDrawPage: drawFooter,
        margin: { top: 28 },
      });
      finalY = doc.autoTable.previous.finalY + 10;

      const lowFreqStudents = attendanceData.filter((d) => d.frequency < 75);
      if (lowFreqStudents.length > 0) {
        doc.setFontSize(12);
        doc.text("Alunos com Baixa Frequência (< 75%)", 14, finalY);
        finalY += 8;
        const lowFreqBody = lowFreqStudents.map((data) => [
          data.student.number || "-",
          data.student.name,
          `${data.frequency.toFixed(0)}%`,
          data.absences,
        ]);
        doc.autoTable({
          startY: finalY,
          head: [["Nº", "Aluno", "% Frequência", "Faltas"]],
          body: lowFreqBody,
          theme: "striped",
          headStyles: { fillColor: "#e74c3c" },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          margin: { top: 28 },
        });
      }
    }

    if (includeContent) {
      addPageIfNeeded();
      let sectionY = 30;
      doc.setFontSize(14);
      doc.text("Relatório de Conteúdo Ministrado", 14, sectionY);
      sectionY += 8;

      const termKey = `${course.classId}_${course.subjectId}_${termStart}_${termEnd}`;
      const termContent = state.content[termKey]?.dailyRecords || {};

      let contentBody = [];
      reportClassDates.forEach((d) => {
        for (let i = 0; i < d.numPeriods; i++) {
          const record = getContentForLesson(
            course.classId,
            course.subjectId,
            termStart,
            termEnd,
            d.date,
            i,
          );
          if (!givenClassesOnly || (record && record.content)) {
            contentBody.push([
              new Date(d.date + "T12:00").toLocaleDateString("pt-BR"),
              record?.content ||
                (d.isSchoolDay ? "Nenhum registro" : d.description),
              record?.observations || "",
            ]);
          }
        }
      });

      if (contentBody.length > 0) {
        doc.autoTable({
          startY: sectionY,
          head: [["Data", "Conteúdo", "Observações"]],
          body: contentBody,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          margin: { top: 28 },
        });
      } else {
        doc.setFontSize(10);
        doc.text(
          "Nenhum conteúdo registrado para os filtros selecionados.",
          14,
          sectionY,
        );
      }
    }

    if (includeHomework) {
      addPageIfNeeded();
      let sectionY = 30;
      doc.setFontSize(14);
      doc.text("Relatório de Atividades em sala", 14, sectionY);
      sectionY += 8;

      const homeworks = state.homeworks.filter(
        (hw) =>
          hw.classId === course.classId &&
          hw.subjectId === course.subjectId &&
          hw.assignedDate >= termStart &&
          hw.assignedDate <= termEnd,
      );

      if (homeworks.length > 0) {
        const body = homeworks.map((hw) => [
          new Date(hw.assignedDate + "T12:00").toLocaleDateString("pt-BR"),
          new Date(hw.dueDate + "T12:00").toLocaleDateString("pt-BR"),
          hw.description,
        ]);
        doc.autoTable({
          startY: sectionY,
          head: [["Solicitação", "Entrega", "Descrição"]],
          body,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          margin: { top: 28 },
        });
      } else {
        doc.setFontSize(10);
        doc.text("Nenhuma atividade registrada no período.", 14, sectionY);
      }
    }

    if (includeOccurrences) {
      addPageIfNeeded();
      let sectionY = 30;
      doc.setFontSize(14);
      doc.text("Relatório de Ocorrências de Indisciplina", 14, sectionY);
      sectionY += 8;

      const occurrences = getOccurrencesWithDetails(
        courseId,
        termStart,
        termEnd,
      );

      if (occurrences.length > 0) {
        const body = occurrences.map((occurrence) => {
          const involvedStudents =
            occurrence.involvedStudentNames.length > 0
              ? occurrence.involvedStudentNames.join(", ")
              : "Não informado";
          const forwarded = occurrence.sentToPrincipal ? "Sim" : "Não";

          return [
            new Date(occurrence.occurrenceDate + "T12:00").toLocaleDateString(
              "pt-BR",
            ),
            involvedStudents,
            forwarded,
            occurrence.description,
          ];
        });

        doc.autoTable({
          startY: sectionY,
          head: [["Data", "Alunos Envolvidos", "Direção", "Descrição"]],
          body,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          margin: { top: 28 },
          columnStyles: {
            0: { cellWidth: 24 },
            1: { cellWidth: 60 },
            2: { cellWidth: 18, halign: "center" },
            3: { cellWidth: "auto" },
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text("Nenhuma ocorrência registrada no período.", 14, sectionY);
      }
    }

    if (showEvents) {
      addPageIfNeeded();
      let sectionY = 30;
      doc.setFontSize(14);
      doc.text("Eventos do Calendário no Período", 14, sectionY);
      sectionY += 8;

      const events = schoolCalendar.importantDates.filter(
        (d) => d.date >= termStart && d.date <= termEnd,
      );
      if (events.length > 0) {
        const body = events.map((evt) => [
          new Date(evt.date + "T12:00").toLocaleDateString("pt-BR"),
          evt.description,
          evt.isSchoolDay ? "Sim" : "Não",
        ]);
        doc.autoTable({
          startY: sectionY,
          head: [["Data", "Descrição", "Dia Letivo?"]],
          body,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          margin: { top: 28 },
        });
      } else {
        doc.setFontSize(10);
        doc.text("Nenhum evento registrado no período.", 14, sectionY);
      }
    }

    doc.save(
      `Relatorio_Detalhado_${course.name.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  const generateSimpleClassListPdf = (classId) => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const cls = state.classes.find((c) => c.id === classId);
    if (!cls) {
      CustomSwal.fire("Erro", "Turma não encontrada.", "error");
      return;
    }

    const school = state.schools.find((s) => s.id === cls.schoolId);
    const students = getStudentsForClass(
      classId,
      isReportOnlyActiveStudentsEnabled(),
    );

    if (students.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Não há alunos nesta turma para gerar o relatório.",
        "info",
      );
      return;
    }

    const doc = new jsPDF();
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(`Turma: ${cls.name}`, data.settings.margin.left, footerY);
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      }); // Identificação do Sistema
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    doc.setFontSize(16);
    doc.text(`Lista de Alunos`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Turma: ${cls.name}`, 14, 21);
    doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 26);

    const head = [["Nº", "Nome do Aluno", "RA"]];
    const body = students.map((s) => [
      s.number || "-",
      buildPdfStudentNameCell(s, cls.name),
      s.ra || "-",
    ]);

    doc.autoTable({
      startY: 35,
      head: head,
      body: body,
      theme: "striped",
      headStyles: { fillColor: themeColor },
      alternateRowStyles: { fillColor: "#dadada" },
      didDrawPage: drawFooter,
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          drawPdfStudentStrikeThrough(doc, data);
        }
      },
    });

    doc.save(`Lista_Alunos_${cls.name.replace(/\s/g, "_")}.pdf`);
  };

  const generateClassListPdf = ({
    selectedClassIds = [],
    columns = [],
    onlyActive = true,
    separateTabs = false,
  } = {}) => {
    if (!window.jspdf) {
      CustomSwal.fire("Erro", "Biblioteca de PDF não disponível.", "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    if (!selectedClassIds.length) {
      CustomSwal.fire("Atenção", "Nenhuma turma selecionada.", "warning");
      return;
    }

    const classesToReport = state.classes
      .filter((c) => selectedClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!classesToReport.length) {
      CustomSwal.fire("Atenção", "Nenhuma turma encontrada.", "info");
      return;
    }

    const baseColumnMap = {
      number: { label: "Nº" },
      name: { label: "Nome" },
      ra: { label: "RA" },
      class: { label: "Turma" },
      status: { label: "Status" },
    };

    const orderedColumns = columns
      .map((col) => {
        if (col?.type === "base" && baseColumnMap[col.key]) {
          return {
            type: "base",
            key: col.key,
            label: col.label || baseColumnMap[col.key].label,
          };
        }
        if (col?.type === "custom") {
          const label = String(col.label || "").trim();
          if (!label) return null;
          return { type: "custom", key: null, label };
        }
        return null;
      })
      .filter(Boolean);

    if (!orderedColumns.length) {
      CustomSwal.fire("Atenção", "Selecione ao menos uma coluna.", "warning");
      return;
    }

    const getStudentsForClass = (clsId) =>
      state.students
        .filter((s) => s.classId === clsId)
        .filter((s) => (onlyActive ? (s.status || "ativo") === "ativo" : true))
        .sort(
          (a, b) =>
            (a.number || 999) - (b.number || 999) ||
            a.name.localeCompare(b.name),
        );

    const buildPdfRow = (s, cls) =>
      orderedColumns.map((col) => {
        if (col.type === "custom") return "";
        if (col.key === "name") {
          return buildPdfStudentNameCell(s, cls.name || "");
        }
        const rowMap = {
          number: String(s.number || ""),
          name: s.name || "",
          ra: s.ra || "",
          class: cls.name || "",
          status: s.status || "ativo",
        };
        return String(rowMap[col.key] ?? "");
      });

    const pdfHeader = [orderedColumns.map((col) => col.label)];
    const isMulti = classesToReport.length > 1;

    const doc = new jsPDF();
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const reportTitle = isMulti
      ? "Lista de Alunos - Todas as Turmas"
      : `Lista de Alunos - ${classesToReport[0].name}`;
    const fileName = isMulti
      ? `Lista_Alunos_Todas_Turmas_${new Date().toISOString().split("T")[0]}.pdf`
      : `Lista_Alunos_${classesToReport[0].name.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(reportTitle, data.settings.margin.left, footerY);
      doc.text("Sistema actEducação", pageWidth / 2, footerY, {
        align: "center",
      });
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    if (separateTabs && isMulti) {
      let isFirst = true;
      classesToReport.forEach((cls) => {
        const students = getStudentsForClass(cls.id);
        if (!students.length) return;
        if (!isFirst) doc.addPage();
        isFirst = false;
        doc.setFontSize(14);
        doc.text(`Turma: ${cls.name}`, 14, 15);
        const school = state.schools.find((s) => s.id === cls.schoolId);
        doc.setFontSize(10);
        doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 21);
        doc.autoTable({
          startY: 28,
          head: pdfHeader,
          body: students.map((s) => buildPdfRow(s, cls)),
          theme: "striped",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              drawPdfStudentStrikeThrough(doc, data);
            }
          },
        });
      });
    } else {
      doc.setFontSize(16);
      doc.text(reportTitle, 14, 15);
      doc.setFontSize(10);
      if (!isMulti) {
        const cls = classesToReport[0];
        const school = state.schools.find((s) => s.id === cls.schoolId);
        doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 21);
      }
      const body = [];
      classesToReport.forEach((cls) => {
        getStudentsForClass(cls.id).forEach((s) =>
          body.push(buildPdfRow(s, cls)),
        );
      });
      if (!body.length) {
        CustomSwal.fire(
          "Atenção",
          "Não há alunos na(s) turma(s) selecionada(s).",
          "info",
        );
        return;
      }
      doc.autoTable({
        startY: isMulti ? 22 : 27,
        head: pdfHeader,
        body,
        theme: "striped",
        headStyles: { fillColor: themeColor },
        alternateRowStyles: { fillColor: "#dadada" },
        didDrawPage: drawFooter,
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            drawPdfStudentStrikeThrough(doc, data);
          }
        },
      });
    }
    doc.save(fileName);
  };

  const openClassExportModal = async ({ all = false, classId = null } = {}) => {
    const availableClasses = [...state.classes].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const modalState = {
      columns: [
        { id: "base:number", type: "base", key: "number", label: "Nº" },
        { id: "base:name", type: "base", key: "name", label: "Nome" },
        { id: "base:ra", type: "base", key: "ra", label: "RA" },
        { id: "base:class", type: "base", key: "class", label: "Turma" },
        { id: "base:status", type: "base", key: "status", label: "Status" },
      ],
      customCounter: 1,
      draggingId: null,
      selectedClassIds: [],
    };

    const baseColumns = [
      { id: "base:number", key: "number", label: "Nº" },
      { id: "base:name", key: "name", label: "Nome" },
      { id: "base:ra", key: "ra", label: "RA" },
      { id: "base:class", key: "class", label: "Turma" },
      { id: "base:status", key: "status", label: "Status" },
    ];

    modalState.selectedClassIds = all
      ? availableClasses.map((c) => c.id)
      : classId
        ? [classId]
        : [];

    const result = await CustomSwal.fire({
      title:
        '<i class="fas fa-file-export mr-2" style="color:var(--theme-color);"></i>Exportar para arquivo',
      width: 980,
      html: `
        <div class="export-modal-layout" id="export-modal-layout">
          <div class="swal-modern-form text-left export-main-pane" style="gap:1rem;">
            ${
              all
                ? `
            <div class="swal-modern-input-group">
              <div class="flex justify-between items-center mb-2">
                <strong class="swal-modern-label" style="margin-bottom:0;">Turmas a incluir:</strong>
                <button id="export-toggle-all" type="button" class="btn btn-subtle" style="padding:2px 10px; font-size:0.75rem;">Desmarcar todas</button>
              </div>
              <div id="export-class-list" class="export-class-grid">
                ${availableClasses.map((c) => `<label class="export-class-item"><input type="checkbox" class="export-class-cb" data-class-id="${escapeHtml(c.id)}" checked><span>${escapeHtml(c.name)}</span></label>`).join("")}
              </div>
            </div>`
                : ""
            }
            <div class="excel-field-grid">
              <label class="excel-toggle-field">
                <input id="excel-col-number" type="checkbox" checked>
                <span class="excel-toggle-box"><i class="fas fa-check"></i></span>
                <span class="excel-toggle-label">Nº</span>
              </label>
              <label class="excel-toggle-field">
                <input id="excel-col-name" type="checkbox" checked>
                <span class="excel-toggle-box"><i class="fas fa-check"></i></span>
                <span class="excel-toggle-label">Nome</span>
              </label>
              <label class="excel-toggle-field">
                <input id="excel-col-ra" type="checkbox" checked>
                <span class="excel-toggle-box"><i class="fas fa-check"></i></span>
                <span class="excel-toggle-label">RA</span>
              </label>
              <label class="excel-toggle-field">
                <input id="excel-col-class" type="checkbox" checked>
                <span class="excel-toggle-box"><i class="fas fa-check"></i></span>
                <span class="excel-toggle-label">Turma</span>
              </label>
              <label class="excel-toggle-field">
                <input id="excel-col-status" type="checkbox" checked>
                <span class="excel-toggle-box"><i class="fas fa-check"></i></span>
                <span class="excel-toggle-label">Status</span>
              </label>
              <label class="excel-toggle-field">
                <input id="excel-only-active" type="checkbox" checked>
                <span class="excel-toggle-box"><i class="fas fa-check"></i></span>
                <span class="excel-toggle-label">Exibir apenas alunos ativos</span>
              </label>
              ${
                all
                  ? `<label class="excel-toggle-field">
                <input id="excel-separate-tabs" type="checkbox">
                <span class="excel-toggle-box"><i class="fas fa-check"></i></span>
                <span class="excel-toggle-label" id="excel-separate-label">Separar turmas</span>
              </label>`
                  : ""
              }
            </div>
            <div class="swal-modern-input-group">
              <strong class="swal-modern-label">Pré-visualização do cabeçalho:</strong>
              <div class="overflow-x-auto border rounded-lg" style="border-color: var(--border-color);">
                <table class="min-w-full">
                  <thead><tr id="excel-header-preview"></tr></thead>
                </table>
              </div>
            </div>
            <button id="excel-toggle-advanced" type="button" class="btn btn-subtle w-full" style="justify-content:space-between;">
              <span><i class="fas fa-columns mr-2"></i>Abrir configurações avançadas</span>
              <i id="excel-advanced-chevron" class="fas fa-chevron-right" style="transition:transform .25s;"></i>
            </button>
          </div>

          <aside id="excel-advanced-section" class="export-advanced-pane" aria-hidden="true">
            <div class="swal-modern-input-group" style="margin-bottom:0.75rem;">
              <strong class="swal-modern-label">Adicionar nova coluna (vazia):</strong>
              <div class="flex gap-2">
                <input id="excel-custom-field-input" type="text" class="form-input" placeholder="Ex.: Telefone, Observação..." />
                <button id="excel-custom-field-add" type="button" class="btn btn-primary" style="flex-shrink:0;"><i class="fas fa-plus mr-2"></i>Adicionar</button>
              </div>
            </div>
            <div class="swal-modern-input-group">
              <strong class="swal-modern-label">Ordem das colunas (arrastar para reorganizar):</strong>
              <ul id="excel-columns-sortable" class="border rounded-lg p-2 space-y-2 max-h-60 overflow-y-auto" style="border-color: var(--border-color);"></ul>
            </div>
          </aside>
        </div>
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-file-excel mr-2"></i> Gerar Excel',
      denyButtonText: '<i class="fas fa-file-pdf mr-2"></i> Gerar PDF',
      cancelButtonText: "Cancelar",
      customClass: {
        confirmButton: "btn btn-export-excel",
        denyButton: "btn btn-export-pdf",
        cancelButton: "btn btn-subtle",
      },
      didOpen: () => {
        const modal = CustomSwal.getPopup();
        if (!modal) return;

        if (all) {
          const toggleAllBtn = modal.querySelector("#export-toggle-all");
          const classCbs = modal.querySelectorAll(".export-class-cb");
          const syncToggleLabel = () => {
            const allChecked = Array.from(classCbs).every((cb) => cb.checked);
            if (toggleAllBtn)
              toggleAllBtn.textContent = allChecked
                ? "Desmarcar todas"
                : "Selecionar todas";
            modalState.selectedClassIds = Array.from(classCbs)
              .filter((cb) => cb.checked)
              .map((cb) => cb.dataset.classId);
          };
          classCbs.forEach((cb) =>
            cb.addEventListener("change", syncToggleLabel),
          );
          toggleAllBtn?.addEventListener("click", () => {
            const allChecked = Array.from(classCbs).every((cb) => cb.checked);
            classCbs.forEach((cb) => {
              cb.checked = !allChecked;
            });
            syncToggleLabel();
          });
          syncToggleLabel();
        }

        const sortable = modal.querySelector("#excel-columns-sortable");
        const preview = modal.querySelector("#excel-header-preview");
        const customInput = modal.querySelector("#excel-custom-field-input");
        const customAddBtn = modal.querySelector("#excel-custom-field-add");
        const checkboxByKey = {
          number: modal.querySelector("#excel-col-number"),
          name: modal.querySelector("#excel-col-name"),
          ra: modal.querySelector("#excel-col-ra"),
          class: modal.querySelector("#excel-col-class"),
          status: modal.querySelector("#excel-col-status"),
        };

        const isColumnSelected = (columnId) =>
          modalState.columns.some((column) => column.id === columnId);

        const render = () => {
          Object.entries(checkboxByKey).forEach(([key, element]) => {
            if (!element) return;
            element.checked = isColumnSelected(`base:${key}`);
          });

          if (sortable) {
            sortable.innerHTML = "";
            if (modalState.columns.length === 0) {
              sortable.innerHTML =
                '<li class="text-sm text-secondary p-2">Nenhuma coluna selecionada.</li>';
            } else {
              const clearDropIndicators = () => {
                sortable
                  .querySelectorAll(".excel-sortable-item")
                  .forEach((item) => {
                    item.classList.remove(
                      "excel-drop-above",
                      "excel-drop-below",
                    );
                  });
              };

              modalState.columns.forEach((column) => {
                const li = document.createElement("li");
                li.className =
                  "excel-sortable-item flex items-center justify-between p-2 rounded border cursor-move";
                li.style.cssText =
                  "border-color: var(--border-color); background-color: var(--bg-secondary); transition: opacity 0.15s ease;";
                li.setAttribute("draggable", "true");
                li.dataset.columnId = column.id;
                li.innerHTML = `
                  <div class="flex items-center gap-2">
                    <i class="fas fa-grip-vertical" style="color: var(--text-secondary);"></i>
                    <span style="font-size:0.875rem; color: var(--text-primary);">${escapeHtml(column.label)}</span>
                  </div>
                  ${
                    column.type === "custom"
                      ? `<button type="button" class="btn btn-subtle" style="padding:2px 10px; font-size:0.75rem;" data-remove-column-id="${escapeHtml(column.id)}"><i class="fas fa-times mr-1"></i>Remover</button>`
                      : `<span style="font-size:0.75rem; color: var(--text-secondary);">Padrão</span>`
                  }
                `;

                li.addEventListener("dragstart", (event) => {
                  modalState.draggingId = column.id;
                  li.classList.add("excel-dragging");
                  event.dataTransfer.effectAllowed = "move";
                });
                li.addEventListener("dragend", () => {
                  modalState.draggingId = null;
                  li.classList.remove("excel-dragging");
                  clearDropIndicators();
                });
                li.addEventListener("dragover", (event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  clearDropIndicators();
                  const rect = li.getBoundingClientRect();
                  const mid = rect.top + rect.height / 2;
                  if (event.clientY < mid) {
                    li.classList.add("excel-drop-above");
                  } else {
                    li.classList.add("excel-drop-below");
                  }
                });
                li.addEventListener("dragleave", () => {
                  clearDropIndicators();
                });
                li.addEventListener("drop", (event) => {
                  event.preventDefault();
                  clearDropIndicators();
                  const rect = li.getBoundingClientRect();
                  const mid = rect.top + rect.height / 2;
                  const dropBefore = event.clientY < mid;
                  const dragId = modalState.draggingId;
                  const targetId = column.id;
                  if (!dragId || dragId === targetId) return;
                  const fromIndex = modalState.columns.findIndex(
                    (c) => c.id === dragId,
                  );
                  const toIndex = modalState.columns.findIndex(
                    (c) => c.id === targetId,
                  );
                  if (fromIndex < 0 || toIndex < 0) return;
                  const [moved] = modalState.columns.splice(fromIndex, 1);
                  const newToIndex = modalState.columns.findIndex(
                    (c) => c.id === targetId,
                  );
                  modalState.columns.splice(
                    dropBefore ? newToIndex : newToIndex + 1,
                    0,
                    moved,
                  );
                  render();
                });

                sortable.appendChild(li);
              });
            }
          }

          if (preview) {
            preview.innerHTML = "";
            modalState.columns.forEach((column) => {
              const th = document.createElement("th");
              th.textContent = column.label;
              th.className = "text-center";
              preview.appendChild(th);
            });
          }
        };

        Object.entries(checkboxByKey).forEach(([key, element]) => {
          if (!element) return;
          element.addEventListener("change", () => {
            const columnId = `base:${key}`;
            const existingIndex = modalState.columns.findIndex(
              (column) => column.id === columnId,
            );
            if (element.checked && existingIndex === -1) {
              const baseInfo = baseColumns.find(
                (column) => column.id === columnId,
              );
              if (baseInfo) {
                modalState.columns.push({
                  id: baseInfo.id,
                  type: "base",
                  key: baseInfo.key,
                  label: baseInfo.label,
                });
              }
            }
            if (!element.checked && existingIndex !== -1) {
              modalState.columns.splice(existingIndex, 1);
            }
            render();
          });
        });

        if (customAddBtn && customInput) {
          const addCustomField = () => {
            const label = (customInput.value || "").trim();
            if (!label) return;
            modalState.columns.push({
              id: `custom:${modalState.customCounter++}`,
              type: "custom",
              label,
            });
            customInput.value = "";
            customInput.focus();
            render();
          };
          customAddBtn.addEventListener("click", addCustomField);
          customInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomField();
            }
          });
        }

        if (sortable) {
          sortable.addEventListener("click", (event) => {
            const removeBtn = event.target.closest("[data-remove-column-id]");
            if (!removeBtn) return;
            const removeId = removeBtn.dataset.removeColumnId;
            modalState.columns = modalState.columns.filter(
              (column) => column.id !== removeId,
            );
            render();
          });
          sortable.addEventListener("dragover", (event) => {
            event.preventDefault();
          });
          sortable.addEventListener("drop", (event) => {
            event.preventDefault();
            if (!modalState.draggingId) return;
            const exists = modalState.columns.some(
              (column) => column.id === modalState.draggingId,
            );
            if (!exists) return;
            const movedIndex = modalState.columns.findIndex(
              (column) => column.id === modalState.draggingId,
            );
            if (movedIndex > -1) {
              const [moved] = modalState.columns.splice(movedIndex, 1);
              modalState.columns.push(moved);
              render();
            }
          });
        }

        const toggleAdvancedBtn = modal.querySelector("#excel-toggle-advanced");
        const advancedLayout = modal.querySelector("#export-modal-layout");
        const advancedSection = modal.querySelector("#excel-advanced-section");
        const advancedChevron = modal.querySelector("#excel-advanced-chevron");
        if (toggleAdvancedBtn && advancedSection && advancedLayout) {
          toggleAdvancedBtn.addEventListener("click", () => {
            const isOpen =
              advancedLayout.classList.contains("is-advanced-open");
            advancedLayout.classList.toggle("is-advanced-open", !isOpen);
            advancedSection.setAttribute(
              "aria-hidden",
              isOpen ? "true" : "false",
            );
            if (advancedChevron) {
              advancedChevron.style.transform = isOpen ? "" : "rotate(90deg)";
            }
            toggleAdvancedBtn.querySelector("span").innerHTML = isOpen
              ? '<i class="fas fa-columns mr-2"></i>Abrir configurações avançadas'
              : '<i class="fas fa-columns mr-2"></i>Ocultar configurações avançadas';
          });
        }

        render();
      },
      preConfirm: () => {
        if (all && modalState.selectedClassIds.length === 0) {
          CustomSwal.showValidationMessage("Selecione ao menos uma turma.");
          return false;
        }
        if (modalState.columns.length === 0) {
          CustomSwal.showValidationMessage("Selecione ao menos uma coluna.");
          return false;
        }
        return {
          format: "excel",
          selectedClassIds: modalState.selectedClassIds,
          onlyActive:
            document.getElementById("excel-only-active")?.checked ?? true,
          separateTabs: all
            ? (document.getElementById("excel-separate-tabs")?.checked ?? false)
            : false,
          columns: modalState.columns.map((column) => ({
            type: column.type,
            key: column.key,
            label: column.label,
          })),
        };
      },
      preDeny: () => {
        if (all && modalState.selectedClassIds.length === 0) {
          CustomSwal.showValidationMessage("Selecione ao menos uma turma.");
          return false;
        }
        if (modalState.columns.length === 0) {
          CustomSwal.showValidationMessage("Selecione ao menos uma coluna.");
          return false;
        }
        return {
          format: "pdf",
          selectedClassIds: modalState.selectedClassIds,
          onlyActive:
            document.getElementById("excel-only-active")?.checked ?? true,
          separateTabs: all
            ? (document.getElementById("excel-separate-tabs")?.checked ?? false)
            : false,
          columns: modalState.columns.map((column) => ({
            type: column.type,
            key: column.key,
            label: column.label,
          })),
        };
      },
    });

    if (!result.isConfirmed && !result.isDenied) return null;
    return result.value;
  };

  const generateClassListExcel = (options = {}) => {
    // Verifica se a biblioteca XLSX está disponível
    if (typeof XLSX === "undefined") {
      CustomSwal.fire(
        "Erro",
        "A biblioteca para gerar arquivos Excel (XLSX) não foi carregada.",
        "error",
      );
      return;
    }

    const {
      includeRA = true,
      includeNumber = true,
      includeClass = true,
      includeStatus = true,
      onlyActive = true,
      separateTabs = false,
      columns = null,
    } = options;

    let selectedClassIds = [];
    if (
      Array.isArray(options.selectedClassIds) &&
      options.selectedClassIds.length > 0
    ) {
      selectedClassIds = options.selectedClassIds;
    } else if (options.all) {
      selectedClassIds = state.classes.map((c) => c.id);
    } else if (options.classId) {
      selectedClassIds = [options.classId];
    } else {
      const selectElement = document.getElementById("report-classlist-select");
      if (!selectElement || !selectElement.value) {
        CustomSwal.fire(
          "Atenção",
          'Selecione uma turma ou "Todas as Turmas".',
          "warning",
        );
        return;
      }
      selectedClassIds =
        selectElement.value === "all"
          ? state.classes.map((c) => c.id)
          : [selectElement.value];
    }

    if (selectedClassIds.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Nenhuma turma encontrada para gerar o relatório.",
        "info",
      );
      return;
    }

    const isAllClasses = selectedClassIds.length > 1;
    const classesToReport = state.classes
      .filter((c) => selectedClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const baseColumnMap = {
      number: { key: "number", label: "Nº", wch: 8 },
      name: { key: "name", label: "Nome", wch: 40 },
      ra: { key: "ra", label: "RA", wch: 18 },
      class: { key: "class", label: "Turma", wch: 24 },
      status: { key: "status", label: "Status", wch: 14 },
    };

    const fallbackColumns = [
      { type: "base", key: "number", label: "Nº", enabled: includeNumber },
      { type: "base", key: "name", label: "Nome", enabled: true },
      { type: "base", key: "ra", label: "RA", enabled: includeRA },
      { type: "base", key: "class", label: "Turma", enabled: includeClass },
      {
        type: "base",
        key: "status",
        label: "Status",
        enabled: includeStatus,
      },
    ].filter((column) => column.enabled);

    const requestedColumns =
      Array.isArray(columns) && columns.length > 0 ? columns : fallbackColumns;

    const orderedColumns = requestedColumns
      .map((column) => {
        if (column?.type === "base" && baseColumnMap[column.key]) {
          const baseInfo = baseColumnMap[column.key];
          return {
            type: "base",
            key: baseInfo.key,
            label: column.label || baseInfo.label,
            wch: baseInfo.wch,
          };
        }

        if (column?.type === "custom") {
          const customLabel = String(column.label || "").trim();
          if (!customLabel) return null;
          return {
            type: "custom",
            key: null,
            label: customLabel,
            wch: Math.max(16, Math.min(40, customLabel.length + 6)),
          };
        }

        return null;
      })
      .filter(Boolean);

    if (orderedColumns.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Selecione ao menos uma coluna para gerar o relatório.",
        "warning",
      );
      return;
    }

    const header = orderedColumns.map((column) => column.label);

    const themeColorHex = state.settings?.color || "#4CAF50";
    const normalizeHexColor = (hex) => {
      const clean = String(hex || "")
        .trim()
        .replace("#", "");
      if (clean.length === 3) {
        return clean
          .split("")
          .map((char) => char + char)
          .join("")
          .toUpperCase();
      }
      if (/^[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
      return "4CAF50";
    };

    const getStudentsForClass = (clsId) =>
      state.students
        .filter((s) => s.classId === clsId)
        .filter((s) => (onlyActive ? (s.status || "ativo") === "ativo" : true))
        .sort(
          (a, b) =>
            (a.number || 999) - (b.number || 999) ||
            a.name.localeCompare(b.name),
        );

    const buildRows = (cls, students) =>
      students.map((s) => {
        const rowMap = {
          number: s.number || "",
          name: s.name || "",
          ra: s.ra || "",
          class: cls.name || "",
          status: s.status || "ativo",
        };

        return orderedColumns.map((column) => {
          if (column.type === "custom") return "";
          return rowMap[column.key] ?? "";
        });
      });

    const applyTableStyles = (worksheet, rowsCount, colsCount) => {
      const themeHex = normalizeHexColor(themeColorHex);
      const headerFill = { patternType: "solid", fgColor: { rgb: themeHex } };
      const headerFont = { bold: true, color: { rgb: "FFFFFF" } };
      const zebraFill = { patternType: "solid", fgColor: { rgb: "F3F4F6" } };
      const border = {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } },
      };

      for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
        for (let colIndex = 0; colIndex < colsCount; colIndex++) {
          const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          if (!worksheet[address]) {
            worksheet[address] = { t: "s", v: "" };
          }

          const style = {
            border,
            alignment: { vertical: "center", horizontal: "left" },
          };

          if (rowIndex === 0) {
            style.fill = headerFill;
            style.font = headerFont;
            style.alignment = { vertical: "center", horizontal: "center" };
          } else if (rowIndex % 2 === 0) {
            style.fill = zebraFill;
          }

          worksheet[address].s = style;
        }
      }
    };

    const buildWorksheet = (cls, students) => {
      const rows = [header, ...buildRows(cls, students)];
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const cols = orderedColumns.map((column) => ({ wch: column.wch }));
      worksheet["!cols"] = cols;
      worksheet["!rows"] = Array.from({ length: rows.length }, () => ({
        hpx: 20,
      }));
      applyTableStyles(worksheet, rows.length, cols.length);
      return worksheet;
    };

    const studentsByClass = classesToReport.map((cls) => ({
      cls,
      students: getStudentsForClass(cls.id),
    }));

    const totalStudents = studentsByClass.reduce(
      (acc, item) => acc + item.students.length,
      0,
    );

    if (totalStudents === 0) {
      CustomSwal.fire(
        "Atenção",
        "Não há alunos na(s) turma(s) selecionada(s) para gerar o relatório.",
        "info",
      );
      return;
    }

    const sanitizeSheetName = (name) =>
      String(name || "Turma")
        .replace(/[\\/*?:\[\]]/g, "-")
        .substring(0, 31) || "Turma";

    const getMergedSheetName = () => {
      if (!classesToReport || classesToReport.length === 0) {
        return "Turma";
      }

      if (classesToReport.length === 1) {
        return `Turma - ${classesToReport[0].name}`;
      }

      return "Todas as turmas";
    };

    const workbook = XLSX.utils.book_new();

    if (separateTabs && isAllClasses) {
      studentsByClass.forEach(({ cls, students }) => {
        if (students.length === 0) return;
        const worksheet = buildWorksheet(cls, students);
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          sanitizeSheetName(cls.name),
        );
      });
    } else {
      const mergedRows = [header];
      studentsByClass.forEach(({ cls, students }) => {
        buildRows(cls, students).forEach((row) => mergedRows.push(row));
      });

      const worksheet = XLSX.utils.aoa_to_sheet(mergedRows);
      const cols = orderedColumns.map((column) => ({ wch: column.wch }));
      worksheet["!cols"] = cols;
      worksheet["!rows"] = Array.from({ length: mergedRows.length }, () => ({
        hpx: 20,
      }));
      applyTableStyles(worksheet, mergedRows.length, cols.length);
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        sanitizeSheetName(getMergedSheetName()),
      );
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Não há alunos na(s) turma(s) selecionada(s) para gerar o relatório.",
        "info",
      );
      return;
    }

    // Gera e baixa o arquivo Excel
    const fileName = isAllClasses
      ? `Lista_Alunos_Todas_Turmas_${new Date().toISOString().split("T")[0]}.xlsx`
      : `Lista_Alunos_${classesToReport[0].name.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const generateClassListReport = (options = {}) => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    let selectedClassIds = [];
    if (options.all) {
      selectedClassIds = state.classes.map((c) => c.id);
    } else {
      const selectElement = document.getElementById("report-classlist-select");
      if (!selectElement.value) {
        CustomSwal.fire(
          "Atenção",
          'Selecione uma turma ou "Todas as Turmas".',
          "warning",
        );
        return;
      }
      selectedClassIds =
        selectElement.value === "all"
          ? state.classes.map((c) => c.id)
          : [selectElement.value];
    }

    if (selectedClassIds.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Nenhuma turma encontrada para gerar o relatório.",
        "info",
      );
      return;
    }

    const doc = new jsPDF();
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const isAllClasses = selectedClassIds.length > 1;

    let reportTitle = isAllClasses
      ? "Lista de Alunos - Todas as Turmas"
      : `Lista de Alunos - ${state.classes.find((c) => c.id === selectedClassIds[0]).name}`;
    let fileName = isAllClasses
      ? "Lista_Alunos_Todas_Turmas"
      : `Lista_Alunos_${reportTitle.replace("Lista de Alunos - ", "").replace(/\s/g, "_")}`;

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(reportTitle, data.settings.margin.left, footerY);
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      }); // Identificação do Sistema
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    doc.setFontSize(16);
    doc.text(reportTitle, 14, 15);

    if (!isAllClasses) {
      const cls = state.classes.find((c) => c.id === selectedClassIds[0]);
      const school = state.schools.find((s) => s.id === cls.schoolId);
      const schoolCalendar = state.calendars[school.id];
      const schoolYear =
        schoolCalendar &&
        schoolCalendar.terms &&
        schoolCalendar.terms.length > 0
          ? new Date(schoolCalendar.terms[0].startDate).getFullYear()
          : new Date().getFullYear();
      doc.setFontSize(10);
      doc.text(`Ano Letivo: ${schoolYear}`, 14, 21);
      doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 26);
    } else {
      const firstSchool = state.schools[0];
      const schoolCalendar = state.calendars[firstSchool.id];
      const schoolYear =
        schoolCalendar &&
        schoolCalendar.terms &&
        schoolCalendar.terms.length > 0
          ? new Date(schoolCalendar.terms[0].startDate).getFullYear()
          : new Date().getFullYear();
      doc.setFontSize(10);
      doc.text(`Ano Letivo: ${schoolYear}`, 14, 21);
    }

    const head = [["Nº", "Nome", "RA", "Turma/Série"]];
    const classesToReport = state.classes
      .filter((c) => selectedClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const body = [];
    classesToReport.forEach((cls) => {
      const students = getStudentsForClass(
        cls.id,
        isReportOnlyActiveStudentsEnabled(),
      );

      students.forEach((s) => {
        body.push([
          s.number || "-",
          buildPdfStudentNameCell(s, cls.name),
          s.ra || "-",
          cls.name,
        ]);
      });
    });

    if (body.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Não há alunos na(s) turma(s) selecionada(s).",
        "info",
      );
      return;
    }

    doc.autoTable({
      startY: isAllClasses ? 25 : 30,
      head,
      body,
      theme: "striped",
      headStyles: { fillColor: themeColor },
      alternateRowStyles: { fillColor: "#dadada" },
      didDrawPage: drawFooter,
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          drawPdfStudentStrikeThrough(doc, data);
        }
      },
    });

    doc.save(`${fileName}.pdf`);
  };

  const generateLaudadosReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;
    const orientation = document.querySelector(
      'input[name="report-orientation-laudados"]:checked',
    ).value;

    const schoolId = document.getElementById("laudados-school-select").value;
    const classId = document.getElementById("laudados-class-select").value;

    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
    });

    let studentsWithLaudo = state.students.filter((s) => s.hasLaudo);
    if (isReportOnlyActiveStudentsEnabled()) {
      studentsWithLaudo = studentsWithLaudo.filter(
        (s) => (s.status || "ativo") === "ativo",
      );
    }
    let classesToReportOn = state.classes;
    let reportTitle = "Relatorio_Alunos_Laudados";
    let schoolName = "Todas as Escolas";
    let className = "Todas as Turmas";

    if (schoolId) {
      const school = state.schools.find((s) => s.id === schoolId);
      schoolName = school.name;
      reportTitle += `_${school.name.replace(/\s/g, "_")}`;
      classesToReportOn = classesToReportOn.filter(
        (c) => c.schoolId === schoolId,
      );
      const classIds = classesToReportOn.map((c) => c.id);
      studentsWithLaudo = studentsWithLaudo.filter((s) =>
        classIds.includes(s.classId),
      );
    }

    if (classId) {
      const cls = state.classes.find((c) => c.id === classId);
      className = cls.name;
      reportTitle += `_${cls.name.replace(/\s/g, "_")}`;
      classesToReportOn = [cls];
      studentsWithLaudo = studentsWithLaudo.filter(
        (s) => s.classId === classId,
      );
    }

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const pageWidth =
        doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(`Escola: ${schoolName}`, data.settings.margin.left, footerY);
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      }); // Identificação do Sistema
      doc.text(
        new Date().toLocaleDateString("pt-BR"),
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    const schoolYearForLaudos = schoolId
      ? (() => {
          const school = state.schools.find((s) => s.id === schoolId);
          const cal = state.calendars[school.id];
          return cal && cal.terms && cal.terms.length > 0
            ? new Date(cal.terms[0].startDate).getFullYear()
            : new Date().getFullYear();
        })()
      : (() => {
          const firstSchool = state.schools[0];
          const cal = state.calendars[firstSchool?.id];
          return cal && cal.terms && cal.terms.length > 0
            ? new Date(cal.terms[0].startDate).getFullYear()
            : new Date().getFullYear();
        })();
    doc.setFontSize(18);
    doc.text("Relatório de Alunos com Laudo", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Ano Letivo: ${schoolYearForLaudos} | Escola: ${schoolName} | Turma: ${className}`,
      14,
      21,
    );
    doc.setTextColor(0);

    if (studentsWithLaudo.length === 0) {
      doc.setFontSize(11);
      doc.text(
        "Nenhum aluno com laudo encontrado para os filtros selecionados.",
        14,
        30,
      );
      doc.save(`${reportTitle}_${new Date().toISOString().split("T")[0]}.pdf`);
      return;
    }

    const head = [["Nº", "Aluno", "Status"]];
    const studentsByClass = classesToReportOn
      .sort((a, b) => a.name.localeCompare(b.name))
      .reduce((acc, cls) => {
        const classStudents = studentsWithLaudo
          .filter((s) => s.classId === cls.id)
          .sort(
            (a, b) =>
              (a.number || 999) - (b.number || 999) ||
              a.name.localeCompare(b.name),
          );

        if (classStudents.length > 0) {
          acc.push({ className: cls.name, students: classStudents });
        }
        return acc;
      }, []);

    let startY = 30;
    studentsByClass.forEach((classGroup) => {
      const body = classGroup.students.map((s) => [
        s.number || "-",
        s.name,
        s.status,
      ]);

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(`Turma: ${classGroup.className}`, 14, startY);
      startY += 8;

      doc.autoTable({
        startY: startY,
        head: head,
        body: body,
        theme: "grid",
        headStyles: { fillColor: themeColor },
        alternateRowStyles: { fillColor: "#dadada" },
        didDrawPage: drawFooter,
        margin: { top: 28 },
      });
      startY = doc.autoTable.previous.finalY + 10;
    });

    doc.save(`${reportTitle}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const openEditDateModal = (schoolId, dateId) => {
    const calendar = state.calendars[schoolId];
    const dateItem = calendar.importantDates.find((d) => d.id === dateId);

    if (!dateItem) return;

    CustomSwal.fire({
      title: "Editar Data Importante",
      html: `
            <form class="swal-modern-form">
                <div class="swal-modern-input-group">
                    <label for="edit-date-input" class="swal-modern-label">Data</label>
                    <input type="date" id="edit-date-input" class="swal-modern-input" value="${dateItem.date}">
                </div>
                <div class="swal-modern-input-group">
                    <label for="edit-desc-input" class="swal-modern-label">Descrição</label>
                    <input type="text" id="edit-desc-input" class="swal-modern-input" value="${dateItem.description}">
                </div>
                 <div class="swal-modern-checkbox-group pt-2">
                    <input type="checkbox" id="edit-is-school-day-input" class="form-checkbox h-5 w-5 text-[var(--theme-color)]" ${dateItem.isSchoolDay ? "checked" : ""}>
                    <label for="edit-is-school-day-input" class="swal-modern-label cursor-pointer">Dia Letivo</label>
                </div>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const date = document.getElementById("edit-date-input").value;
        const description = document
          .getElementById("edit-desc-input")
          .value.trim();
        const isSchoolDay = document.getElementById(
          "edit-is-school-day-input",
        ).checked;

        if (!date || !description) {
          Swal.showValidationMessage("Data e descrição são obrigatórias.");
          return false;
        }
        return { date, description, isSchoolDay };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        dateItem.date = result.value.date;
        dateItem.description = result.value.description;
        dateItem.isSchoolDay = result.value.isSchoolDay;
        saveData();
        // ALTERADO: Passa o schoolId para manter a seleção e o conteúdo visível
        renderPage("school-data", { tab: "calendar", schoolId: schoolId });
      }
    });
  };

  const saveData = () => {
    try {
      // 1. A linha abaixo foi REATIVADA para garantir o salvamento no navegador.
      //localStorage.setItem('actEducacaoData', JSON.stringify(state));

      // 2. A função para salvar no arquivo continua funcionando normalmente.
      saveDataToFile();
    } catch (error) {
      console.error("Erro ao salvar os dados:", error);
      //CustomSwal.fire('Erro Crítico', 'Não foi possível salvar os dados. Verifique o espaço de armazenamento do navegador.', 'error');
      CustomSwal.fire(
        "Erro Crítico",
        "Ocorreu um erro inesperado ao tentar salvar os dados no arquivo.",
        "error",
      );
    }
  };

  const loadData = () => {
    // Esta função agora serve como um FALLBACK caso a API de arquivos não funcione ou
    // para carregar dados que possam ter sido salvos anteriormente no localStorage.
    try {
      const savedData = localStorage.getItem("actEducacaoData");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        state = { ...state, ...parsedData };

        // (Toda a lógica de verificação de propriedades que já existia)
        if (!state.settings)
          state.settings = { theme: "light-default", color: "#4CAF50" };
        if (!state.settings.theme) state.settings.theme = "light-default";
        if (!state.settings.color) state.settings.color = "#4CAF50";
        if (state.settings.minimumBlueGrade === undefined)
          state.settings.minimumBlueGrade = 5;
        if (state.settings.gradeDecimalPlaces === undefined)
          state.settings.gradeDecimalPlaces = 2;
        if (!state.settings.gradeRoundingMode)
          state.settings.gradeRoundingMode = "real";
        if (state.settings.sidebarCollapsed === undefined)
          state.settings.sidebarCollapsed = false;
        if (state.settings.diaryShowOnlyActiveStudents === undefined)
          state.settings.diaryShowOnlyActiveStudents = true;

        if (!state.students) state.students = [];
        if (!state.homeworks) state.homeworks = [];
        if (!state.occurrences) state.occurrences = [];
        if (!state.tasks) state.tasks = [];
        if (!state.notes) state.notes = [];
        if (!state.plannings) state.plannings = [];
        if (!state.planningTemplates) state.planningTemplates = [];
        if (!state.individualReportTemplates)
          state.individualReportTemplates = [];
        if (!state.studentIndividualReports)
          state.studentIndividualReports = [];
        if (!state.assessments) state.assessments = [];
        if (!state.grades) state.grades = {};
        if (!state.assessmentSettings) state.assessmentSettings = {};
        if (!state.gradesAdjustments) state.gradesAdjustments = {};
        if (!state.calculatedAverages) state.calculatedAverages = {};
        if (!state.termAttendance) state.termAttendance = {};
        if (!state.finalResults) state.finalResults = {};

        state.students.forEach((student) => {
          if (!student.status) student.status = "ativo";
          if (student.hasLaudo === undefined) student.hasLaudo = false;
          if (student.ra === undefined) student.ra = "";
        });

        state.tasks.forEach((task) => {
          if (task.isArchived === undefined) task.isArchived = false;
          if (
            !["none", "daily", "weekly", "monthly", "yearly"].includes(
              task.recurrence,
            )
          ) {
            task.recurrence = "none";
          }
        });
      }
    } catch (error) {
      console.error(
        "LOAD (localStorage): Erro fatal ao carregar ou processar os dados.",
        error,
      );
      // Redefine para o estado inicial em caso de falha grave
      state = {
        settings: {
          theme: "light-default",
          color: "#4CAF50",
          minimumBlueGrade: 5,
          gradeDecimalPlaces: 2,
          gradeRoundingMode: "real",
          sidebarCollapsed: false,
          diaryShowOnlyActiveStudents: true,
        },
        schools: [],
        teachers: [],
        subjects: [],
        classes: [],
        students: [],
        schedules: [],
        homeworks: [],
        occurrences: [],
        tasks: [],
        notes: [],
        plannings: [],
        individualReportTemplates: [],
        studentIndividualReports: [],
        attendance: {},
        content: {},
        calendars: {},
        assessments: [],
        grades: {},
        assessmentSettings: {},
        gradesAdjustments: {},
        calculatedAverages: {},
        termAttendance: {},
        finalResults: {},
      };
      saveData();
    }
  };

  const init = async () => {
    // Carrega dados do localStorage primeiro como um fallback inicial.
    loadData();

    // Aplica o estado da barra lateral antes mesmo de abrir o seletor de arquivo.
    applySidebarCollapsedState();

    let fileLoadedSuccessfully;

    if (!useNativeFilePicker) {
      // Em celulares/tablets (ou navegadores sem suporte à File System Access
      // API) não exibimos o modal de escolha: se já existirem dados salvos
      // automaticamente neste dispositivo em uma visita anterior, continua
      // de onde parou; caso contrário, carrega automaticamente o arquivo
      // "act_educacao_db.json" da raiz do projeto.
      const hasStoredAutoSaveData = !!localStorage.getItem(
        AUTO_SAVE_STORAGE_KEY,
      );
      if (hasStoredAutoSaveData) {
        localStorageAutoSaveActive = true;
        fileLoadedSuccessfully = true;
      } else {
        fileLoadedSuccessfully = await autoLoadRootJsonFile();
      }
    } else {
      // Exibe o modal para o usuário selecionar um arquivo.
      fileLoadedSuccessfully = await promptToLoadOrCreateFile();
    }

    // A lógica de inicialização da interface só continua se um arquivo for carregado/criado.
    if (fileLoadedSuccessfully) {
      // Garante que as verificações de `loadData` sejam aplicadas aos dados do arquivo.
      loadData();
      applyAppearance();
      initializeSidebarItemTitles();
      initializeSidebarToggleTooltip();
      applySidebarCollapsedState();
      attachGlobalEventListeners();
      renderPage("dashboard");
    } else {
      // Se o usuário cancelou tudo, exibe uma mensagem final.
      mainContent.innerHTML = `
                <div class="card p-6 text-center">
                    <h2 class="text-xl font-bold">Operação Cancelada</h2>
                    <p class="text-secondary mt-2">Para usar o sistema, por favor, recarregue a página e escolha uma opção para carregar ou criar um arquivo de dados.</p>
                </div>`;
    }
  };

  const exportReportToStyledExcel = ({
    fileName,
    sheetName,
    title,
    metaLines = [],
    headers = [],
    rows = [],
    gradeColumns = [],
    forceRedColumns = [],
    sheets = [],
  }) => {
    if (typeof XLSX === "undefined") {
      CustomSwal.fire(
        "Erro",
        "A biblioteca para gerar arquivos Excel (XLSX) não foi carregada.",
        "error",
      );
      return;
    }

    const sanitizeSheetName = (name) =>
      String(name || "Relatorio")
        .replace(/[\\/*?:\[\]]/g, "-")
        .substring(0, 31) || "Relatorio";

    const normalizeHexColor = (hex) => {
      const clean = String(hex || "")
        .trim()
        .replace("#", "");
      if (clean.length === 3) {
        return clean
          .split("")
          .map((char) => char + char)
          .join("")
          .toUpperCase();
      }
      if (/^[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
      return "4CAF50";
    };

    const themeHex = normalizeHexColor(state.settings?.color || "#4CAF50");
    const borderColor = "D1D5DB";
    const zebraHex = "F8FAFC";
    const metaFillHex = "F9FAFB";
    const titleFillHex = "E8F5E9";
    const successHex = "1D4ED8";
    const dangerHex = "DC2626";
    const neutralHex = "6B7280";
    const border = {
      top: { style: "thin", color: { rgb: borderColor } },
      bottom: { style: "thin", color: { rgb: borderColor } },
      left: { style: "thin", color: { rgb: borderColor } },
      right: { style: "thin", color: { rgb: borderColor } },
    };

    const buildStyledWorksheet = ({
      worksheetTitle,
      worksheetMetaLines = [],
      worksheetHeaders = [],
      worksheetRows = [],
      worksheetGradeColumns = [],
      worksheetForceRedColumns = [],
    }) => {
      const totalColumns = Math.max(1, worksheetHeaders.length || 1);
      const aoa = [];
      const merges = [];

      const pushMergedRow = (text) => {
        const rowIndex = aoa.length;
        aoa.push([text, ...Array(Math.max(0, totalColumns - 1)).fill("")]);
        if (totalColumns > 1) {
          merges.push({
            s: { r: rowIndex, c: 0 },
            e: { r: rowIndex, c: totalColumns - 1 },
          });
        }
      };

      pushMergedRow(worksheetTitle || "Relatório");
      worksheetMetaLines.forEach((line) => pushMergedRow(line));
      aoa.push([]);
      const headerRowIndex = aoa.length;
      aoa.push(worksheetHeaders);
      const dataStartRowIndex = aoa.length;
      worksheetRows.forEach((row) => aoa.push(row));

      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      sheet["!merges"] = merges;

      const colWidths = Array.from({ length: totalColumns }, (_, colIndex) => {
        const headerLen = String(worksheetHeaders[colIndex] || "").length;
        const maxDataLen = worksheetRows.reduce((maxLen, row) => {
          const raw =
            row[colIndex] === undefined || row[colIndex] === null
              ? ""
              : row[colIndex];
          const valueLen = String(raw).length;
          return Math.max(maxLen, valueLen);
        }, 0);
        return {
          wch: Math.max(10, Math.min(40, Math.max(headerLen, maxDataLen) + 2)),
        };
      });
      sheet["!cols"] = colWidths;

      const setCellStyle = (rowIndex, colIndex, style) => {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        if (!sheet[address]) return;
        sheet[address].s = style;
      };

      setCellStyle(0, 0, {
        fill: { patternType: "solid", fgColor: { rgb: titleFillHex } },
        font: { bold: true, sz: 14, color: { rgb: themeHex } },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      });

      worksheetMetaLines.forEach((_line, index) => {
        setCellStyle(index + 1, 0, {
          fill: { patternType: "solid", fgColor: { rgb: metaFillHex } },
          font: { color: { rgb: neutralHex } },
          alignment: { horizontal: "left", vertical: "center" },
          border,
        });
      });

      for (let col = 0; col < totalColumns; col++) {
        setCellStyle(headerRowIndex, col, {
          fill: { patternType: "solid", fgColor: { rgb: themeHex } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        });
      }

      worksheetRows.forEach((row, rowOffset) => {
        const rowIndex = dataStartRowIndex + rowOffset;
        const zebraFill = rowOffset % 2 === 1 ? zebraHex : null;

        for (let col = 0; col < totalColumns; col++) {
          const baseStyle = {
            font: { color: { rgb: "111827" } },
            alignment: {
              horizontal: col === 0 ? "center" : "left",
              vertical: "center",
            },
            border,
          };

          if (zebraFill) {
            baseStyle.fill = {
              patternType: "solid",
              fgColor: { rgb: zebraFill },
            };
          }

          if (
            worksheetGradeColumns.includes(col) ||
            worksheetForceRedColumns.includes(col)
          ) {
            baseStyle.alignment.horizontal = "center";
            const numericGrade = parseGradeNumericValue(row[col]);
            if (numericGrade !== null) {
              baseStyle.font = {
                color: {
                  rgb:
                    worksheetForceRedColumns.includes(col) ||
                    isRedGrade(numericGrade)
                      ? dangerHex
                      : successHex,
                },
                bold: true,
              };
            }
          }

          setCellStyle(rowIndex, col, baseStyle);
        }
      });

      return sheet;
    };

    const workbook = XLSX.utils.book_new();

    if (Array.isArray(sheets) && sheets.length > 0) {
      const usedSheetNames = new Set();

      const makeUniqueSheetName = (baseName) => {
        const cleanBase = sanitizeSheetName(baseName);
        if (!usedSheetNames.has(cleanBase)) {
          usedSheetNames.add(cleanBase);
          return cleanBase;
        }

        for (let index = 2; index < 100; index++) {
          const suffix = ` (${index})`;
          const trimmedBase = cleanBase.substring(0, 31 - suffix.length);
          const candidate = `${trimmedBase}${suffix}`;
          if (!usedSheetNames.has(candidate)) {
            usedSheetNames.add(candidate);
            return candidate;
          }
        }

        return cleanBase.substring(0, 31);
      };

      sheets.forEach((sheetDefinition) => {
        const worksheet = buildStyledWorksheet({
          worksheetTitle: sheetDefinition.title,
          worksheetMetaLines: sheetDefinition.metaLines || [],
          worksheetHeaders: sheetDefinition.headers || [],
          worksheetRows: sheetDefinition.rows || [],
          worksheetGradeColumns: sheetDefinition.gradeColumns || [],
          worksheetForceRedColumns: sheetDefinition.forceRedColumns || [],
        });

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          makeUniqueSheetName(sheetDefinition.sheetName || "Relatorio"),
        );
      });
    } else {
      const worksheet = buildStyledWorksheet({
        worksheetTitle: title,
        worksheetMetaLines: metaLines,
        worksheetHeaders: headers,
        worksheetRows: rows,
        worksheetGradeColumns: gradeColumns,
        worksheetForceRedColumns: forceRedColumns,
      });

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        sanitizeSheetName(sheetName || "Relatorio"),
      );
    }

    XLSX.writeFile(workbook, fileName || "relatorio.xlsx");
  };

  const generateAveragesExcelReport = () => {
    const courseId = document.getElementById(
      "grades-report-course-select",
    )?.value;
    const format =
      document.querySelector('input[name="grades-report-format"]:checked')
        ?.value || "coletivo";
    const studentSelect = document.getElementById(
      "grades-report-student-select",
    );
    const selectedStudentIds = studentSelect
      ? Array.from(studentSelect.selectedOptions).map((opt) => opt.value)
      : [];

    if (!courseId) {
      CustomSwal.fire("Atenção", "Selecione uma turma/disciplina.", "warning");
      return;
    }

    const course = getUniqueCourses().find((c) => c.id === courseId);
    if (!course) {
      CustomSwal.fire("Erro", "Turma/disciplina não encontrada.", "error");
      return;
    }

    const classInfo = state.classes.find((c) => c.id === course.classId);
    const subjectInfo = state.subjects.find((s) => s.id === course.subjectId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const schoolCalendar = state.calendars[school?.id];

    if (!schoolCalendar?.terms?.length) {
      CustomSwal.fire(
        "Dados Incompletos",
        "O calendário para a escola desta turma não foi configurado.",
        "error",
      );
      return;
    }

    const terms = schoolCalendar.terms
      .filter((term) => term.startDate && term.endDate)
      .sort((a, b) => a.id - b.id);

    const students = getStudentsForClass(
      course.classId,
      isReportOnlyActiveStudentsEnabled(),
    );

    const reportStudents =
      format === "individual" && selectedStudentIds.length > 0
        ? students.filter((student) => selectedStudentIds.includes(student.id))
        : students;

    if (!reportStudents.length) {
      CustomSwal.fire(
        "Atenção",
        "Nenhum aluno encontrado para exportação.",
        "info",
      );
      return;
    }

    const termTypeName =
      schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre";

    const headers = [
      "Nº",
      "Aluno",
      ...terms.map((term) => `${term.id}º ${termTypeName}`),
      "Média Final",
      "Sit. Final",
    ];

    const situationMap = {
      Aprovado: "Aprovado",
      "Aprovado pelo conselho": "Ap. Cons.",
      "Aprovado pelo Conselho": "Ap. Cons.",
      "Retido por frequência": "Ret. Freq.",
      "Retido por rendimento": "Ret. Rend.",
      "Retido por frequência e rendimento": "Ret. Freq. Rend.",
      Pendente: "Pendente",
    };

    const rows = reportStudents.map((student) => {
      const periodGrades = terms.map((term) => {
        const grade = getDefinitiveGrade(
          student.id,
          course.id,
          `${term.startDate}|${term.endDate}`,
        );
        return grade === null ? "--" : formatGradeValue(grade);
      });

      const finalResult = getFinalResult(student.id, course);
      const savedSituation =
        state.finalResults?.[`${student.id}_${course.id}`]?.situation;
      const effectiveSituation = savedSituation || finalResult.situation;
      let situationDisplay =
        situationMap[effectiveSituation] || effectiveSituation || "Pendente";

      if (!situationMap[effectiveSituation]) {
        if (String(effectiveSituation).includes("Aprovado")) {
          situationDisplay = "Aprov.";
        } else if (String(effectiveSituation).includes("Retido")) {
          situationDisplay = "Retido";
        }
      }

      return [
        student.number || "-",
        student.name,
        ...periodGrades,
        finalResult.finalGrade === null
          ? "--"
          : formatGradeValue(finalResult.finalGrade),
        situationDisplay,
      ];
    });

    exportReportToStyledExcel({
      fileName: `Relatorio_Medias_${sanitizeFileName(course.name)}.xlsx`,
      sheetName: "Medias",
      title: "Relatório de Médias por Período",
      metaLines: [
        `Escola: ${school?.name || "-"}`,
        `Turma: ${classInfo?.name || "-"} | Disciplina: ${subjectInfo?.name || "-"}`,
        `Formato: ${format === "individual" ? "Individual" : "Coletivo"}`,
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      ],
      headers,
      rows,
      gradeColumns: Array.from(
        { length: terms.length + 1 },
        (_, index) => index + 2,
      ),
    });
  };

  const generateDetailedBulletinExcelReport = () => {
    const courseId = document.getElementById(
      "grades-report-course-select",
    )?.value;
    const format =
      document.querySelector('input[name="grades-report-format"]:checked')
        ?.value || "coletivo";
    const studentSelect = document.getElementById(
      "grades-report-student-select",
    );
    const selectedStudentIds = studentSelect
      ? Array.from(studentSelect.selectedOptions).map((opt) => opt.value)
      : [];

    if (!courseId) {
      CustomSwal.fire("Atenção", "Selecione uma turma/disciplina.", "warning");
      return;
    }

    const course = getUniqueCourses().find((c) => c.id === courseId);
    if (!course) {
      CustomSwal.fire("Erro", "Turma/disciplina não encontrada.", "error");
      return;
    }

    const classInfo = state.classes.find((c) => c.id === course.classId);
    const subjectInfo = state.subjects.find((s) => s.id === course.subjectId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const schoolCalendar = state.calendars[school?.id];

    if (!schoolCalendar?.terms?.length) {
      CustomSwal.fire(
        "Dados Incompletos",
        "O calendário para a escola desta turma não foi configurado.",
        "error",
      );
      return;
    }

    const terms = schoolCalendar.terms
      .filter((term) => term.startDate && term.endDate)
      .sort((a, b) => a.id - b.id);
    const termTypeName =
      schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre";

    const students = getStudentsForClass(
      course.classId,
      isReportOnlyActiveStudentsEnabled(),
    );

    const reportStudents =
      format === "individual" && selectedStudentIds.length > 0
        ? students.filter((student) => selectedStudentIds.includes(student.id))
        : students;

    if (!reportStudents.length) {
      CustomSwal.fire(
        "Atenção",
        "Nenhum aluno encontrado para exportação.",
        "info",
      );
      return;
    }

    const headers = [
      "Nº",
      "Aluno",
      ...terms.map((term) => `${term.id}º ${termTypeName}`),
      "Média Final",
      "Freq. Anual",
      "Sit. Final",
    ];

    const rows = reportStudents.map((student) => {
      const periodGrades = terms.map((term) => {
        const grade = getDefinitiveGrade(
          student.id,
          course.id,
          `${term.startDate}|${term.endDate}`,
        );
        return grade === null ? "--" : formatGradeValue(grade);
      });

      const finalResult = getFinalResult(student.id, course);
      return [
        student.number || "-",
        student.name,
        ...periodGrades,
        finalResult.finalGrade === null
          ? "--"
          : formatGradeValue(finalResult.finalGrade),
        `${Number(finalResult.yearlyFrequency || 0).toFixed(0)}%`,
        finalResult.situation || "Pendente",
      ];
    });

    exportReportToStyledExcel({
      fileName: `Boletim_${sanitizeFileName(course.name)}.xlsx`,
      sheetName: "Boletim",
      title: "Boletim (Notas e Frequência)",
      metaLines: [
        `Escola: ${school?.name || "-"}`,
        `Turma: ${classInfo?.name || "-"} | Disciplina: ${subjectInfo?.name || "-"}`,
        `Formato: ${format === "individual" ? "Individual" : "Coletivo"}`,
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      ],
      headers,
      rows,
      gradeColumns: Array.from(
        { length: terms.length + 1 },
        (_, index) => index + 2,
      ),
    });
  };

  const generateAveragesReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const courseId = document.getElementById(
      "grades-report-course-select",
    ).value;
    const format = document.querySelector(
      'input[name="grades-report-format"]:checked',
    ).value;
    const studentSelect = document.getElementById(
      "grades-report-student-select",
    );
    const selectedStudentIds = Array.from(studentSelect.selectedOptions).map(
      (opt) => opt.value,
    );

    if (!courseId) {
      CustomSwal.fire("Atenção", "Selecione uma turma/disciplina.", "warning");
      return;
    }
    const course = getUniqueCourses().find((c) => c.id === courseId);
    const classInfo = state.classes.find((c) => c.id === course.classId);
    const subjectInfo = state.subjects.find((s) => s.id === course.subjectId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const scheduleEntry = getScheduleEntryForCourse(
      course,
      new Date().toISOString().split("T")[0],
    );
    const teacher = scheduleEntry
      ? state.teachers.find((t) => t.id === scheduleEntry.teacherId)
      : null;
    const schoolCalendar = state.calendars[school.id];

    if (
      !schoolCalendar ||
      !schoolCalendar.terms ||
      schoolCalendar.terms.length === 0
    ) {
      CustomSwal.fire(
        "Dados Incompletos",
        "O calendário para a escola desta turma não foi configurado. Vá em Dados da Escola > Calendário.",
        "error",
      );
      return;
    }

    const terms = schoolCalendar.terms
      .filter((t) => t.startDate && t.endDate)
      .sort((a, b) => a.id - b.id);
    const activeClassStudents = getStudentsForClass(
      course.classId,
      isReportOnlyActiveStudentsEnabled(),
    );
    const reportStudentIds =
      selectedStudentIds.length > 0
        ? selectedStudentIds
        : activeClassStudents.map((student) => student.id);
    const termTypeName =
      schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre";

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // Mapa de abreviações para ficar igual à visualização do 5º Conselho
    const situationMap = {
      Aprovado: "Aprovado",
      "Aprovado pelo conselho": "Ap. Cons.",
      "Aprovado pelo Conselho": "Ap. Cons.", // Caso haja variação de maiúscula
      "Retido por frequência": "Ret. Freq.",
      "Retido por rendimento": "Ret. Rend.",
      "Retido por frequência e rendimento": "Ret. Freq. Rend.",
      Pendente: "Pendente",
    };

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(
        `Relatório de Médias por Período`,
        data.settings.margin.left,
        footerY,
      );
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      });
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    const schoolYear = new Date(terms[0].startDate).getFullYear();

    if (format === "coletivo") {
      doc.setFontSize(16);
      doc.text("Relatório de Médias por Período", 14, 15);
      doc.setFontSize(10);
      doc.text(`Ano Letivo: ${schoolYear}`, 14, 21);
      doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 26);
      doc.text(`Turma/Disciplina: ${course.name}`, 14, 31);
      doc.text(`Professor(a): ${teacher?.name || "N/D"}`, 14, 36);

      const students = getStudentsForClass(
        course.classId,
        isReportOnlyActiveStudentsEnabled(),
      );

      const head = [["Nº", "Aluno"]];
      terms.forEach((term) => head[0].push(`${term.id}º ${termTypeName}`));
      head[0].push("Média Final");
      head[0].push("Sit. Final");

      const body = students.map((student) => {
        const row = [
          student.number || "-",
          buildPdfStudentNameCell(student, classInfo?.name || ""),
        ];

        // Preenche as notas de cada bimestre/trimestre
        terms.forEach((term) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          const grade = getDefinitiveGrade(student.id, course.id, termKey);
          if (grade !== null) {
            row.push(formatGradeValue(grade));
          } else {
            row.push("--");
          }
        });

        const finalResult = getFinalResult(student.id, course);
        const finalAverage =
          finalResult.finalGrade !== null
            ? formatGradeValue(finalResult.finalGrade)
            : "--";
        row.push(finalAverage);

        // -- L�GICA ATUALIZADA DA SITUA�!ÒO FINAL --
        // 1. Recupera o que foi salvo manualmente no 5º Conselho
        const savedResultKey = `${student.id}_${course.id}`;
        const savedSituation = state.finalResults[savedResultKey]?.situation;

        // 2. Define a situação efetiva (Salva > Calculada)
        const effectiveSituation = savedSituation || finalResult.situation;

        // 3. Aplica o mapeamento de abreviação
        let situacaoDisplay =
          situationMap[effectiveSituation] || effectiveSituation;

        // Fallback simples caso não esteja no mapa mas contenha palavras chave
        if (!situationMap[effectiveSituation]) {
          if (effectiveSituation.includes("Aprovado"))
            situacaoDisplay = "Aprov.";
          else if (effectiveSituation.includes("Retido"))
            situacaoDisplay = "Retido";
        }

        row.push(situacaoDisplay);

        return row;
      });

      // Linhas de resumo: Média da Sala, Notas Azuis, Notas Vermelhas
      const classAverageRow = ["", "Média da Sala"];
      const blueNotesRow = ["", "Notas Azuis"];
      const redNotesRow = ["", "Notas Vermelhas"];

      terms.forEach((term) => {
        const termKey = `${term.startDate}|${term.endDate}`;
        let sum = 0,
          count = 0,
          blue = 0,
          red = 0;
        students.forEach((student) => {
          const grade = getDefinitiveGrade(student.id, course.id, termKey);
          if (grade !== null) {
            sum += grade;
            count++;
            if (isBlueGrade(grade)) blue++;
            else red++;
          }
        });
        classAverageRow.push(
          count > 0 ? formatConventionalGradeValue(sum / count) : "--",
        );
        blueNotesRow.push(blue.toString());
        redNotesRow.push(red.toString());
      });

      let finalSumAvg = 0,
        finalCountAvg = 0,
        finalBlueAvg = 0,
        finalRedAvg = 0;
      students.forEach((student) => {
        const fr = getFinalResult(student.id, course);
        if (fr.finalGrade !== null) {
          finalSumAvg += fr.finalGrade;
          finalCountAvg++;
          if (isBlueGrade(fr.finalGrade)) finalBlueAvg++;
          else finalRedAvg++;
        }
      });
      classAverageRow.push(
        finalCountAvg > 0
          ? formatConventionalGradeValue(finalSumAvg / finalCountAvg)
          : "--",
        "--",
      );
      blueNotesRow.push(finalBlueAvg.toString(), "--");
      redNotesRow.push(finalRedAvg.toString(), "--");

      body.push(classAverageRow, blueNotesRow, redNotesRow);

      // Gera columnStyles: colunas 0 e 1 com alinhamento padrão, demais centralizadas
      const averagesColStyles = {
        0: { halign: "center" },
        1: { halign: "left" },
      };
      for (let i = 2; i < head[0].length; i++)
        averagesColStyles[i] = { halign: "center" };

      doc.autoTable({
        startY: 40,
        head,
        body,
        theme: "striped",
        headStyles: { fillColor: themeColor, halign: "center" },
        alternateRowStyles: { fillColor: "#dadada" },
        columnStyles: averagesColStyles,
        didDrawPage: drawFooter,
        didParseCell: (data) => {
          const lastColumnIndex = head[0].length - 1;
          const finalAverageColumnIndex = lastColumnIndex - 1;

          if (data.section === "body" && data.row.index < students.length) {
            // Aplica cores para as colunas de notas
            if (
              data.column.index > 1 &&
              data.column.index <= finalAverageColumnIndex
            ) {
              applyGradeStylesToPdfCell(data);
            }

            // Formatação da Situação Final
            if (data.column.index === lastColumnIndex) {
              data.cell.styles.fontStyle = "bold";
              const text = data.cell.text[0];
              if (text.startsWith("Aprov") || text.startsWith("Ap.")) {
                data.cell.styles.textColor = "#2980b9"; // Azul
              } else if (text.startsWith("Ret") || text.startsWith("Repr")) {
                data.cell.styles.textColor = "#e74c3c"; // Vermelho
              }
            }
          }

          if (data.section === "body" && data.row.index >= students.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "center";
            if (data.column.index === 1) data.cell.styles.halign = "left";

            if (data.row.index === students.length + 1) {
              // Notas Azuis
              data.cell.styles.textColor = "#2980b9";
            }
            if (data.row.index === students.length + 2) {
              // Notas Vermelhas
              data.cell.styles.textColor = "#e74c3c";
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            drawPdfStudentStrikeThrough(doc, data);
          }
        },
      });
    } else {
      // Individual
      const students = state.students.filter((s) =>
        reportStudentIds.includes(s.id),
      );
      students.forEach((student, index) => {
        if (index > 0) doc.addPage();

        const drawIndividualAveragesHeader = () => {
          doc.setFontSize(16);
          doc.setFont(undefined, "bold");
          doc.text("Relatório de Médias por Período", 14, 15);
          doc.setFontSize(10);
          doc.setFont(undefined, "normal");
          doc.text(`Ano Letivo: ${schoolYear}`, 14, 21);
          doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 26);
          doc.text(`Turma/Disciplina: ${course.name}`, 14, 31);
          doc.text(`Professor(a): ${teacher?.name || "N/D"}`, 14, 36);
          drawPdfStudentLabel(doc, 14, 41, student, classInfo?.name || "");
        };

        drawIndividualAveragesHeader();

        const head = [["Período", "Nota Final"]];

        const body = terms.map((term) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          const grade = getDefinitiveGrade(student.id, course.id, termKey);
          return [
            `${term.id}º ${termTypeName}`,
            grade !== null ? formatGradeValue(grade) : "--",
          ];
        });

        const finalResult = getFinalResult(student.id, course);
        const finalAverage =
          finalResult.finalGrade !== null
            ? formatGradeValue(finalResult.finalGrade)
            : "--";
        body.push(["Média Final", finalAverage]);

        // -- L�GICA ATUALIZADA DA SITUA�!ÒO FINAL (INDIVIDUAL) --
        const savedResultKey = `${student.id}_${course.id}`;
        const savedSituation = state.finalResults[savedResultKey]?.situation;
        const effectiveSituation = savedSituation || finalResult.situation;

        let situacaoDisplay =
          situationMap[effectiveSituation] || effectiveSituation;
        if (!situationMap[effectiveSituation]) {
          if (effectiveSituation.includes("Aprovado"))
            situacaoDisplay = "Aprov.";
          else if (effectiveSituation.includes("Retido"))
            situacaoDisplay = "Retido";
        }

        body.push(["Sit. Final", situacaoDisplay]);

        doc.autoTable({
          startY: 48,
          head,
          body,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didParseCell: function (data) {
            if (data.row.index >= body.length - 2) {
              data.cell.styles.fontStyle = "bold";
            }
            if (
              data.section === "body" &&
              data.column.index === 1 &&
              data.row.index <= body.length - 2
            ) {
              applyGradeStylesToPdfCell(data);
            }

            if (
              data.section === "body" &&
              data.row.index === body.length - 1 &&
              data.column.index === 1
            ) {
              const text = data.cell.text[0];
              if (text.startsWith("Aprov") || text.startsWith("Ap.")) {
                data.cell.styles.textColor = "#2980b9";
              } else if (text.startsWith("Reprov") || text.startsWith("Ret")) {
                data.cell.styles.textColor = "#e74c3c";
              }
            }
          },
          didDrawPage: function () {
            drawIndividualAveragesHeader();
          },
        });

        const chartStartY = doc.autoTable.previous.finalY + 8;

        const comparativeMetrics = terms.map((term) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          return {
            label: `${term.id}º ${termTypeName}`,
            studentGrade: getDefinitiveGrade(student.id, course.id, termKey),
            classGrades: activeClassStudents
              .map((classStudent) =>
                getDefinitiveGrade(classStudent.id, course.id, termKey),
              )
              .filter((grade) => grade !== null),
          };
        });

        comparativeMetrics.push({
          label: "Média Final",
          studentGrade: finalResult.finalGrade,
          classGrades: activeClassStudents
            .map(
              (classStudent) =>
                getFinalResult(classStudent.id, course).finalGrade,
            )
            .filter((grade) => grade !== null),
        });

        appendStudentComparativeChartPage(doc, {
          reportTitle: "Comparativo do Aluno x Sala - Médias por Período",
          studentName: student.name,
          className: classInfo?.name || "N/D",
          subjectName: subjectInfo?.name || "N/D",
          metrics: comparativeMetrics,
          yearLabel: schoolYear,
          inline: true,
          startY: chartStartY,
          includeMetricsTable: false,
        });
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);
        drawFooter({
          pageNumber: page,
          settings: { margin: { left: 14, right: 14 } },
        });
      }
    }

    doc.save(`Relatorio_Medias_${course.name.replace(/\s/g, "_")}.pdf`);
  };

  const generateAssessmentsReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const courseId = document.getElementById(
      "grades-report-course-select",
    ).value;
    const termValue = document.getElementById(
      "grades-report-term-select",
    ).value;
    const format = document.querySelector(
      'input[name="grades-report-format"]:checked',
    ).value;
    const studentSelect = document.getElementById(
      "grades-report-student-select",
    );
    const selectedStudentIds = Array.from(studentSelect.selectedOptions).map(
      (opt) => opt.value,
    );

    if (!courseId || !termValue) {
      CustomSwal.fire("Atenção", "Selecione turma e período.", "warning");
      return;
    }
    const course = getUniqueCourses().find((c) => c.id === courseId);
    const classInfo = state.classes.find((c) => c.id === course.classId);
    const subjectInfo = state.subjects.find((s) => s.id === course.subjectId);
    const termName = document.querySelector(
      "#grades-report-term-select option:checked",
    ).textContent;
    const termKey = termValue;
    const activeClassStudents = getStudentsForClass(
      course.classId,
      isReportOnlyActiveStudentsEnabled(),
    );
    const reportStudentIds =
      selectedStudentIds.length > 0
        ? selectedStudentIds
        : activeClassStudents.map((student) => student.id);
    const assessments = state.assessments.filter(
      (a) =>
        a.classId === course.classId &&
        a.subjectId === course.subjectId &&
        a.termKey === termKey,
    );

    const doc = new jsPDF({
      orientation: format === "individual" ? "p" : "l",
      unit: "mm",
      format: "a4",
    });

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const footerPageWidth =
        doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(
        `Relatório de Notas das Avaliações - ${termName}`,
        data.settings.margin.left,
        footerY,
      );
      doc.text(`Sistema actEducação`, footerPageWidth / 2, footerY, {
        align: "center",
      }); // Identificação do Sistema
      doc.text(
        `Página ${data.pageNumber}`,
        footerPageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    const schoolCalendarAssessments =
      state.calendars[state.schools.find((s) => s.id === course.schoolId)?.id];
    const schoolYearAssessments =
      schoolCalendarAssessments &&
      schoolCalendarAssessments.terms &&
      schoolCalendarAssessments.terms.length > 0
        ? new Date(schoolCalendarAssessments.terms[0].startDate).getFullYear()
        : new Date().getFullYear();
    if (format === "coletivo") {
      doc.setFontSize(16);
      doc.text(`Relatório de Notas das Avaliações - ${termName}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Ano Letivo: ${schoolYearAssessments}`, 14, 21);
      doc.text(`Turma/Disciplina: ${course.name}`, 14, 26);

      const students = getStudentsForClass(
        course.classId,
        isReportOnlyActiveStudentsEnabled(),
      );

      const head = [["Nº", "Aluno"]];
      assessments.forEach((a) => head[0].push(`${a.title} (P:${a.weight})`));
      head[0].push("Média");
      head[0].push("Sit. Final");

      const body = students.map((student) => {
        const row = [student.number || "-", student.name];
        assessments.forEach((assessment) => {
          const gradeKey = `${student.id}_${assessment.id}`;
          const grade = state.grades[gradeKey];
          row.push(formatConventionalGradeValue(grade));
        });

        const definitiveGrade = getDefinitiveGrade(
          student.id,
          course.id,
          termKey,
        );
        row.push(
          definitiveGrade !== null ? formatGradeValue(definitiveGrade) : "--",
        );

        const finalResult = getFinalResult(student.id, course);
        let situacao = "--";

        if (finalResult.situation !== "Pendente") {
          if (finalResult.situation === "Aprovado pelo Conselho") {
            situacao = "Ap. Cons.";
          } else if (finalResult.situation.includes("Aprovado")) {
            situacao = "Aprov.";
          } else if (finalResult.situation.includes("Reprovado")) {
            situacao = "Reprov.";
          }
        }
        row.push(situacao);

        return row;
      });

      // Linhas de resumo: Média da Sala, Notas Azuis, Notas Vermelhas
      const classAverageRowA = ["", "Média da Sala"];
      const blueNotesRowA = ["", "Notas Azuis"];
      const redNotesRowA = ["", "Notas Vermelhas"];

      assessments.forEach((assessment) => {
        let sum = 0,
          count = 0,
          blue = 0,
          red = 0;
        students.forEach((student) => {
          const grade = state.grades[`${student.id}_${assessment.id}`];
          if (grade !== undefined && grade !== null) {
            const n = parseFloat(grade);
            if (isNaN(n)) return;
            sum += n;
            count++;
            if (isBlueGrade(n)) blue++;
            else red++;
          }
        });
        classAverageRowA.push(
          count > 0 ? formatConventionalGradeValue(sum / count) : "--",
        );
        blueNotesRowA.push(blue.toString());
        redNotesRowA.push(red.toString());
      });

      // Coluna Média
      let mSum = 0,
        mCount = 0,
        mBlue = 0,
        mRed = 0;
      students.forEach((student) => {
        const g = getDefinitiveGrade(student.id, course.id, termKey);
        if (g !== null) {
          mSum += g;
          mCount++;
          if (isBlueGrade(g)) mBlue++;
          else mRed++;
        }
      });
      classAverageRowA.push(
        mCount > 0 ? formatConventionalGradeValue(mSum / mCount) : "--",
        "--",
      );
      blueNotesRowA.push(mBlue.toString(), "--");
      redNotesRowA.push(mRed.toString(), "--");

      const bimesterAverageHighlightRow = [
        { content: "", styles: { halign: "center" } },
        {
          content: "Média do Bimestre",
          styles: { halign: "left", fontStyle: "bold" },
        },
        {
          content: mCount > 0 ? formatGradeValue(mSum / mCount) : "--",
          colSpan: head[0].length - 2,
          styles: { halign: "left", fontStyle: "bold" },
        },
      ];

      body.push(
        classAverageRowA,
        blueNotesRowA,
        redNotesRowA,
        bimesterAverageHighlightRow,
      );

      // Gera columnStyles: col 0 e 1 padrão, demais centralizadas
      const assessColStyles = {
        0: { halign: "center" },
        1: { halign: "left" },
      };
      for (let i = 2; i < head[0].length; i++)
        assessColStyles[i] = { halign: "center" };

      doc.autoTable({
        startY: 30,
        head,
        body,
        theme: "striped",
        headStyles: { fillColor: themeColor, halign: "center" },
        alternateRowStyles: { fillColor: "#dadada" },
        columnStyles: assessColStyles,
        didDrawPage: drawFooter,
        didParseCell: (data) => {
          // Aplica cores nas colunas de notas (avaliacoes + média) apenas para linhas de alunos
          if (
            data.section === "body" &&
            data.row.index < students.length &&
            data.column.index > 1 &&
            data.column.index < head[0].length - 1
          ) {
            applyGradeStylesToPdfCell(data);
          }
          if (
            data.section === "body" &&
            data.row.index < students.length &&
            data.column.index === head[0].length - 1
          ) {
            data.cell.styles.fontStyle = "bold";
            if (
              data.cell.text[0].startsWith("Aprov") ||
              data.cell.text[0].startsWith("Ap.")
            ) {
              data.cell.styles.textColor = "#2980b9";
            } else if (data.cell.text[0].startsWith("Reprov")) {
              data.cell.styles.textColor = "#e74c3c";
            }
          }

          if (data.section === "body" && data.row.index >= students.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "center";
            if (data.column.index === 1) data.cell.styles.halign = "left";

            if (data.row.index === students.length + 1) {
              data.cell.styles.textColor = "#2980b9"; // Notas Azuis
            }
            if (data.row.index === students.length + 2) {
              data.cell.styles.textColor = "#e74c3c"; // Notas Vermelhas
            }
            if (data.row.index === students.length + 3) {
              data.cell.styles.fillColor = [232, 245, 233];
              data.cell.styles.textColor = [27, 94, 32];
            }
          }
        },
      });
    } else {
      // Individual (layout analítico)
      const students = state.students.filter((s) =>
        reportStudentIds.includes(s.id),
      );
      students.forEach((student, index) => {
        if (index > 0) doc.addPage();

        const drawIndividualAssessmentHeader = () => {
          doc.setFontSize(16);
          doc.setFont(undefined, "bold");
          doc.text(`Relatório de Notas das Avaliações - ${termName}`, 14, 15);
          doc.setFontSize(10);
          doc.setFont(undefined, "normal");
          doc.text(`Ano Letivo: ${schoolYearAssessments}`, 14, 21);
          doc.text(`Turma/Disciplina: ${course.name}`, 14, 26);
          drawPdfStudentLabel(doc, 14, 31, student, classInfo?.name || "");
        };

        const definitiveGrade = getDefinitiveGrade(
          student.id,
          course.id,
          termKey,
        );

        const finalResult = getFinalResult(student.id, course);
        let situacao = "--";
        if (finalResult.situation !== "Pendente") {
          if (finalResult.situation === "Aprovado pelo Conselho") {
            situacao = "Ap. Cons.";
          } else if (finalResult.situation.includes("Aprovado")) {
            situacao = "Aprov.";
          } else if (finalResult.situation.includes("Reprovado")) {
            situacao = "Reprov.";
          }
        }

        const assessmentRows = assessments.map((assessment) => {
          const gradeKey = `${student.id}_${assessment.id}`;
          const studentGradeRaw = state.grades[gradeKey];
          const studentGrade =
            studentGradeRaw !== undefined && studentGradeRaw !== null
              ? parseFloat(studentGradeRaw)
              : null;

          const classGrades = activeClassStudents
            .map(
              (classStudent) =>
                state.grades[`${classStudent.id}_${assessment.id}`],
            )
            .filter((grade) => grade !== undefined && grade !== null)
            .map((grade) => parseFloat(grade))
            .filter((grade) => !isNaN(grade));

          const classAvg =
            classGrades.length > 0
              ? classGrades.reduce((acc, grade) => acc + grade, 0) /
                classGrades.length
              : null;
          const assessmentRank =
            studentGrade !== null && classGrades.length > 0
              ? 1 + classGrades.filter((grade) => grade > studentGrade).length
              : null;

          return [
            assessment.title,
            formatConventionalGradeValue(studentGradeRaw),
            String(assessment.weight),
            classAvg !== null ? formatConventionalGradeValue(classAvg) : "--",
            assessmentRank !== null
              ? `${assessmentRank}º de ${classGrades.length}`
              : "--",
          ];
        });

        const classPeriodGrades = activeClassStudents
          .map((classStudent) =>
            getDefinitiveGrade(classStudent.id, course.id, termKey),
          )
          .filter((grade) => grade !== null)
          .map((grade) => roundGradeValue(grade))
          .filter((grade) => grade !== null)
          .filter((grade) => !isNaN(grade));

        const classPeriodAverage =
          classPeriodGrades.length > 0
            ? classPeriodGrades.reduce((acc, grade) => acc + grade, 0) /
              classPeriodGrades.length
            : null;

        const rank =
          definitiveGrade !== null && classPeriodGrades.length > 0
            ? 1 +
              classPeriodGrades.filter((grade) => grade > definitiveGrade)
                .length
            : null;

        const studentBimesterAverage =
          definitiveGrade !== null ? formatGradeValue(definitiveGrade) : "--";

        const bimesterRankText =
          rank !== null ? `${rank}º de ${classPeriodGrades.length}` : "--";

        const assessmentTableBody = [
          ...assessmentRows,
          [
            {
              content: "Média do Bimestre",
              styles: { halign: "left", fontStyle: "bold" },
            },
            {
              content: studentBimesterAverage,
              colSpan: 3,
              styles: { halign: "left", fontStyle: "bold" },
            },
            {
              content: bimesterRankText,
              styles: { halign: "center", fontStyle: "bold" },
            },
          ],
        ];

        drawIndividualAssessmentHeader();

        doc.autoTable({
          startY: 38,
          head: [
            ["Avaliação", "Nota", "Peso", "Média da sala", "Posição do aluno"],
          ],
          body: assessmentTableBody,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          columnStyles: {
            0: { cellWidth: 72 },
            1: { halign: "center", cellWidth: 22 },
            2: { halign: "center", cellWidth: 18 },
            3: { halign: "center", cellWidth: 28 },
            4: { halign: "center", cellWidth: 38 },
          },
          didParseCell: function (data) {
            const isSummaryRow =
              data.section === "body" &&
              data.row.index === assessmentRows.length;

            if (
              data.section === "body" &&
              data.column.index === 1 &&
              !isSummaryRow
            ) {
              applyGradeStylesToPdfCell(data);
            }

            if (
              data.section === "body" &&
              data.column.index === 4 &&
              !isSummaryRow
            ) {
              data.cell.styles.fontStyle = "bold";
            }

            if (isSummaryRow) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [232, 245, 233];
              data.cell.styles.textColor = [27, 94, 32];
            }
          },
          didDrawPage: function () {
            drawIndividualAssessmentHeader();
          },
        });

        const chartStartY = doc.autoTable.previous.finalY + 8;

        const comparativeMetrics = assessments.map((assessment) => ({
          label: assessment.title,
          studentGrade: state.grades[`${student.id}_${assessment.id}`],
          classGrades: activeClassStudents
            .map(
              (classStudent) =>
                state.grades[`${classStudent.id}_${assessment.id}`],
            )
            .filter((grade) => grade !== undefined && grade !== null),
        }));

        comparativeMetrics.push({
          label: "Média do Período",
          studentGrade: definitiveGrade,
          classGrades: activeClassStudents
            .map((classStudent) =>
              getDefinitiveGrade(classStudent.id, course.id, termKey),
            )
            .filter((grade) => grade !== null),
        });

        appendStudentComparativeChartPage(doc, {
          reportTitle: `Comparativo do Aluno x Sala - Avaliações (${termName})`,
          studentName: student.name,
          className: classInfo?.name || "N/D",
          subjectName: subjectInfo?.name || "N/D",
          metrics: comparativeMetrics,
          yearLabel: schoolYearAssessments,
          inline: true,
          startY: chartStartY,
          includeMetricsTable: false,
        });
      });

      // Desenha rodapé em todas as páginas geradas no formato individual.
      const totalPages = doc.internal.getNumberOfPages();
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);
        drawFooter({
          pageNumber: page,
          settings: { margin: { left: 14, right: 14 } },
        });
      }
    }

    doc.save(`Relatorio_Avaliacoes_${course.name.replace(/\s/g, "_")}.pdf`);
  };

  const generateCompleteLogReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const courseId = document.getElementById("report-course-select").value;
    const termValue = document.getElementById("report-term-select").value;

    if (!courseId || !termValue) {
      CustomSwal.fire(
        "Atenção",
        "Selecione uma turma e um período para gerar o diário.",
        "warning",
      );
      return;
    }

    const orientation = document.querySelector(
      'input[name="report-orientation-class"]:checked',
    ).value;
    const includeOccurrences = document.getElementById(
      "report-include-occurrences",
    ).checked;
    const [termStart, termEnd] = termValue.split("|");
    const termKey = termValue;

    const course = getUniqueCourses().find((c) => c.id === courseId);
    const classInfo = state.classes.find((c) => c.id === course.classId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const schoolCalendar = state.calendars[school.id];
    const scheduleEntry = getScheduleEntryForCourse(course, termStart);
    const teacher = scheduleEntry
      ? state.teachers.find((t) => t.id === scheduleEntry.teacherId)
      : null;
    const teacherName = teacher ? teacher.name : "Professor não atribuído";

    const students = getStudentsForClass(
      course.classId,
      isReportOnlyActiveStudentsEnabled(),
    );

    const reportClassDates = getScheduledDatesForTerm(
      course,
      termStart,
      termEnd,
    ).filter((d) => d.isSchoolDay);

    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
    });
    const termName = document.querySelector(
      "#report-term-select option:checked",
    ).textContent;
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;

      doc.text(course.name, data.settings.margin.left, footerY);
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      }); // Identificação do Sistema
      doc.text(teacherName, pageWidth - data.settings.margin.right, footerY, {
        align: "right",
      });
      doc.setTextColor(0);
    };

    const schoolYear = new Date(
      schoolCalendar.terms[0].startDate,
    ).getFullYear();
    doc.setFontSize(16);
    doc.text(`Diário Completo - ${course.name} (${termName})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Ano Letivo: ${schoolYear}`, 14, 21);
    doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 26);
    doc.text(`Professor(a): ${teacherName}`, 14, 31);

    const totalClassesInPeriod = reportClassDates.reduce(
      (total, day) => total + day.numPeriods,
      0,
    );
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Total de aulas no período: ${totalClassesInPeriod}`,
      pageWidth - 14,
      32,
      { align: "right" },
    );
    doc.setTextColor(0);

    const head = [["Nº", "Aluno"]];
    const dateHeaders = reportClassDates.map((d) => {
      const date = new Date(d.date + "T12:00");
      return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
    });

    head[0].push(...dateHeaders, "F", "FJ", "% Aus");

    const body = students.map((student) => {
      const row = [
        student.number || "-",
        buildPdfStudentNameCell(student, classInfo?.name || ""),
      ];
      let absences = 0;
      let excusedAbsences = 0;

      reportClassDates.forEach((d) => {
        let dailyStatus = "";
        for (let i = 0; i < d.numPeriods; i++) {
          const attendanceData = getAttendanceForDate(
            course.classId,
            course.subjectId,
            d.date,
            i,
          );
          const status = attendanceData[student.id];
          if (status === "absent") absences++;
          if (status === "excused") excusedAbsences++;
          const statusSymbol =
            { present: "•", absent: "F", excused: "J" }[status] || "-";
          dailyStatus += (dailyStatus ? "," : "") + statusSymbol;
        }
        row.push(dailyStatus);
      });

      // Use consolidated attendance from all classes for transferred students
      const consolidatedAttendance = calculateConsolidatedAttendance(
        student.id,
        course.subjectId,
        termStart,
        termEnd,
        course.schoolId,
      );

      const absencePercent = 100 - consolidatedAttendance.frequency;
      row.push(
        consolidatedAttendance.absences.toString(),
        "0", // Consolidated attendance doesn't track excused separately
        `${absencePercent.toFixed(0)}%`,
      );
      return row;
    });

    doc.autoTable({
      startY: 35,
      head: head,
      body: body,
      theme: "striped",
      headStyles: { fillColor: themeColor, fontSize: 7, halign: "center" },
      alternateRowStyles: { fillColor: "#dadada" },
      styles: { fontSize: 7, cellPadding: 1, halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "left", cellWidth: 40 },
        [head[0].length - 3]: { halign: "center", fontStyle: "bold" },
        [head[0].length - 2]: { halign: "center", fontStyle: "bold" },
        [head[0].length - 1]: { halign: "center", fontStyle: "bold" },
      },
      didDrawPage: drawFooter,
      margin: { top: 28 },
      didParseCell: (data) => {
        const summaryColStartIndex = head[0].length - 3;
        const isDateColumn =
          data.section === "body" &&
          data.column.index > 1 &&
          data.column.index < summaryColStartIndex;
        if (isDateColumn) {
          const cellText = data.cell.text[0];
          if (cellText.includes("J")) {
            data.cell.styles.textColor = "#2980b9";
          }
          if (cellText.includes("F")) {
            data.cell.styles.textColor = "#e74c3c";
          }
        }
      },
    });

    const termContent =
      state.content[
        `${course.classId}_${course.subjectId}_${termStart}_${termEnd}`
      ]?.dailyRecords || {};

    let contentBody = [];
    reportClassDates.forEach((d) => {
      const formattedDate = new Date(d.date + "T12:00").toLocaleDateString(
        "pt-BR",
      );
      for (let i = 0; i < d.numPeriods; i++) {
        const record = getContentForLesson(
          course.classId,
          course.subjectId,
          termStart,
          termEnd,
          d.date,
          i,
        );
        if (record && (record.content?.trim() || record.observations?.trim())) {
          const dateDisplay =
            d.numPeriods > 1
              ? `${formattedDate}\n(${i + 1}ª aula)`
              : formattedDate;
          contentBody.push([
            dateDisplay,
            record.content || "",
            record.observations || "",
          ]);
        }
      }
    });

    if (contentBody.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Registros de Aula", 14, 20);

      doc.autoTable({
        startY: 28,
        head: [["Data / Aula", "Conteúdo Ministrado", "Observações"]],
        body: contentBody,
        theme: "grid",
        headStyles: { fillColor: themeColor },
        alternateRowStyles: { fillColor: "#dadada" },
        didDrawPage: drawFooter,
        margin: { top: 28 },
      });
    }

    const assessmentsForTerm = state.assessments.filter(
      (a) =>
        a.classId === course.classId &&
        a.subjectId === course.subjectId &&
        a.termKey === termKey,
    );
    if (assessmentsForTerm.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Notas das Avaliações - ${termName}`, 14, 20);

      const assessmentsHead = [["Nº", "Aluno"]];
      assessmentsForTerm.forEach((a) =>
        assessmentsHead[0].push(`${a.title} (P:${a.weight})`),
      );
      assessmentsHead[0].push("Média");
      assessmentsHead[0].push("Sit. Final");

      const assessmentsBody = students.map((student) => {
        const row = [
          student.number || "-",
          buildPdfStudentNameCell(student, classInfo?.name || ""),
        ];
        assessmentsForTerm.forEach((assessment) => {
          const gradeKey = `${student.id}_${assessment.id}`;
          const grade = state.grades[gradeKey];
          row.push(formatConventionalGradeValue(grade));
        });

        const definitiveGrade = getDefinitiveGrade(
          student.id,
          course.id,
          termKey,
        );
        row.push(
          definitiveGrade !== null ? formatGradeValue(definitiveGrade) : "--",
        );

        let situacao = "--";
        if (definitiveGrade !== null) {
          situacao = isBlueGrade(definitiveGrade) ? "Aprov." : "Reprov.";
        }
        row.push(situacao);

        return row;
      });

      const classAverageRow = ["", "Média da Sala"];
      const blueNotesRow = ["", "Notas Azuis"];
      const redNotesRow = ["", "Notas Vermelhas"];

      assessmentsForTerm.forEach((assessment) => {
        let sum = 0,
          count = 0,
          blue = 0,
          red = 0;
        students.forEach((student) => {
          const gradeKey = `${student.id}_${assessment.id}`;
          const grade = state.grades[gradeKey];
          if (grade !== undefined && grade !== null) {
            const numericGrade = parseFloat(grade);
            if (isNaN(numericGrade)) return;
            sum += numericGrade;
            count++;
            if (isBlueGrade(numericGrade)) blue++;
            else red++;
          }
        });
        const average = count > 0 ? formatGradeValue(sum / count) : "--";
        classAverageRow.push(average);
        blueNotesRow.push(blue.toString());
        redNotesRow.push(red.toString());
      });

      let finalAvgSum = 0,
        finalAvgCount = 0,
        finalAvgBlue = 0,
        finalAvgRed = 0;
      students.forEach((student) => {
        const definitiveGrade = getDefinitiveGrade(
          student.id,
          course.id,
          termKey,
        );
        if (definitiveGrade !== null) {
          finalAvgSum += definitiveGrade;
          finalAvgCount++;
          if (isBlueGrade(definitiveGrade)) finalAvgBlue++;
          else finalAvgRed++;
        }
      });

      const finalAverageOfAverages =
        finalAvgCount > 0
          ? formatGradeValue(finalAvgSum / finalAvgCount)
          : "--";

      classAverageRow.push(finalAverageOfAverages, "--");
      blueNotesRow.push(finalAvgBlue.toString(), "--");
      redNotesRow.push(finalAvgRed.toString(), "--");

      assessmentsBody.push(classAverageRow, blueNotesRow, redNotesRow);

      const assessmentsColumnStyles = { 1: { halign: "left" } };
      for (let i = 2; i < assessmentsHead[0].length; i++) {
        assessmentsColumnStyles[i] = { halign: "center" };
      }

      doc.autoTable({
        startY: 28,
        head: assessmentsHead,
        body: assessmentsBody,
        theme: "striped",
        headStyles: { fillColor: themeColor },
        alternateRowStyles: { fillColor: "#dadada" },
        didDrawPage: drawFooter,
        columnStyles: assessmentsColumnStyles,
        didParseCell: (data) => {
          if (data.section === "body" && data.row.index < students.length) {
            if (
              data.column.index > 1 &&
              data.column.index < assessmentsHead[0].length - 2
            ) {
              applyGradeStylesToPdfCell(data);
            }

            if (data.column.index === assessmentsHead[0].length - 2) {
              applyGradeStylesToPdfCell(data);
            }

            if (data.column.index === assessmentsHead[0].length - 1) {
              data.cell.styles.fontStyle = "bold";
              if (data.cell.text[0] === "Aprov.") {
                data.cell.styles.textColor = "#2980b9";
              } else if (data.cell.text[0] === "Reprov.") {
                data.cell.styles.textColor = "#e74c3c";
              }
            }
          }

          if (data.row.index >= students.length) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "center";
            if (data.column.index === 1) data.cell.styles.halign = "left";

            if (data.row.index === students.length + 1) {
              data.cell.styles.textColor = "#2980b9";
            }
            if (data.row.index === students.length + 2) {
              data.cell.styles.textColor = "#e74c3c";
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            drawPdfStudentStrikeThrough(doc, data);
          }
        },
      });
    }

    if (includeOccurrences) {
      const occurrences = getOccurrencesWithDetails(
        courseId,
        termStart,
        termEnd,
      );
      if (occurrences.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Ocorrências de Indisciplina", 14, 20);

        const occurrencesBody = occurrences.map((occurrence) => {
          const involvedStudents =
            occurrence.involvedStudentNames.length > 0
              ? occurrence.involvedStudentNames.join(", ")
              : "Não informado";

          return [
            new Date(occurrence.occurrenceDate + "T12:00").toLocaleDateString(
              "pt-BR",
            ),
            involvedStudents,
            occurrence.sentToPrincipal ? "Sim" : "Não",
            occurrence.description,
          ];
        });

        doc.autoTable({
          startY: 28,
          head: [["Data", "Alunos Envolvidos", "Direção", "Descrição"]],
          body: occurrencesBody,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          margin: { top: 28 },
          columnStyles: {
            0: { cellWidth: 24 },
            1: { cellWidth: 60 },
            2: { cellWidth: 18, halign: "center" },
            3: { cellWidth: "auto" },
          },
        });
      }
    }

    doc.save(
      `Diario_Completo_${course.name.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  const getRedGradesCriteriaForSingleClass = (classId, termKey) => {
    if (!classId || !termKey || termKey === "5th-council") return [];

    const cls = state.classes.find((item) => item.id === classId);
    if (!cls) return [];

    const courses = getUniqueCourses()
      .filter((course) => course.classId === classId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const criteria = [];

    courses.forEach((course) => {
      const courseShortName = course.name.replace(`${cls.name} - `, "");

      const assessmentsForTerm = state.assessments
        .filter(
          (assessment) =>
            assessment.classId === course.classId &&
            assessment.subjectId === course.subjectId &&
            assessment.termKey === termKey,
        )
        .sort((a, b) => a.title.localeCompare(b.title));

      assessmentsForTerm.forEach((assessment) => {
        criteria.push({
          value: `assessment:${assessment.id}`,
          label: `${courseShortName} - ${assessment.title} (Peso ${assessment.weight})`,
        });
      });

      criteria.push({
        value: `average:${course.id}`,
        label: `${courseShortName} - Média do Bimestre`,
      });
    });

    return criteria;
  };

  const generateRedGradesExcelReport = () => {
    const schoolId = document.getElementById("red-grades-school-select")?.value;
    const classSelect = document.getElementById("red-grades-class-select");
    const selectedClassIds = classSelect
      ? Array.from(classSelect.selectedOptions).map((opt) => opt.value)
      : [];
    const termSelect = document.getElementById("red-grades-term-select");
    const termValue = termSelect?.value || "";
    const termName =
      termSelect?.options?.[termSelect.selectedIndex]?.text || "";
    const scopeMode =
      document.querySelector('input[name="red-grades-scope"]:checked')?.value ||
      "multi";
    const criteriaSelect = document.getElementById(
      "red-grades-criteria-select",
    );
    const selectedCriterionValue = criteriaSelect?.value || "";

    if (scopeMode === "single") {
      if (!schoolId || selectedClassIds.length !== 1 || !termValue) {
        CustomSwal.fire(
          "Atenção",
          "Selecione uma escola, uma turma e um período.",
          "warning",
        );
        return;
      }

      if (termValue === "5th-council") {
        CustomSwal.fire(
          "Atenção",
          "No modo Turma única, selecione um bimestre/trimestre para listar os critérios de avaliação.",
          "warning",
        );
        return;
      }

      if (!selectedCriterionValue) {
        CustomSwal.fire(
          "Atenção",
          "Selecione o critério de avaliação para gerar o Excel.",
          "warning",
        );
        return;
      }

      const selectedClassId = selectedClassIds[0];
      const selectedClass = state.classes.find((c) => c.id === selectedClassId);
      const school = state.schools.find((s) => s.id === schoolId);
      const criteria = getRedGradesCriteriaForSingleClass(
        selectedClassId,
        termValue,
      );
      const selectedCriterion = criteria.find(
        (criterion) => criterion.value === selectedCriterionValue,
      );

      if (!selectedClass || !school || !selectedCriterion) {
        CustomSwal.fire(
          "Erro",
          "Não foi possível localizar os dados necessários para gerar o Excel.",
          "error",
        );
        return;
      }

      const activeStudents = getStudentsForClass(
        selectedClassId,
        isReportOnlyActiveStudentsEnabled(),
      );

      const rows = [];

      if (selectedCriterion.value.startsWith("assessment:")) {
        const assessmentId = selectedCriterion.value.replace("assessment:", "");
        activeStudents.forEach((student) => {
          const rawGrade = state.grades[`${student.id}_${assessmentId}`];
          const numericGrade = parseGradeNumericValue(rawGrade);
          if (numericGrade === null || !isRedGrade(numericGrade)) return;
          rows.push([
            student.number || "-",
            student.name,
            formatGradeValue(numericGrade),
          ]);
        });
      } else if (selectedCriterion.value.startsWith("average:")) {
        const courseId = selectedCriterion.value.replace("average:", "");
        activeStudents.forEach((student) => {
          const averageGrade = getDefinitiveGrade(
            student.id,
            courseId,
            termValue,
          );
          const numericGrade = parseGradeNumericValue(averageGrade);
          if (numericGrade === null || !isRedGrade(numericGrade)) return;
          rows.push([
            student.number || "-",
            student.name,
            formatGradeValue(numericGrade),
          ]);
        });
      }

      if (!rows.length) {
        rows.push(["-", "Nenhuma nota vermelha encontrada", "--"]);
      }

      exportReportToStyledExcel({
        fileName: `Relatorio_Notas_Vermelhas_${sanitizeFileName(selectedClass.name)}.xlsx`,
        sheetName: "Notas Vermelhas",
        title: "Relatório de Notas Vermelhas por Critério",
        metaLines: [
          `Escola: ${school.name}`,
          `Turma: ${selectedClass.name}`,
          `Período: ${termName}`,
          `Critério: ${selectedCriterion.label}`,
          `Nota de Corte: < ${formatPassingGradeThresholdPtBr()}`,
          `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        ],
        headers: ["Nº", "Aluno", "Nota"],
        rows,
        forceRedColumns: [2],
      });
      return;
    }

    if (!schoolId || selectedClassIds.length === 0 || !termValue) {
      CustomSwal.fire(
        "Atenção",
        "Selecione uma escola, pelo menos uma turma e um período.",
        "warning",
      );
      return;
    }

    const school = state.schools.find((s) => s.id === schoolId);
    if (!school) {
      CustomSwal.fire("Erro", "Escola não encontrada.", "error");
      return;
    }

    const isFinalCouncil = termValue === "5th-council";
    const classesToReport = state.classes
      .filter((cls) => selectedClassIds.includes(cls.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const situationMap = {
      Aprovado: "Aprovado",
      "Aprovado pelo conselho": "Ap. Cons.",
      "Aprovado pelo Conselho": "Ap. Cons.",
      "Retido por frequência": "Ret. Freq.",
      "Retido por rendimento": "Ret. Rend.",
      "Retido por frequência e rendimento": "Ret. Freq. Rend.",
      Pendente: "Pendente",
    };

    const headers = ["Turma", "Nº", "Aluno", "Disciplina", "Nota"];
    if (isFinalCouncil) headers.push("Sit. Final");

    const sheets = classesToReport.map((cls) => {
      const students = getStudentsForClass(
        cls.id,
        isReportOnlyActiveStudentsEnabled(),
      );

      const coursesForClass = getUniqueCourses().filter(
        (course) => course.classId === cls.id,
      );

      const rows = [];

      students.forEach((student) => {
        coursesForClass.forEach((course) => {
          let grade = null;
          let situationDisplay = "--";

          if (isFinalCouncil) {
            const finalResult = getFinalResult(student.id, course);
            if (finalResult.finalGrade !== null) {
              grade = finalResult.finalGrade;
              const savedSituation =
                state.finalResults?.[`${student.id}_${course.id}`]?.situation;
              const effectiveSituation =
                savedSituation || finalResult.situation;
              situationDisplay =
                situationMap[effectiveSituation] || effectiveSituation || "--";
            }
          } else {
            grade = getDefinitiveGrade(student.id, course.id, termValue);
          }

          const numericGrade = parseGradeNumericValue(grade);
          if (numericGrade === null || !isRedGrade(numericGrade)) return;

          const row = [
            cls.name,
            student.number || "-",
            student.name,
            course.name.replace(`${cls.name} - `, ""),
            formatGradeValue(numericGrade),
          ];

          if (isFinalCouncil) {
            row.push(situationDisplay);
          }

          rows.push(row);
        });
      });

      if (!rows.length) {
        const emptyRow = [
          cls.name,
          "-",
          "Nenhum aluno com nota vermelha",
          "-",
          "--",
        ];
        if (isFinalCouncil) emptyRow.push("--");
        rows.push(emptyRow);
      }

      return {
        sheetName: cls.name,
        title: `Notas Vermelhas - ${cls.name}`,
        metaLines: [
          `Escola: ${school.name}`,
          `Turma: ${cls.name}`,
          `Período: ${termName}`,
          `Escopo: Várias turmas`,
          `Nota de Corte: < ${formatPassingGradeThresholdPtBr()}`,
          `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        ],
        headers,
        rows,
        forceRedColumns: [4],
      };
    });

    exportReportToStyledExcel({
      fileName: `Relatorio_Notas_Vermelhas_${sanitizeFileName(school.name)}.xlsx`,
      sheets,
    });
  };

  const generateRedGradesReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const schoolId = document.getElementById("red-grades-school-select").value;
    const classSelect = document.getElementById("red-grades-class-select");
    const selectedClassIds = Array.from(classSelect.selectedOptions).map(
      (opt) => opt.value,
    );
    const termValue = document.getElementById("red-grades-term-select").value;
    const scopeMode =
      document.querySelector('input[name="red-grades-scope"]:checked')?.value ||
      "multi";
    const criteriaSelect = document.getElementById(
      "red-grades-criteria-select",
    );
    const selectedCriterionValue = criteriaSelect?.value || "";

    if (scopeMode === "single") {
      if (!schoolId || selectedClassIds.length !== 1 || !termValue) {
        CustomSwal.fire(
          "Atenção",
          "Selecione uma escola, uma turma e um período.",
          "warning",
        );
        return;
      }

      if (termValue === "5th-council") {
        CustomSwal.fire(
          "Atenção",
          "No modo Turma única, selecione um bimestre/trimestre para listar os critérios de avaliação.",
          "warning",
        );
        return;
      }

      if (!selectedCriterionValue) {
        CustomSwal.fire(
          "Atenção",
          "Selecione o critério de avaliação para gerar o relatório.",
          "warning",
        );
        return;
      }

      const selectedClassId = selectedClassIds[0];
      const selectedClass = state.classes.find((c) => c.id === selectedClassId);
      const school = state.schools.find((s) => s.id === schoolId);
      const termSelect = document.getElementById("red-grades-term-select");
      const termName = termSelect.options[termSelect.selectedIndex]?.text || "";
      const criteria = getRedGradesCriteriaForSingleClass(
        selectedClassId,
        termValue,
      );
      const selectedCriterion = criteria.find(
        (criterion) => criterion.value === selectedCriterionValue,
      );

      if (!selectedClass || !school || !selectedCriterion) {
        CustomSwal.fire(
          "Erro",
          "Não foi possível localizar os dados necessários para gerar o relatório.",
          "error",
        );
        return;
      }

      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth =
        doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

      const drawFooter = (data) => {
        const pageHeight =
          doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerY = pageHeight - 10;
        doc.text(
          "Relatório de Notas Vermelhas por Critério",
          data.settings.margin.left,
          footerY,
        );
        doc.text("Sistema actEducação", pageWidth / 2, footerY, {
          align: "center",
        });
        doc.text(
          `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
          pageWidth - data.settings.margin.right,
          footerY,
          { align: "right" },
        );
        doc.setTextColor(0);
      };

      const schoolCalendar = state.calendars[school.id];
      const schoolYearRedGrades =
        schoolCalendar?.terms?.length > 0
          ? new Date(schoolCalendar.terms[0].startDate).getFullYear()
          : new Date().getFullYear();

      const activeStudents = getStudentsForClass(
        selectedClassId,
        isReportOnlyActiveStudentsEnabled(),
      );

      const body = [];

      if (selectedCriterion.value.startsWith("assessment:")) {
        const assessmentId = selectedCriterion.value.replace("assessment:", "");

        activeStudents.forEach((student) => {
          const rawGrade = state.grades[`${student.id}_${assessmentId}`];
          const numericGrade = parseGradeNumericValue(rawGrade);
          if (numericGrade === null || !isRedGrade(numericGrade)) return;

          body.push([
            student.number || "-",
            buildPdfStudentNameCell(student, selectedClass.name),
            formatConventionalGradeValue(rawGrade),
          ]);
        });
      } else if (selectedCriterion.value.startsWith("average:")) {
        const courseId = selectedCriterion.value.replace("average:", "");

        activeStudents.forEach((student) => {
          const averageGrade = getDefinitiveGrade(
            student.id,
            courseId,
            termValue,
          );
          const numericGrade = parseGradeNumericValue(averageGrade);
          if (numericGrade === null || !isRedGrade(numericGrade)) return;

          body.push([
            student.number || "-",
            buildPdfStudentNameCell(student, selectedClass.name),
            formatGradeValue(averageGrade),
          ]);
        });
      }

      doc.setFontSize(16);
      doc.text("Relatório de Notas Vermelhas por Critério", 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Ano Letivo: ${schoolYearRedGrades} | Escola: ${school.name}`,
        14,
        21,
      );
      doc.text(`Turma: ${selectedClass.name} | Período: ${termName}`, 14, 26);
      doc.text(`Critério: ${selectedCriterion.label}`, 14, 31);
      doc.text(`Nota de Corte: < ${formatPassingGradeThresholdPtBr()}`, 14, 36);
      doc.setTextColor(0);

      if (body.length === 0) {
        doc.setFontSize(11);
        doc.text(
          `Nenhuma nota vermelha encontrada para o critério selecionado.`,
          14,
          45,
        );
      } else {
        doc.autoTable({
          startY: 42,
          head: [["Nº", "Aluno", "Nota"]],
          body,
          theme: "striped",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          columnStyles: {
            0: { halign: "center", cellWidth: 14 },
            1: { halign: "left" },
            2: { halign: "center", cellWidth: 24, fontStyle: "bold" },
          },
          didDrawPage: drawFooter,
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 2) {
              data.cell.styles.textColor = "#c0392b";
            }
          },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              drawPdfStudentStrikeThrough(doc, data);
            }
          },
        });
      }

      doc.save(
        `Relatorio_Notas_Vermelhas_${selectedClass.name.replace(/\s/g, "_")}.pdf`,
      );
      return;
    }

    if (!schoolId || selectedClassIds.length === 0 || !termValue) {
      CustomSwal.fire(
        "Atenção",
        "Selecione uma escola, pelo menos uma turma e um período.",
        "warning",
      );
      return;
    }

    const school = state.schools.find((s) => s.id === schoolId);
    const termSelect = document.getElementById("red-grades-term-select");
    const termName = termSelect.options[termSelect.selectedIndex].text;

    // Verifica se é o 5º conselho para decidir se mostra a coluna Situação
    const isFinalCouncil = termValue === "5th-council";

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    // Mapa de abreviações
    const situationMap = {
      Aprovado: "Aprovado",
      "Aprovado pelo conselho": "Ap. Cons.",
      "Aprovado pelo Conselho": "Ap. Cons.",
      "Retido por frequência": "Ret. Freq.",
      "Retido por rendimento": "Ret. Rend.",
      "Retido por frequência e rendimento": "Ret. Freq. Rend.",
      Pendente: "Pendente",
    };

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(
        `Relatório de Notas Vermelhas`,
        data.settings.margin.left,
        footerY,
      );
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      });
      doc.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
        pageWidth - data.settings.margin.right,
        footerY,
        { align: "right" },
      );
      doc.setTextColor(0);
    };

    const schoolYearRedGrades = new Date(
      state.calendars[school.id].terms[0].startDate,
    ).getFullYear();
    doc.setFontSize(18);
    doc.text("Relatório de Alunos com Notas Vermelhas", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Ano Letivo: ${schoolYearRedGrades} | Escola: ${school.name}`,
      14,
      21,
    );
    doc.text(
      `Período: ${termName} | Nota de Corte: < ${formatPassingGradeThresholdPtBr()}`,
      14,
      26,
    );
    doc.setTextColor(0);

    let finalY = 35;
    let foundAny = false;

    const classesToReport = state.classes
      .filter((c) => selectedClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    classesToReport.forEach((cls) => {
      const students = getStudentsForClass(
        cls.id,
        isReportOnlyActiveStudentsEnabled(),
      );

      const coursesForClass = getUniqueCourses().filter(
        (c) => c.classId === cls.id,
      );

      if (students.length === 0 || coursesForClass.length === 0) return;

      const studentsWithRedGrades = [];

      students.forEach((student) => {
        const redSubjects = [];

        coursesForClass.forEach((course) => {
          let grade = null;
          // Calcula ou recupera a nota baseada no período selecionado
          if (isFinalCouncil) {
            const finalResult = getFinalResult(student.id, course);
            if (finalResult.finalGrade !== null) {
              grade = finalResult.finalGrade;
            }
          } else {
            grade = getDefinitiveGrade(student.id, course.id, termValue);
          }

          if (grade !== null && isRedGrade(grade)) {
            // Prepara os dados da situação, caso precisem ser usados
            let situacaoDisplay = "--";

            if (isFinalCouncil) {
              const finalResult = getFinalResult(student.id, course);
              const savedResultKey = `${student.id}_${course.id}`;
              const savedSituation =
                state.finalResults[savedResultKey]?.situation;

              const effectiveSituation =
                savedSituation || finalResult.situation;

              situacaoDisplay =
                situationMap[effectiveSituation] || effectiveSituation;

              // Fallback se não estiver no mapa
              if (!situationMap[effectiveSituation] && effectiveSituation) {
                if (effectiveSituation.includes("Aprovado"))
                  situacaoDisplay = "Aprov.";
                else if (effectiveSituation.includes("Retido"))
                  situacaoDisplay = "Retido";
              }
            }

            redSubjects.push({
              subject: course.name.replace(`${cls.name} - `, ""),
              grade: formatGradeValue(grade),
              situation: situacaoDisplay,
            });
          }
        });

        if (redSubjects.length > 0) {
          studentsWithRedGrades.push({
            number: student.number || "-",
            name: student.name,
            subjects: redSubjects,
          });
        }
      });

      if (studentsWithRedGrades.length > 0) {
        foundAny = true;

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");

        if (finalY > 250) {
          doc.addPage();
          finalY = 20;
        }
        doc.text(`Turma: ${cls.name}`, 14, finalY);

        // Define o cabeçalho dinamicamente
        const headRow = ["Nº", "Aluno", "Disciplina", "Nota"];
        if (isFinalCouncil) {
          headRow.push("Sit. Final");
        }
        const head = [headRow];

        const body = [];

        studentsWithRedGrades.forEach((item) => {
          item.subjects.forEach((subj, idx) => {
            // Monta a linha base
            const rowData = [];
            if (idx === 0) {
              rowData.push(
                item.number,
                buildPdfStudentNameCell(item, cls.name),
                subj.subject,
                subj.grade,
              );
            } else {
              rowData.push("", "", subj.subject, subj.grade);
            }

            // Adiciona a situação apenas se for 5º conselho
            if (isFinalCouncil) {
              rowData.push(subj.situation);
            }

            body.push(rowData);
          });
        });

        // Define estilos das colunas dinamicamente
        const columnStylesConfig = {
          3: { fontStyle: "bold", textColor: "#c0392b" }, // Coluna Nota (sempre índice 3)
        };

        if (isFinalCouncil) {
          columnStylesConfig[4] = { fontStyle: "bold" }; // Coluna Situação (índice 4)
        }

        doc.autoTable({
          startY: finalY + 2,
          head: head,
          body: body,
          theme: "striped",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          columnStyles: columnStylesConfig,
          didParseCell: (data) => {
            // Colorir a situação final APENAS se for 5º conselho e estiver na coluna 4
            if (
              isFinalCouncil &&
              data.section === "body" &&
              data.column.index === 4
            ) {
              const text = data.cell.text[0];
              if (text.startsWith("Ap") || text.startsWith("Aprov")) {
                data.cell.styles.textColor = "#2980b9"; // Azul
              } else if (text.startsWith("Ret") || text.startsWith("Repr")) {
                data.cell.styles.textColor = "#e74c3c"; // Vermelho
              }
            }
          },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              drawPdfStudentStrikeThrough(doc, data);
            }
          },
        });

        finalY = doc.autoTable.previous.finalY + 12;
      }
    });

    if (!foundAny) {
      doc.setFontSize(11);
      doc.text(
        `Nenhum aluno com nota abaixo de ${formatPassingGradeThresholdPtBr()} encontrado nas turmas selecionadas.`,
        14,
        40,
      );
    }

    doc.save(
      `Relatorio_Notas_Vermelhas_${school.name.replace(/\s/g, "_")}.pdf`,
    );
  };

  /**
   * NOVO (VERSÒO CORRIGIDA): Gera um relatório em PDF listando alunos com frequência abaixo de um limiar.
   * Lógica de cálculo de frequência aprimorada para maior precisão.
   */
  const generateLowFrequencyReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const schoolIdElement = document.getElementById("low-freq-school-select");
    const classSelect = document.getElementById("low-freq-class-select");
    const termValueElement = document.getElementById("low-freq-term-select");
    const thresholdElement = document.getElementById("low-freq-threshold");
    const orientationElement = document.querySelector(
      'input[name="report-orientation-low-freq"]:checked',
    );

    if (
      !schoolIdElement ||
      !classSelect ||
      !termValueElement ||
      !thresholdElement ||
      !orientationElement
    ) {
      alert("Erro: elementos do formulário não encontrados.");
      return;
    }

    const schoolId = schoolIdElement.value;
    const selectedClassIds = Array.from(classSelect.selectedOptions).map(
      (opt) => opt.value,
    );
    const termValue = termValueElement.value;
    const frequencyThreshold = parseFloat(thresholdElement.value) || 75;
    const orientation = orientationElement.value;

    if (!schoolId) {
      CustomSwal.fire(
        "Atenção",
        "Por favor, selecione uma escola para gerar o relatório.",
        "warning",
      );
      return;
    }

    const school = state.schools.find((s) => s.id === schoolId);
    const schoolCalendar = state.calendars[school.id];
    const termSelect = document.getElementById("low-freq-term-select");
    const termName = termSelect.options[termSelect.selectedIndex].text;

    if (
      !schoolCalendar ||
      !schoolCalendar.terms ||
      schoolCalendar.terms.length === 0
    ) {
      CustomSwal.fire(
        "Dados Incompletos",
        `O calendário para a escola "${school.name}" não foi configurado.`,
        "error",
      );
      return;
    }

    let termsToProcess = [];
    if (termValue === "all") {
      termsToProcess = schoolCalendar.terms.filter(
        (t) => t.startDate && t.endDate,
      );
    } else {
      const [startDate, endDate] = termValue.split("|");
      const selectedTerm = schoolCalendar.terms.find(
        (t) => t.startDate === startDate && t.endDate === endDate,
      );
      if (selectedTerm) {
        termsToProcess = [selectedTerm];
      }
    }

    if (termsToProcess.length === 0) {
      CustomSwal.fire(
        "Erro",
        "Nenhum período letivo válido foi encontrado para a apuração.",
        "error",
      );
      return;
    }

    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
    });
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(
        `Relatório de Baixa Frequência`,
        data.settings.margin.left,
        footerY,
      );
      doc.text(`Sistema actEducação`, pageWidth / 2, footerY, {
        align: "center",
      }); // Identificação do Sistema
      doc.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
        pageWidth - data.settings.margin.right,
        footerY,
        {
          align: "right",
        },
      );
      doc.setTextColor(0);
    };

    const schoolYear = new Date(
      schoolCalendar.terms[0].startDate,
    ).getFullYear();
    doc.setFontSize(18);
    doc.text("Relatório de Alunos com Baixa Frequência", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Ano Letivo: ${schoolYear} | Escola: ${school.name} | Período: ${termName} | Frequência Mínima: ${frequencyThreshold}%`,
      14,
      21,
    );
    doc.setTextColor(0);

    let classesToReport = [];
    if (selectedClassIds.length > 0) {
      classesToReport = state.classes.filter((c) =>
        selectedClassIds.includes(c.id),
      );
    } else {
      classesToReport = state.classes.filter((c) => c.schoolId === schoolId);
    }
    classesToReport.sort((a, b) => a.name.localeCompare(b.name));

    let finalY = 30;
    let foundStudents = false;

    classesToReport.forEach((cls) => {
      const students = getStudentsForClass(
        cls.id,
        isReportOnlyActiveStudentsEnabled(),
      );
      const coursesForClass = getUniqueCourses().filter(
        (c) => c.classId === cls.id,
      );
      if (students.length === 0 || coursesForClass.length === 0) return;

      const reportDataByStudent = [];

      students.forEach((student) => {
        const lowFreqSubjects = [];

        coursesForClass.forEach((course) => {
          // MODIFICADO: Usa frequência consolidada de TODAS as turmas pelas quais o aluno passou
          let totalAbsences = 0;
          let totalClasses = 0;

          termsToProcess.forEach((term) => {
            const consolidatedData = calculateConsolidatedAttendance(
              student.id,
              course.subjectId,
              term.startDate,
              term.endDate,
              school.id,
            );
            totalAbsences += consolidatedData.absences;
            totalClasses += consolidatedData.totalClasses;
          });

          // Para relatório de múltiplos períodos, usa a frequência consolidada do período
          const frequency =
            totalClasses > 0
              ? ((totalClasses - totalAbsences) / totalClasses) * 100
              : 100;
          const totalLessonsInPeriodForCourse = totalClasses;

          if (frequency < frequencyThreshold) {
            lowFreqSubjects.push({
              subjectName: course.name.replace(`${cls.name} - `, ""),
              absences: totalAbsences,
              totalLessons: totalLessonsInPeriodForCourse,
              frequency: `${frequency.toFixed(1)}%`,
            });
          }
        });

        if (lowFreqSubjects.length > 0) {
          foundStudents = true;
          reportDataByStudent.push({
            number: student.number,
            name: student.name,
            subjects: lowFreqSubjects,
          });
        }
      });

      if (reportDataByStudent.length > 0) {
        const head = [
          [
            "Nº",
            "Aluno",
            "Disciplina",
            "Faltas",
            "Total de Aulas",
            "% Frequência",
          ],
        ];
        const body = [];

        reportDataByStudent
          .sort((a, b) => (a.number || 999) - (b.number || 999))
          .forEach((studentData) => {
            studentData.subjects.forEach((subject, index) => {
              if (index === 0) {
                body.push([
                  studentData.number || "-",
                  buildPdfStudentNameCell(studentData, cls.name),
                  subject.subjectName,
                  subject.absences,
                  subject.totalLessons,
                  subject.frequency,
                ]);
              } else {
                body.push([
                  "",
                  "",
                  subject.subjectName,
                  subject.absences,
                  subject.totalLessons,
                  subject.frequency,
                ]);
              }
            });
          });

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(`Turma: ${cls.name}`, 14, finalY);

        doc.autoTable({
          startY: finalY + 2,
          head: head,
          body: body,
          theme: "striped",
          headStyles: {
            fillColor: themeColor,
          },
          alternateRowStyles: { fillColor: "#dadada" },
          didDrawPage: drawFooter,
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              drawPdfStudentStrikeThrough(doc, data);
            }
          },
        });
        finalY = doc.autoTable.previous.finalY + 12;
      }
    });

    if (!foundStudents) {
      doc.setFontSize(11);
      doc.text(
        "Nenhum aluno com baixa frequência encontrado para os filtros selecionados.",
        14,
        40,
      );
    }

    doc.save(
      `Relatorio_Baixa_Frequencia_${school.name.replace(/\s/g, "_")}.pdf`,
    );
  };

  const generateAbsenceContentReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const courseId =
      document.getElementById("absence-report-course-select")?.value || "";
    const termValue =
      document.getElementById("absence-report-term-select")?.value || "";
    const studentSelect = document.getElementById(
      "absence-report-student-select",
    );
    const includeContent =
      document.getElementById("absence-report-include-content")?.checked ??
      true;

    if (!courseId || !termValue) {
      CustomSwal.fire(
        "Atenção",
        "Selecione uma turma/disciplina e um período para gerar o relatório.",
        "warning",
      );
      return;
    }

    const course = getUniqueCourses().find((c) => c.id === courseId);
    if (!course) {
      CustomSwal.fire("Erro", "Turma/disciplina não encontrada.", "error");
      return;
    }

    const cls = state.classes.find((c) => c.id === course.classId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const subject = state.subjects.find((s) => s.id === course.subjectId);
    const schoolCalendar = state.calendars[course.schoolId];

    if (!schoolCalendar || !schoolCalendar.terms?.length) {
      CustomSwal.fire(
        "Dados Incompletos",
        "O calendário da escola não foi configurado.",
        "error",
      );
      return;
    }

    const [termStart, termEnd] = termValue.split("|");
    const term = schoolCalendar.terms.find(
      (t) => t.startDate === termStart && t.endDate === termEnd,
    );

    if (!term) {
      CustomSwal.fire("Erro", "Período selecionado inválido.", "error");
      return;
    }

    const allStudents = getStudentsForClass(
      course.classId,
      isReportOnlyActiveStudentsEnabled(),
    );

    const selectedStudentIds = studentSelect
      ? Array.from(studentSelect.selectedOptions).map((opt) => opt.value)
      : ["all"];

    const selectedStudents =
      selectedStudentIds.length === 0 || selectedStudentIds.includes("all")
        ? allStudents
        : allStudents.filter((student) =>
            selectedStudentIds.includes(student.id),
          );

    if (selectedStudents.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Nenhum aluno encontrado para os filtros selecionados.",
        "warning",
      );
      return;
    }

    const classDates = getScheduledDatesForTerm(
      course,
      termStart,
      termEnd,
    ).filter((d) => d.isSchoolDay);
    const todayString = new Date().toISOString().split("T")[0];
    const taughtClassDates = classDates
      .filter((day) => day.date <= todayString)
      .map((day) => {
        const launchedPeriodIndexes = [];

        for (let periodIndex = 0; periodIndex < day.numPeriods; periodIndex++) {
          const attendanceData = getAttendanceForDate(
            course.classId,
            course.subjectId,
            day.date,
            periodIndex,
          );
          const hasAnyLaunch = Object.values(attendanceData || {}).some(
            (status) => status && status !== "unset",
          );

          if (hasAnyLaunch) {
            launchedPeriodIndexes.push(periodIndex);
          }
        }

        return {
          ...day,
          launchedPeriodIndexes,
        };
      })
      .filter((day) => day.launchedPeriodIndexes.length > 0);

    const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const termLabel = `${term.id}º ${schoolCalendar.termType === "bimestre" ? "Bimestre" : "Trimestre"}`;

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(
        "Relatório de Faltas com Conteúdo",
        data.settings.margin.left,
        footerY,
      );
      doc.text("Sistema actEducação", pageWidth / 2, footerY, {
        align: "center",
      });
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - data.settings.margin.right,
        footerY,
        {
          align: "right",
        },
      );
      doc.setTextColor(0);
    };

    selectedStudents.forEach((student, index) => {
      if (index > 0) doc.addPage();

      const absencesByDay = {};
      let totalClassesForStudent = 0;
      let totalAbsencesCount = 0;

      taughtClassDates.forEach((day) => {
        if (!wasStudentInClassOnDate(student.id, course.classId, day.date)) {
          return;
        }

        day.launchedPeriodIndexes.forEach((periodIndex) => {
          totalClassesForStudent += 1;

          const attendanceData = getAttendanceForDate(
            course.classId,
            course.subjectId,
            day.date,
            periodIndex,
          );
          const status = attendanceData[student.id];

          if (status !== "absent") return;

          totalAbsencesCount += 1;

          const contentRecord = getContentForLesson(
            course.classId,
            course.subjectId,
            termStart,
            termEnd,
            day.date,
            periodIndex,
          );

          if (!absencesByDay[day.date]) {
            absencesByDay[day.date] = {
              date: day.date,
              periods: [],
              contents: [],
            };
          }

          absencesByDay[day.date].periods.push(`${periodIndex + 1}ª`);
          absencesByDay[day.date].contents.push(
            contentRecord?.content?.trim() || "Conteúdo não registrado",
          );
        });
      });

      const absenceRows = Object.values(absencesByDay)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((entry) => {
          const formattedDate = new Date(
            `${entry.date}T12:00:00`,
          ).toLocaleDateString("pt-BR");
          const contents = Array.from(new Set(entry.contents));
          const row = [formattedDate, entry.periods.join(", ")];
          if (includeContent) {
            row.push(contents.join(" | "));
          }
          return row;
        });

      const frequencySliceHeaders = taughtClassDates.map((d) => {
        const dateObj = new Date(`${d.date}T12:00:00`);
        return `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      });

      const frequencySliceRow = taughtClassDates.map((day) => {
        if (!wasStudentInClassOnDate(student.id, course.classId, day.date)) {
          return "";
        }

        const dayStatuses = [];
        for (const periodIndex of day.launchedPeriodIndexes) {
          const attendanceData = getAttendanceForDate(
            course.classId,
            course.subjectId,
            day.date,
            periodIndex,
          );
          const status = attendanceData[student.id];
          dayStatuses.push(status === "absent" ? "F" : "-");
        }

        return dayStatuses.join(",");
      });

      const absencePercent =
        totalClassesForStudent > 0
          ? (totalAbsencesCount / totalClassesForStudent) * 100
          : 0;

      doc.setFontSize(15);
      doc.text("Relatório de Faltas por Aluno", 14, 15);
      doc.setFontSize(10);
      doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 22);
      doc.text(`Turma: ${cls?.name || "Não informada"}`, 14, 27);
      doc.text(`Disciplina: ${subject?.name || "Não informada"}`, 14, 32);
      doc.text(`Período: ${termLabel}`, 14, 37);
      drawPdfStudentLabel(
        doc,
        14,
        42,
        student,
        cls?.name || "",
        `Aluno: ${student.number || "-"} - `,
      );

      doc.setFontSize(9);
      doc.text(
        `${totalAbsencesCount} faltas de ${totalClassesForStudent} aulas (${absencePercent.toFixed(1)}%)`,
        pageWidth - 14,
        42,
        { align: "right" },
      );

      if (taughtClassDates.length === 0) {
        doc.setFontSize(11);
        doc.text(
          "Nenhuma aula ministrada até o momento para este período.",
          14,
          55,
        );
        drawFooter({
          pageNumber: doc.internal.getNumberOfPages(),
          settings: { margin: { left: 14, right: 14 } },
        });
        return;
      }

      if (includeContent && absenceRows.length === 0) {
        doc.setFontSize(11);
        doc.text(
          "Nenhuma falta registrada para este aluno no período selecionado.",
          14,
          55,
        );
        drawFooter({
          pageNumber: doc.internal.getNumberOfPages(),
          settings: { margin: { left: 14, right: 14 } },
        });
        return;
      }

      if (includeContent) {
        doc.autoTable({
          startY: 48,
          head: [["Data", "Aulas com falta", "Conteúdo ministrado no dia"]],
          body: absenceRows,
          theme: "striped",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          styles: { fontSize: 9, valign: "top" },
          columnStyles: {
            0: { cellWidth: 28, halign: "center" },
            1: { cellWidth: 34, halign: "center" },
            2: { cellWidth: "auto" },
          },
          didDrawPage: drawFooter,
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              drawPdfStudentStrikeThrough(doc, data);
            }
          },
        });
      } else {
        const compactHead = [["Nº", "Aluno", ...frequencySliceHeaders]];
        const compactBody = [
          [
            student.number || "-",
            buildPdfStudentNameCell(student, cls?.name || ""),
            ...frequencySliceRow,
          ],
        ];

        doc.autoTable({
          startY: 48,
          head: compactHead,
          body: compactBody,
          theme: "striped",
          headStyles: { fillColor: themeColor, fontSize: 7, halign: "center" },
          alternateRowStyles: { fillColor: "#dadada" },
          styles: { fontSize: 8, halign: "center", valign: "middle" },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 45, halign: "left" },
          },
          didDrawPage: drawFooter,
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index >= 2) {
              const cellText = data.cell.text?.[0] || "";
              if (cellText.includes("F")) {
                data.cell.styles.textColor = "#e74c3c";
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 1) {
              drawPdfStudentStrikeThrough(doc, data);
            }
          },
        });
      }
    });

    const safeClassName = (cls?.name || "Turma").replace(/\s+/g, "_");
    const safeSubjectName = (subject?.name || "Disciplina").replace(
      /\s+/g,
      "_",
    );

    doc.save(
      `Relatorio_Faltas_Conteudo_${safeClassName}_${safeSubjectName}.pdf`,
    );
  };

  /**
   * NOVO HELPER: Obtém todas as aulas agendadas para uma data específica, agrupadas por professor.
   */
  const getScheduledClassesForDate = (date) => {
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split("T")[0];
    const schedulesToUse = getSchedulesForDate(dateString);
    const scheduledToday = schedulesToUse.filter(
      (s) => s.dayOfWeek === dayOfWeek,
    );

    const classesByTeacher = scheduledToday.reduce((acc, schedule) => {
      const teacher = state.teachers.find(
        (t) => t.id === schedule.teacherId,
      ) || { name: "Professor Desconhecido" };
      if (!acc[teacher.id]) {
        acc[teacher.id] = {
          teacherName: teacher.name,
          classes: [],
        };
      }

      const cls = state.classes.find((c) => c.id === schedule.classId);
      const subject = state.subjects.find((s) => s.id === schedule.subjectId);

      if (cls && subject) {
        // Verifica se essa combinação de turma/disciplina já foi adicionada para este professor
        let classEntry = acc[teacher.id].classes.find(
          (c) => c.classId === cls.id && c.subjectId === subject.id,
        );

        if (classEntry) {
          // Se já existe, apenas incrementa o número de aulas e atualiza horários
          classEntry.numPeriods++;
          if (schedule.endTime > classEntry.endTime) {
            classEntry.endTime = schedule.endTime;
          }
        } else {
          // Se não existe, cria uma nova entrada
          acc[teacher.id].classes.push({
            classId: cls.id,
            subjectId: subject.id,
            schoolId: cls.schoolId,
            courseId: `${cls.id}|${subject.id}`,
            className: cls.name,
            subjectName: subject.name,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            numPeriods: 1,
          });
        }
      }
      return acc;
    }, {});

    // Ordena as aulas de cada professor por horário de início
    Object.values(classesByTeacher).forEach((teacherGroup) => {
      teacherGroup.classes.sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
    });

    // Converte o objeto em um array e ordena pelo nome do professor
    return Object.values(classesByTeacher).sort((a, b) =>
      a.teacherName.localeCompare(b.teacherName),
    );
  };

  /**
   * CORRIGIDO E ATUALIZADO: Verifica o status de lançamento (frequência e conteúdo) para uma aula específica.
   * A verificação de frequência agora ignora o status 'unset', consertando o bug.
   * AGORA TAMB�0M VERIFICA SE O DIA �0 LETIVO.
   */
  const getLaunchStatus = (scheduledClass, date) => {
    const dateString = date.toISOString().split("T")[0];
    const schoolCalendar = state.calendars[scheduledClass.schoolId];

    // --- INÍCIO DA MODIFICA�!ÒO ---
    // 1. Verifica se é um dia letivo
    let isSchoolDay = true;
    let nonSchoolDayReason = null;
    if (schoolCalendar && schoolCalendar.importantDates) {
      const importantDate = schoolCalendar.importantDates.find(
        (d) => d.date === dateString,
      );
      if (importantDate && !importantDate.isSchoolDay) {
        isSchoolDay = false;
        nonSchoolDayReason = importantDate.description;
      }
    }

    let attendanceStatus = "Pendente";
    let contentStatus = "Pendente";

    // 2. Se não for dia letivo, define o status e retorna
    if (!isSchoolDay) {
      attendanceStatus = "Não Letivo";
      contentStatus = "Não Letivo";
      return {
        attendanceStatus,
        contentStatus,
        isSchoolDay,
        nonSchoolDayReason,
      };
    }
    // --- FIM DA MODIFICA�!ÒO ---

    // 3. Se FOR um dia letivo, executa a lógica original
    const currentTerm = getCurrentTerm(schoolCalendar, date);

    // Verifica status da Frequência (L�GICA CORRIGIDA)
    let attendanceLaunchedPeriods = 0;
    for (let i = 0; i < scheduledClass.numPeriods; i++) {
      // Obtém versão vigente da grade para a data
      const gradeVigente = getGradeHorariaVigente(dateString);
      const versaoSuffix = gradeVigente ? `_v${gradeVigente.versao}` : "";

      // Tenta buscar com versão, se não encontrar, busca sem versão (dados antigos)
      const keyWithVersion = `${scheduledClass.classId}_${scheduledClass.subjectId}_${dateString}_${i}${versaoSuffix}`;
      const keyOld = `${scheduledClass.classId}_${scheduledClass.subjectId}_${dateString}_${i}`;
      const periodAttendance =
        state.attendance[keyWithVersion] || state.attendance[keyOld];

      if (periodAttendance) {
        // A verificação agora procura por qualquer status que NÒO SEJA 'unset'.
        // Isso garante que a aula só é considerada lançada se uma ação real foi tomada.
        const isPeriodLaunched = Object.values(periodAttendance).some(
          (status) => status !== "unset",
        );
        if (isPeriodLaunched) {
          attendanceLaunchedPeriods++;
        }
      }
    }

    if (attendanceLaunchedPeriods === scheduledClass.numPeriods) {
      attendanceStatus = "Lançada";
    } else if (attendanceLaunchedPeriods > 0) {
      attendanceStatus = "Parcial";
    }

    // Verifica status do Conteúdo
    if (currentTerm) {
      const termKey = `${scheduledClass.classId}_${scheduledClass.subjectId}_${currentTerm.startDate}_${currentTerm.endDate}`;
      const termContent = state.content[termKey];
      if (termContent && termContent.dailyRecords) {
        let contentLaunchedPeriods = 0;
        for (let i = 0; i < scheduledClass.numPeriods; i++) {
          // Obtém versão vigente da grade para a data
          const gradeVigente = getGradeHorariaVigente(dateString);
          const versaoSuffix = gradeVigente ? `_v${gradeVigente.versao}` : "";

          // Tenta buscar com versão, se não encontrar, busca sem versão (dados antigos)
          const lessonKeyWithVersion = `${dateString}_${i}${versaoSuffix}`;
          const lessonKeyOld = `${dateString}_${i}`;
          const record =
            termContent.dailyRecords[lessonKeyWithVersion] ||
            termContent.dailyRecords[lessonKeyOld];
          if (record && record.content.trim() !== "") {
            contentLaunchedPeriods++;
          }
        }
        if (contentLaunchedPeriods === scheduledClass.numPeriods) {
          contentStatus = "Lançado";
        } else if (contentLaunchedPeriods > 0) {
          contentStatus = "Parcial";
        }
      }
    }

    // Retorna o status de dia letivo
    return { attendanceStatus, contentStatus, isSchoolDay, nonSchoolDayReason };
  };

  /**
   * ATUALIZADO: Renderiza a página de Lançamentos com visão semanal de 6 dias (Seg-Sáb).
   * AGORA TAMB�0M EXIBE DIAS NÒO LETIVOS CORRETAMENTE.
   */
  const renderReleasesPage = (params = {}) => {
    const currentDate = params.currentDate
      ? new Date(params.currentDate + "T12:00:00")
      : new Date();
    currentDate.setHours(0, 0, 0, 0);

    const dayOfWeek = currentDate.getDay(); // 0 (Dom) a 6 (Sáb)
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajusta para a semana começar na Segunda
    const monday = new Date(currentDate.setDate(diff));

    const weekDates = [];
    // MODIFICA�!ÒO: Loop alterado de 7 para 6 para remover o Domingo.
    for (let i = 0; i < 6; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      weekDates.push(day);
    }

    const weekStartStr = weekDates[0].toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    // MODIFICA�!ÒO: O final da semana agora é o 6º dia (índice 5).
    const weekEndStr = weekDates[5].toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const prevWeek = new Date(monday);
    prevWeek.setDate(monday.getDate() - 7);
    const nextWeek = new Date(monday);
    nextWeek.setDate(monday.getDate() + 7);

    const weekDaysHtml = weekDates
      .map((date) => {
        const teacherGroups = getScheduledClassesForDate(date);
        const dayName = date.toLocaleDateString("pt-BR", { weekday: "long" });
        const formattedDate = date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
        const isToday = date.toDateString() === new Date().toDateString();

        const classCardsHtml = teacherGroups
          .flatMap((group) =>
            group.classes.map((cls) => {
              // --- INÍCIO DA MODIFICA�!ÒO ---
              const {
                attendanceStatus,
                contentStatus,
                isSchoolDay,
                nonSchoolDayReason,
              } = getLaunchStatus(cls, date);

              const aulasTexto = cls.numPeriods > 1 ? "aulas" : "aula";

              // --- L�GICA PARA ABREVIAR A DISCIPLINA ---
              let displaySubjectName = cls.subjectName;
              if (cls.subjectName.length > 10) {
                displaySubjectName = cls.subjectName
                  .split(" ")
                  .map((word) => word.substring(0, 4))
                  .join(" ");
              }
              const fullTitle = `${cls.className} - ${cls.subjectName}`;
              const displayTitle = `${cls.className} - ${displaySubjectName}`;
              // --- FIM DA L�GICA ---

              let cardBodyHtml = "";
              if (!isSchoolDay) {
                // Dia não letivo: Exibe o motivo e desabilita ações
                cardBodyHtml = `
                        <div class="text-xs space-y-1 mb-3 text-center opacity-70 pt-2">
                            <i class="fas fa-ban text-secondary fa-lg mb-2"></i>
                            <p class="text-xs font-semibold text-secondary">${nonSchoolDayReason || "Dia Não Letivo"}</p>
                        </div>
                    `;
              } else {
                // Dia letivo: Exibe a lógica original de status e botão
                const attendanceBadgeClass =
                  attendanceStatus.toLowerCase() === "lançada"
                    ? "status-lancado"
                    : "status-pendente";
                const contentBadgeClass =
                  contentStatus.toLowerCase() === "lançado"
                    ? "status-lancado"
                    : "status-pendente";
                cardBodyHtml = `
                        <div class="text-xs space-y-1 mb-3">
                            <div class="flex justify-between items-center"><span>Frequência:</span> <span class="status-badge ${attendanceBadgeClass}">${attendanceStatus}</span></div>
                            <div class="flex justify-between items-center"><span>Conteúdo:</span> <span class="status-badge ${contentBadgeClass}">${contentStatus}</span></div>
                        </div>
                        <button class="btn btn-primary w-full text-xs py-1 btn-go-to-diary" data-course-id="${cls.courseId}">
                            <i class="fas fa-arrow-right mr-1"></i> Lançar
                        </button>
                    `;
              }

              return `
                <div class="card p-3 mb-3">
                    
                    <p class="font-bold text-sm truncate" title="${fullTitle}">${displayTitle}</p>
                    
                    <p class="text-xs text-secondary">${group.teacherName}</p>
                    <p class="text-xs font-semibold text-gray-500 mb-2"><i class="fas fa-clock mr-1"></i> ${cls.startTime} (${cls.numPeriods} ${aulasTexto})</p>
                    ${cardBodyHtml}
                </div>
                `;
              // --- FIM DA MODIFICA�!ÒO ---
            }),
          )
          .join("");

        return `
            <div class="flex-1 min-w-[200px] bg-[var(--bg-primary)] rounded-lg p-3">
                <h4 class="font-bold text-center pb-2 mb-3 border-b-2 ${isToday ? "border-[var(--theme-color)] text-[var(--theme-color)]" : "border-[var(--border-color)]"}">
                    ${dayName.split("-")[0]} <span class="font-normal text-sm">${formattedDate}</span>
                </h4>
                <div class="space-y-2">
                    ${classCardsHtml || `<div class="text-center text-xs text-secondary p-4">Nenhuma aula.</div>`}
                </div>
            </div>
        `;
      })
      .join("");

    return `
        <div class="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
                <h2 class="text-2xl font-bold">Lançamentos da Semana</h2>
                <p class="text-secondary font-semibold">${weekStartStr} - ${weekEndStr}</p>
            </div>
            <div class="flex items-center gap-2">
                <button id="releases-prev-week" class="btn btn-subtle" data-date="${prevWeek.toISOString().split("T")[0]}"><i class="fas fa-chevron-left mr-2"></i>Semana Anterior</button>
                <button id="releases-today" class="btn btn-subtle">Hoje</button>
                <button id="releases-next-week" class="btn btn-subtle" data-date="${nextWeek.toISOString().split("T")[0]}">Próxima Semana<i class="fas fa-chevron-right ml-2"></i></button>
            </div>
        </div>
        <div class="flex gap-4 overflow-x-auto pb-4">
            ${weekDaysHtml}
        </div>
    `;
  };

  init();
});

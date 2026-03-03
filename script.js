document.addEventListener("DOMContentLoaded", () => {
  // Handle para o arquivo JSON aberto, permitindo salvar automaticamente.
  let fileHandle = null;

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
        const parsedData = JSON.parse(content);
        state = { ...state, ...parsedData }; // Mescla os dados carregados ao estado
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
    // Se não temos um arquivo aberto (permissão dada), não fazemos nada.
    if (!fileHandle) return;

    try {
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(state, null, 2)); // O 'null, 2' formata o JSON para ser legível
      await writable.close();
    } catch (error) {
      console.error("Erro no salvamento automático:", error);
      // Poderia exibir um alerta discreto aqui se o salvamento falhar
    }
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
  const themeBtn = document.getElementById("theme-btn");
  const backupBtn = document.getElementById("backup-btn");
  const settingsBtn = document.getElementById("settings-btn");

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
    },
    schools: [],
    teachers: [],
    subjects: [],
    classes: [],
    students: [],
    schedules: [],
    homeworks: [],
    tasks: [],
    notes: [],
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
      if (grade < 5) {
        data.cell.styles.textColor = "#e74c3c"; // Vermelho
      } else {
        data.cell.styles.textColor = "#2980b9"; // Azul
      }
    }
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
      return parseFloat(adjustment);
    }
    const averageKey = `${studentId}_${courseId}_${termKey}`;
    const average = state.calculatedAverages[averageKey];
    if (average !== undefined && average !== null) {
      return parseFloat(average);
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

    // 1. Calcula a média aritmética de todos os períodos
    const terms = schoolCalendar.terms.filter((t) => t.startDate && t.endDate);
    let sumOfGrades = 0;
    let countOfGrades = 0;
    terms.forEach((term) => {
      const termKey = `${term.startDate}|${term.endDate}`;
      const grade = getDefinitiveGrade(studentId, course.id, termKey);
      if (grade !== null) {
        sumOfGrades += grade;
        countOfGrades++;
      }
    });
    const calculatedFinalAverage =
      countOfGrades > 0 ? sumOfGrades / countOfGrades : null;

    // 2. Obtém o ajuste do conselho, se houver
    const adjustmentKey = `${studentId}_${course.id}`;
    const councilAdjustment = state.finalAdjustments[adjustmentKey];
    const hasCouncilAdjustment =
      councilAdjustment !== undefined &&
      councilAdjustment !== null &&
      councilAdjustment !== "";

    // 3. Define qual nota será usada para determinar a aprovação
    // Se houver nota de conselho, ela prevalece sobre a média calculada para fins de nota final
    const finalGrade = hasCouncilAdjustment
      ? parseFloat(councilAdjustment)
      : calculatedFinalAverage;

    // 4. Calcula a frequência anual
    const yearlyAttendanceData = getYearlyAttendance(
      {
        id: studentId,
      },
      course,
    );
    const yearlyFrequency = 100 - yearlyAttendanceData.yearlyAbsencePercentage;

    // 5. Determina a situação final com base nas regras padronizadas
    let situation = "Pendente";
    let situationClass = "text-secondary";

    if (finalGrade !== null) {
      const hasPassingGrade = finalGrade >= 5;
      const hasPassingFrequency = yearlyFrequency >= 75;

      if (hasPassingGrade && hasPassingFrequency) {
        // Se passou em tudo
        // Verifica se foi salvo pelo conselho (Média calculada era ruim, mas tem nota de conselho que salvou)
        if (
          (calculatedFinalAverage === null || calculatedFinalAverage < 5) &&
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

    // 6. [CORREÇÃO] Verifica se há uma situação manual salva (Override) e aplica
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
      finalGrade,
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

      const classDates = getScheduledDatesForTerm(
        course,
        term.startDate,
        term.endDate,
      );
      const schoolDays = classDates.filter((d) => d.isSchoolDay);
      totalClassesInYear += schoolDays.reduce(
        (total, day) => total + day.numPeriods,
        0,
      );
    });

    const yearlyAbsencePercentage =
      totalClassesInYear > 0 ? (totalAbsences / totalClassesInYear) * 100 : 0;

    return { totalAbsences, totalExcusedAbsences, yearlyAbsencePercentage };
  };

  // ++ NOVO HELPER ++
  const getTermAttendance = (student, course, term) => {
    const classDates = getScheduledDatesForTerm(
      course,
      term.startDate,
      term.endDate,
    );
    const schoolDays = classDates.filter((d) => d.isSchoolDay);
    const totalClassesInTerm = schoolDays.reduce(
      (total, day) => total + day.numPeriods,
      0,
    );

    let absences = 0;
    let excusedAbsences = 0;

    schoolDays.forEach((d) => {
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
      }
    });

    const absencePercentage =
      totalClassesInTerm > 0 ? (absences / totalClassesInTerm) * 100 : 0;
    return { absences, excusedAbsences, absencePercentage };
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
                        <button class="btn-generate-single-class-excel p-2 text-green-600 hover:text-green-800" data-id="${c.id}" title="Gerar Excel da Turma"><i class="fas fa-file-excel fa-fw"></i></button>
                        <button class="btn-generate-single-class-pdf p-2 text-red-500 hover:text-red-700" data-id="${c.id}" title="Gerar PDF da Turma"><i class="fas fa-file-pdf fa-fw"></i></button>
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
                    <button id="btn-generate-all-classes-excel" class="btn btn-subtle"><i class="fas fa-file-excel mr-2"></i> Relatório Excel (Todas)</button>
                    <button id="btn-generate-all-classes-pdf" class="btn btn-subtle"><i class="fas fa-file-pdf mr-2"></i> Relatório PDF (Todas)</button>
                    <button id="btn-add-class" class="btn btn-primary"><i class="fas fa-plus mr-2"></i> Nova Turma</button>
                </div>
            </div>
            ${state.classes.length > 0 ? `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">${classCards}</div>` : `<div class="card p-6 text-center text-secondary">Nenhuma turma cadastrada.</div>`}`;
  };

  const renderManageClassPage = (classId) => {
    const cls = state.classes.find((c) => c.id === classId);
    if (!cls) return `<p>Turma não encontrada.</p>`;

    const students = state.students
      .filter((s) => s.classId === classId)
      .sort(
        (a, b) =>
          (a.number || 999) - (b.number || 999) || a.name.localeCompare(b.name),
      );

    const studentRows =
      students
        .map((s) => {
          const status = s.status || "ativo";
          const rowClass = status !== "ativo" ? "student-inactive" : "";
          const statusBadgeClass = `status-${status}`;
          const statusText = status.charAt(0).toUpperCase() + status.slice(1);

          return `
            <tr class="${rowClass}">
                <td class="w-24">${s.number || "-"}</td>
                <td>${s.name}</td>
                <td>
                    ${s.ra || "-"}
                    ${s.ra ? `<button class="btn-copy-ra ml-2 text-gray-400 hover:text-[var(--theme-color)] transition-colors" data-ra="${s.ra}" title="Copiar RA (sem hífen)"><i class="fas fa-copy"></i></button>` : ""}
                </td>
                <td><span class="status-badge ${statusBadgeClass}">${statusText}</span></td>
                <td class="text-center">
                    <input type="checkbox" class="laudo-checkbox form-checkbox h-5 w-5 text-[var(--theme-color)] focus:ring-[var(--theme-color)]" data-student-id="${s.id}" ${s.hasLaudo ? "checked" : ""}>
                </td>
                <td class="text-right">
                    <button class="btn-edit-student text-[var(--theme-color)] hover:text-[var(--theme-color-dark)] mr-2" data-id="${s.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-student text-red-500 hover:text-red-700" data-id="${s.id}"><i class="fas fa-trash"></i></button>
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

  const renderDiaryPage = () => {
    const courseOptions = getUniqueCourses()
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
    return `
            <div id="diary-page-container">
                <div class="card p-6">
                    <div class="flex flex-wrap items-center gap-4 mb-4">
                        <h2 class="text-2xl font-bold">Diário de Classe</h2>
                        <div class="flex-grow flex flex-wrap items-center gap-4">
                            <select id="diary-course-select" class="form-select w-auto flex-grow">
                                <option value="">Selecione Turma e Disciplina...</option>
                                ${courseOptions}
                            </select>
                            <div id="term-selector-container" class="flex-grow"></div>
                        </div>
                    </div>
                     <div id="class-info-container" class="w-full text-right font-semibold text-secondary mb-4 space-x-6"></div>
                     <div id="diary-actions-container-top" class="text-right mb-4"></div>
                    
                    <div class="border-b border-color">
                        <nav id="diary-tabs" class="flex flex-wrap" aria-label="Tabs">
                            <button data-tab="attendance" class="page-tab active"><i class="fas fa-calendar-check fa-fw"></i>Frequência</button>
                            <button data-tab="content" class="page-tab"><i class="fas fa-book-open fa-fw"></i>Registro de Aulas</button>
                            <button data-tab="homework" class="page-tab"><i class="fas fa-pencil-ruler fa-fw"></i>Atividades em Sala</button>
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

  const generateAttendanceGrid = (course, classDates) => {
    const students = state.students
      .filter((s) => s.classId === course.classId && s.status === "ativo")
      .sort((a, b) => (a.number || 999) - (b.number || 999));

    if (students.length === 0) {
      return {
        gridHtml: `<p class="text-center text-secondary">Nenhum aluno ativo cadastrado nesta turma.</p>`,
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

    const studentRows = students
      .map((student) => {
        return `<tr data-student-row-id="${student.id}">
                        <td class="student-name" title="${student.name}"><span class="font-bold text-secondary mr-2">${student.number || "-"}</span>${student.name}</td>
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
                                dayCells.push(
                                  `<td><div class="attendance-cell" data-status="${status}" data-student-id="${student.id}" data-date="${d.date}" data-period-index="${i}">${statusText}</div></td>`,
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
   * CORREÇÃO: A função agora lê o status da frequência diretamente dos elementos da tela (DOM),
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
        const totalCell = mainContent.querySelector(
          `[data-total-absent-for="${d.date}_${i}"]`,
        );
        if (totalCell) {
          let dailyAbsences = 0;
          if (d.isSchoolDay) {
            // Soma as faltas para este dia/aula a partir do DOM
            studentRows.forEach((row) => {
              const studentId = row.dataset.studentRowId;
              const cell = mainContent.querySelector(
                `.attendance-cell[data-student-id="${studentId}"][data-date="${d.date}"][data-period-index="${i}"]`,
              );
              if (cell && cell.dataset.status === "absent") {
                dailyAbsences++;
              }
            });
          }
          totalCell.textContent = dailyAbsences > 0 ? dailyAbsences : "-";
        }
      }
    });
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
                    <td class="whitespace-nowrap align-top pt-5 font-medium">${formattedDate} ${periodBadge}</td>
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

    const actionsHtml = `<div class="text-right mt-6">
                                <button class="btn btn-primary btn-save-content"><i class="fas fa-save mr-2"></i>Salvar Registros</button>
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
                <button id="btn-manage-versions" class="btn btn-subtle"><i class="fas fa-history mr-2"></i>Gerenciar Versões</button>
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
                // CASO 1: É uma aula com turma e disciplina definidas
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
                // CASO 2: É apenas um texto visual
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

  const renderTasksPage = (params = {}) => {
    const view = params.view || "kanban";
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
                                <th>Tags</th>
                                <th class="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedTasks.length > 0 ? tableRows : `<tr><td colspan="6" class="text-center text-secondary py-4">Nenhuma tarefa encontrada.</td></tr>`}
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
    const numericValue = parseFloat(value);
    if (element) {
      // Limpa as classes de nota existentes primeiro
      element.classList.remove("grade-danger", "grade-success");

      if (!isNaN(numericValue)) {
        if (numericValue < 5) {
          element.classList.add("grade-danger");
        } else {
          element.classList.add("grade-success");
        }
      }
    }
  };

  const renderAssessmentsPage = (course, classDates, termKey) => {
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

      const students = state.students
        .filter((s) => s.classId === course.classId && s.status === "ativo")
        .sort((a, b) => (a.number || 999) - (b.number || 999));

      if (students.length === 0) {
        return {
          gridHtml:
            '<p class="text-center text-secondary">Nenhum aluno ativo na turma.</p>',
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
              const gradeDisplay = grade !== null ? grade.toFixed(1) : "--";
              const gradeClass =
                grade !== null
                  ? grade < 5
                    ? "grade-danger"
                    : "grade-success"
                  : "";
              return `<td class="font-bold text-center ${gradeClass}">${gradeDisplay}</td>`;
            })
            .join("");

          const finalAverageDisplay =
            result.calculatedFinalAverage !== null
              ? result.calculatedFinalAverage.toFixed(2)
              : "--";
          const finalAverageClass =
            result.calculatedFinalAverage !== null
              ? result.calculatedFinalAverage < 5
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
            <tr data-student-id="${student.id}">
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
                    ${students.length > 0 ? studentRows : '<tr><td colspan="100%" class="text-center py-4">Nenhum aluno ativo na turma.</td></tr>'}
                </tbody>
            </table>
        </div>`;

      return {
        gridHtml: gridHtml,
        actionsHtml: "",
      };
    }

    // Lógica original para renderizar avaliações de um bimestre/trimestre (MANTIDA IGUAL)
    const courseId = course.id;
    const students = state.students
      .filter((s) => s.classId === course.classId && s.status === "ativo")
      .sort((a, b) => (a.number || 999) - (b.number || 999));

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
                ? parseFloat(gradeValue) < 5
                  ? "grade-danger"
                  : "grade-success"
                : "";
            return `
            <td>
                <input type="number"
                       class="form-input grade-input text-center p-1 ${gradeClass}"
                       min="0" max="10" step="0.1"
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
            ? parseFloat(adjustmentValue) < 5
              ? "grade-danger"
              : "grade-success"
            : "";

        const averageKey = `${student.id}_${courseId}_${termKey}`;
        const calculatedAverage = state.calculatedAverages[averageKey];
        const averageDisplay =
          calculatedAverage !== undefined && calculatedAverage !== null
            ? calculatedAverage.toFixed(2)
            : "--";
        const averageClass =
          calculatedAverage !== undefined && calculatedAverage !== null
            ? calculatedAverage < 5
              ? "grade-danger"
              : "grade-success"
            : "";

        const attendanceKey = `${student.id}_${courseId}_${termKey}`;
        const savedAttendance = state.termAttendance[attendanceKey];

        return `
        <tr data-student-id="${student.id}">
            <td class="student-name" title="${student.name}"><span class="font-bold text-secondary mr-2">${student.number || "-"}</span>${student.name}</td>
            ${gradeInputs}
            <td class="font-bold ${averageClass}" data-result="final-average">${averageDisplay}</td>
            <td><input type="number" class="form-input adjustment-input text-center p-1 ${adjustmentClass}" min="0" max="10" step="0.1" value="${adjustmentValue}" data-student-id="${student.id}"></td>
            <td data-result="absences">${savedAttendance ? savedAttendance.absences : "--"}</td>
            <td data-result="excused-absences">${savedAttendance ? savedAttendance.excusedAbsences : "--"}</td>
            <td data-result="absence-percentage">${savedAttendance ? savedAttendance.absencePercentage.toFixed(0) + "%" : "--"}</td>
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
                    <th>Média Final</th>
                    <th>Ajuste</th>
                    <th>Faltas</th>
                    <th>Justif.</th>
                    <th>% Aus.</th>
                </tr>
            </thead>
            <tbody>
                ${students.length > 0 ? studentRows : '<tr><td colspan="100%" class="text-center py-4">Nenhum aluno ativo na turma.</td></tr>'}
            </tbody>
        </table>
    </div>`;

    const actionsHtml = `
    <div class="text-right mt-6">
        <button id="btn-calculate-averages" class="btn btn-primary" ${assessmentsForTerm.length === 0 ? "disabled" : ""}><i class="fas fa-calculator mr-2"></i>Calcular Médias e Faltas</button>
    </div>`;

    const fullHtml = headerHtml + assessmentsListHtml + tableHtml;

    return {
      gridHtml: fullHtml,
      actionsHtml: actionsHtml,
    };
  };

  const renderBulletinsPage = (course) => {
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

    const students = state.students
      .filter((s) => s.classId === course.classId && s.status === "ativo")
      .sort((a, b) => (a.number || 999) - (b.number || 999));

    if (students.length === 0) {
      return {
        gridHtml:
          '<p class="text-center text-secondary">Nenhum aluno ativo na turma.</p>',
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
            <th class="font-normal term-separator">Média</th>
            <th class="font-normal" title="Faltas">F</th>
            <th class="font-normal" title="Percentual de Ausência">% Aus</th>
            <th class="font-normal" title="Faltas Justificadas">F/J</th>
        `,
      )
      .join("");

    const studentRows = students
      .map((student) => {
        const termCells = terms
          .flatMap((term) => {
            const termKey = `${term.startDate}|${term.endDate}`;
            const grade = getDefinitiveGrade(student.id, course.id, termKey);
            const gradeDisplay = grade !== null ? grade.toFixed(1) : "--";
            const gradeClass =
              grade !== null
                ? grade < 5
                  ? "grade-danger"
                  : "grade-success"
                : "";

            const attendance = getTermAttendance(student, course, term);

            return `
                    <td class="${gradeClass} term-separator">${gradeDisplay}</td>
                    <td>${attendance.absences}</td>
                    <td>${attendance.absencePercentage.toFixed(0)}%</td>
                    <td>${attendance.excusedAbsences}</td>
                `;
          })
          .join("");

        // Usa a nova função para obter o resultado final consistente
        const finalResult = getFinalResult(student.id, course);
        const finalGradeDisplay =
          finalResult.finalGrade !== null
            ? finalResult.finalGrade.toFixed(2)
            : "--";
        const finalGradeClass =
          finalResult.finalGrade !== null
            ? finalResult.finalGrade < 5
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
            <tr data-student-id="${student.id}">
                <td class="student-name" title="${student.name}"><span class="font-bold text-secondary mr-2">${student.number || "-"}</span>${student.name}</td>
                ${termCells}
                <td class="font-bold ${finalGradeClass}" data-result="bulletin-final-average">${finalGradeDisplay}</td>
                <td class="font-bold ${finalResult.situationClass}" data-result="bulletin-final-situation">${situationDisplay}</td>
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
                            <th rowspan="2" class="align-bottom term-separator">Média Final</th>
                            <th rowspan="2" class="align-bottom">Situação Final</th>
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

  const openHomeworkModal = (courseId, id) => {
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

    CustomSwal.fire({
      title: isEditing
        ? "Editar Atividade em sala"
        : `Nova Atividade para ${course.name}`,
      html: `
            <form class="swal-modern-form">
                <div class="grid grid-cols-2 gap-4">
                    <div class="swal-modern-input-group">
                        <label for="hw-assigned-date" class="swal-modern-label">Data Solicitação</label>
                        <input id="hw-assigned-date" type="date" class="swal-modern-input" value="${hw?.assignedDate || new Date().toISOString().split("T")[0]}">
                    </div>
                    <div class="swal-modern-input-group">
                        <label for="hw-due-date" class="swal-modern-label">Data Entrega</label>
                        <input id="hw-due-date" type="date" class="swal-modern-input" value="${hw?.dueDate || ""}">
                    </div>
                </div>
                <div class="swal-modern-input-group">
                    <label for="hw-description" class="swal-modern-label">Descrição da Atividade</label>
                    <textarea id="hw-description" class="swal-modern-textarea" placeholder="Detalhe a atividade, páginas do livro, exercícios, etc.">${hw?.description || ""}</textarea>
                </div>
            </form>`,
      confirmButtonText: "Salvar",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const assignedDate = document.getElementById("hw-assigned-date").value;
        const dueDate = document.getElementById("hw-due-date").value;
        const description = document.getElementById("hw-description").value;

        if (!assignedDate || !dueDate || !description) {
          Swal.showValidationMessage("Todos os campos são obrigatórios.");
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
        const diaryTabContent = mainContent.querySelector("#diary-tab-content");
        if (diaryTabContent) {
          const courseSelect = mainContent.querySelector(
            "#diary-course-select",
          );
          const termSelect = mainContent.querySelector("#diary-term-select");
          if (courseSelect.value && termSelect.value) {
            const [termStart, termEnd] = termSelect.value.split("|");
            const { gridHtml, actionsHtml } = renderHomeworkList(
              courseId,
              termStart,
              termEnd,
            );
            diaryTabContent.innerHTML = gridHtml;
            mainContent.querySelector(
              "#diary-actions-container-top",
            ).innerHTML = actionsHtml;
            mainContent.querySelector(
              "#diary-actions-container-bottom",
            ).innerHTML = actionsHtml;
          }
        }
      }
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
        const tags = document
          .getElementById("task-tags")
          .value.split(",")
          .map((t) => t.trim())
          .filter((t) => t);

        if (!title) {
          Swal.showValidationMessage("O título da tarefa é obrigatório.");
          return false;
        }
        return { title, description, dueDate, priority, status, tags };
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
    themeBtn.addEventListener("click", openAppearanceModal);
    settingsBtn.addEventListener("click", () =>
      CustomSwal.fire(
        "Em breve",
        "Configurações gerais do aplicativo estarão aqui.",
        "info",
      ),
    );
    backupBtn.addEventListener("click", openBackupRestoreModal);
  };

  const attachPageEventListeners = (pageId, params) => {
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

    // --- 2. RELEASES (LANÇAMENTOS) ---
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

    // --- 3. ORGANIZATION (ORGANIZAÇÃO) ---
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
        .querySelector("#btn-generate-all-classes-pdf")
        ?.addEventListener("click", () =>
          generateClassListReport({
            all: true,
          }),
        );
      mainContent
        .querySelectorAll(".btn-generate-single-class-pdf")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            generateSimpleClassListPdf(e.currentTarget.dataset.id);
          });
        });

      mainContent
        .querySelector("#btn-generate-all-classes-excel")
        ?.addEventListener("click", () =>
          generateClassListExcel({
            all: true,
          }),
        );
      mainContent
        .querySelectorAll(".btn-generate-single-class-excel")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            generateClassListExcel({
              classId: e.currentTarget.dataset.id,
            });
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

    // --- 8. NOTES (ANOTAÇÕES) ---
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

    // --- 9. TEACHER NOTES (ANOTAÇÕES DO PROFESSOR) ---
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

    // --- 10. EDIT NOTE (EDITOR DE ANOTAÇÃO) ---
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
        const studentCount = state.students.filter(
          (s) => s.classId === course.classId && s.status === "ativo",
        ).length;
        const hasSchoolDays =
          classDates.filter((d) => d.isSchoolDay).length > 0;

        classInfoContainer.innerHTML = `
            <span class="inline-flex items-center"><i class="fas fa-users mr-2 text-secondary"></i><strong>${studentCount}</strong>&nbsp;Alunos Ativos</span>
            ${schoolDaysCount > 0 ? `<span class="inline-flex items-center"><i class="fas fa-calendar-alt mr-2 text-secondary"></i><strong>${schoolDaysCount}</strong>&nbsp;Aulas no Período</span>` : ""}
         `;

        let content, actions;
        if (activeTab === "attendance") {
          ({ gridHtml: content, actionsHtml: actions } = generateAttendanceGrid(
            course,
            classDates,
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
        } else if (activeTab === "assessments") {
          ({ gridHtml: content, actionsHtml: actions } = renderAssessmentsPage(
            course,
            classDates,
            termKey,
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
          ({ gridHtml: content, actionsHtml: actions } =
            renderBulletinsPage(course));
          tabContentContainer.innerHTML = content;
          actionsContainerBottom.innerHTML = actions;
        }
      };

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

          saveData();
          CustomSwal.fire(
            "Salvo!",
            "Dados de frequência salvos com sucesso.",
            "success",
          );
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
          if (courseId) openHomeworkModal(courseId);
        }
        const editHwBtn = e.target.closest(".btn-edit-homework");
        if (editHwBtn) {
          if (courseId) openHomeworkModal(courseId, editHwBtn.dataset.id);
        }
        const deleteHwBtn = e.target.closest(".btn-delete-homework");
        if (deleteHwBtn) {
          handleDelete(deleteHwBtn.dataset.id, "homeworks", {
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

                if (grade !== undefined && !isNaN(grade)) {
                  const numericGrade = parseFloat(grade);
                  sumOfGrades += numericGrade;
                  sumOfWeightedGrades += numericGrade * assessment.weight;
                  totalWeight += assessment.weight;
                  gradesEntered++;
                }
              });

              if (averageType === "ponderada") {
                calculatedAverage =
                  totalWeight > 0 ? sumOfWeightedGrades / totalWeight : 0;
              } else {
                calculatedAverage =
                  gradesEntered > 0 ? sumOfGrades / gradesEntered : 0;
              }

              state.calculatedAverages[averageKey] = calculatedAverage;
              const averageCell = row.querySelector(
                '[data-result="final-average"]',
              );
              averageCell.textContent = calculatedAverage.toFixed(2);
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

      // --- DELEGAÇÃO DE EVENTOS DO DIÁRIO (Substitua este bloco inteiro) ---
      container.addEventListener("change", (e) => {
        const value = e.target.value;

        // 1. Salvar Notas Parciais
        if (e.target.classList.contains("grade-input")) {
          const { studentId, assessmentId } = e.target.dataset;
          const gradeKey = `${studentId}_${assessmentId}`;

          if (value === "") {
            delete state.grades[gradeKey];
          } else {
            let numVal = parseFloat(value);
            if (numVal < 0) numVal = 0;
            if (numVal > 10) numVal = 10;
            state.grades[gradeKey] = numVal;
          }
          saveData();
        }

        // 2. Salvar Ajuste de Nota (Recuperação Bimestral)
        if (e.target.classList.contains("adjustment-input")) {
          const { studentId, courseId } = e.target.dataset;
          // Usa termValue do escopo da função pai (attachPageEventListeners -> diary)
          const adjustmentKey = `${studentId}_${courseId}_${termValue}`;

          if (value === "") {
            delete state.gradesAdjustments[adjustmentKey];
          } else {
            let numVal = parseFloat(value);
            if (numVal < 0) numVal = 0;
            if (numVal > 10) numVal = 10;
            state.gradesAdjustments[adjustmentKey] = numVal;
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
            let numVal = parseFloat(value);
            if (numVal < 0) numVal = 0;
            if (numVal > 10) numVal = 10;
            state.finalAdjustments[key] = numVal;
          }
          saveData();
        }

        // 4. [CORREÇÃO] Salvar Situação Final (Select: Aprovado, Retido, etc.)
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
        if (e.target.type === "number") {
          if (parseFloat(value) > 10) {
            value = "10";
            e.target.value = "10";
          }
          if (parseFloat(value) < 0) {
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
            state.grades[gradeKey] = parseFloat(value);
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
            state.gradesAdjustments[adjustmentKey] = parseFloat(value);
          }
          saveData();
        }

        if (e.target.classList.contains("council-adjustment-input")) {
          const { studentId, courseId: currentCourseId } = e.target.dataset;
          const key = `${studentId}_${currentCourseId}`;

          if (value === "") {
            delete state.finalAdjustments[key];
          } else {
            state.finalAdjustments[key] = parseFloat(value);
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

    // --- 13. REPORTS (RELATÓRIOS) ---
    if (pageId === "reports") {
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
        const students = state.students
          .filter((s) => s.classId === course.classId && s.status === "ativo")
          .sort((a, b) => a.name.localeCompare(b.name));

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
          termSelectDiv.style.display = shouldShowTerm ? "block" : "none";

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
        .querySelector("#low-freq-school-select")
        ?.addEventListener("change", (e) => {
          const schoolId = e.target.value;
          const classSelect = mainContent.querySelector(
            "#low-freq-class-select",
          );
          const termSelect = mainContent.querySelector("#low-freq-term-select");

          // Lógica para popular o seletor de turmas
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

          // Lógica para popular o seletor de períodos
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
            } else {
              termSelect.innerHTML =
                '<option value="all">Ano Letivo Completo</option>';
              termSelect.disabled = true;
            }
          }
        });

      // --- Eventos para Relatório de Notas Vermelhas ---
      mainContent
        .querySelector("#btn-generate-red-grades-report")
        ?.addEventListener("click", generateRedGradesReport);

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
          }
        });
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
    if (format === "individual" && selectedStudentIds.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Selecione pelo menos um aluno para o relatório individual.",
        "warning",
      );
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
      doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 21);
      doc.text(`Turma: ${cls.name} - Disciplina: ${subjectName}`, 14, 26);
      doc.text(`Professor(a): ${teacher?.name || "N/D"}`, 14, 31);

      // --- CONSTRUÇÃO DO CABEÇALHO DA TABELA ---

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

      // --- CONSTRUÇÃO DO CORPO DA TABELA ---
      const students = state.students
        .filter((s) => s.classId === course.classId && s.status === "ativo")
        .sort((a, b) => (a.number || 999) - (b.number || 999));

      const body = students.map((student) => {
        const row = [student.number || "-", student.name];

        terms.forEach((term, index) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          const grade = getDefinitiveGrade(student.id, course.id, termKey);
          const attendance = getTermAttendance(student, course, term);

          // CORREÇÃO: Uso de || 0 para evitar erro de undefined
          row.push(grade !== null ? grade.toFixed(1) : "--");
          row.push((attendance.absences || 0).toString());
          row.push(`${(attendance.absencePercentage || 0).toFixed(0)}%`);
          row.push((attendance.excusedAbsences || 0).toString());

          if (index < terms.length - 1) {
            row.push("");
          }
        });

        row.push("");

        const finalResult = getFinalResult(student.id, course);
        const yearlyAttendance = getYearlyAttendance(student, course);
        const finalAverage =
          finalResult.finalGrade !== null
            ? finalResult.finalGrade.toFixed(2)
            : "--";

        // CORREÇÃO: Uso de || 0
        row.push(finalAverage);
        row.push((yearlyAttendance.totalAbsences || 0).toString());
        row.push(
          `${(yearlyAttendance.yearlyAbsencePercentage || 0).toFixed(0)}%`,
        );

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
      const students = state.students.filter((s) =>
        selectedStudentIds.includes(s.id),
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
        const studentInfo = [
          [`Aluno(a): ${student.name}`, `RA: ${student.ra || "Não informado"}`],
          [`Turma: ${cls.name}`, `Componente Curricular: ${subjectName}`],
          [`Professor(a): ${teacher?.name || "Não informado"}`, ""],
        ];
        doc.autoTable({
          startY: 28,
          body: studentInfo,
          theme: "plain",
          styles: { fontSize: 10, cellPadding: 1 },
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
        const yearlyAttendance = getYearlyAttendance(student, course);

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
          // CORREÇÃO: Uso de || 0 para evitar o erro de toString em undefined
          notesRow.push(result.grade !== null ? result.grade.toFixed(1) : "--");
          absencesRow.push((result.attendance.absences || 0).toString());
          excusedRow.push((result.attendance.excusedAbsences || 0).toString());
          frequencyRow.push(
            `${(result.attendance.absencePercentage || 0).toFixed(0)}%`,
          );
        });

        // CORREÇÃO: Uso de || 0 nas variáveis anuais também
        notesRow.push(
          finalResult.finalGrade !== null
            ? finalResult.finalGrade.toFixed(2)
            : "--",
        );
        absencesRow.push((yearlyAttendance.totalAbsences || 0).toString());
        // Aqui provavelmente estava o erro (totalExcused podia ser undefined)
        excusedRow.push(
          (
            yearlyAttendance.totalExcused ||
            yearlyAttendance.totalExcusedAbsences ||
            0
          ).toString(),
        );
        frequencyRow.push(
          `${(yearlyAttendance.yearlyAbsencePercentage || 0).toFixed(0)}%`,
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
          if (state.assessments.some((a) => a.subjectId === id))
            links.push("Avaliações");
          break;
        case "class":
          if (state.students.some((s) => s.classId === id))
            links.push("Alunos");
          if (state.schedules.some((s) => s.classId === id))
            links.push("Grades Horárias");
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

  const renderReportsPage = () => {
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
<div class="space-y-8">
    <h2 class="text-2xl font-bold">Relatórios</h2>

    <div class="card p-6">
        <h3 class="text-xl font-bold mb-4 border-b pb-2 flex items-center"><i class="fas fa-book-reader mr-3 text-[var(--theme-color)]"></i>Diário de Classe e Relatórios Detalhados</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
                <label for="report-course-select" class="block font-medium mb-1">1. Turma/Disciplina</label>
                <select id="report-course-select" class="form-select w-full">
                    <option value="">-- Selecione --</option>
                    ${courseOptions}
                </select>
            </div>
            <div>
                <label for="report-term-select" class="block font-medium mb-1">2. Período</label>
                <select id="report-term-select" class="form-select w-full" disabled>
                    <option value="">-- Primeiro selecione a turma --</option>
                </select>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-6">
            <div>
                <p class="font-medium mb-2">3. Incluir seções no relatório detalhado:</p>
                <div class="space-y-2">
                    <label class="flex items-center"><input type="checkbox" id="report-include-attendance" class="form-checkbox" checked> <span class="ml-2">Frequência</span></label>
                    <label class="flex items-center"><input type="checkbox" id="report-include-content" class="form-checkbox" checked> <span class="ml-2">Conteúdo Ministrado</span></label>
                    <label class="flex items-center"><input type="checkbox" id="report-include-homework" class="form-checkbox" checked> <span class="ml-2">Atividades em sala</span></label>
                </div>
            </div>
            <div>
                <p class="font-medium mb-2">4. Opções de exibição:</p>
                <div class="space-y-2">
                    <label class="flex items-center"><input type="checkbox" id="report-active-students-only" class="form-checkbox" checked> <span class="ml-2">Apenas alunos ativos</span></label>
                    <label class="flex items-center"><input type="checkbox" id="report-school-days-only" class="form-checkbox" checked> <span class="ml-2">Apenas dias letivos</span></label>
                    <label class="flex items-center"><input type="checkbox" id="report-show-events" class="form-checkbox"> <span class="ml-2">Listar eventos do calendário</span></label>
                    <label class="flex items-center"><input type="checkbox" id="report-given-classes-only" class="form-checkbox" checked> <span class="ml-2">Apenas aulas com registro</span></label>
                </div>
            </div>
        </div>
        <div class="border-t mt-6 pt-4 flex flex-wrap justify-between items-center gap-4">
            <div>
                <p class="font-medium mb-2">Orientação</p>
                <div class="flex items-center gap-4">
                    <label class="flex items-center"><input type="radio" name="report-orientation-class" value="p" class="form-radio"> <span class="ml-2">Retrato</span></label>
                    <label class="flex items-center"><input type="radio" name="report-orientation-class" value="l" class="form-radio" checked> <span class="ml-2">Paisagem</span></label>
                </div>
            </div>
            <div class="flex flex-wrap gap-2">
                <button id="btn-generate-complete-log-report" class="btn btn-subtle"><i class="fas fa-th-list mr-2"></i>Gerar Diário Completo</button>
                <button id="btn-generate-class-report" class="btn btn-primary"><i class="fas fa-cogs mr-2"></i>Gerar Relatório Detalhado</button>
            </div>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="text-xl font-bold mb-4 border-b pb-2 flex items-center"><i class="fas fa-award mr-3 text-[var(--theme-color)]"></i>Relatórios de Notas e Médias</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
             <div>
                <label for="grades-report-course-select" class="block font-medium mb-1">1. Turma/Disciplina</label>
                <select id="grades-report-course-select" class="form-select w-full">
                    <option value="">-- Selecione --</option>
                    ${courseOptions}
                </select>
            </div>
             <div>
                <label for="grades-report-type" class="block font-medium mb-1">2. Tipo de Relatório</label>
                <select id="grades-report-type" class="form-select w-full">
                    <option value="averages">Médias por Período</option>
                    <option value="assessments">Notas das Avaliações</option>
                    <option value="bulletins">Boletins (Notas e Frequência)</option>
                </select>
            </div>
        </div>
        <div id="grades-report-filters" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
             <div>
                <label for="grades-report-term-select" class="block font-medium mb-1">3. Período</label>
                <select id="grades-report-term-select" class="form-select w-full" disabled>
                    <option value="">-- Selecione a turma --</option>
                </select>
            </div>
            <div>
                <label class="block font-medium mb-1">4. Formato</label>
                 <div class="flex items-center gap-4 pt-2">
                    <label class="flex items-center"><input type="radio" name="grades-report-format" value="coletivo" class="form-radio" checked> <span class="ml-2">Coletivo</span></label>
                    <label class="flex items-center"><input type="radio" name="grades-report-format" value="individual" class="form-radio"> <span class="ml-2">Individual</span></label>
                </div>
            </div>
        </div>
         <div id="grades-report-student-selector-container" class="mt-6 hidden">
             <label for="grades-report-student-select" class="block font-medium mb-1">5. Aluno(s)</label>
             <select id="grades-report-student-select" class="form-select w-full" multiple size="5"></select>
             <p class="text-xs text-secondary mt-1">Segure Ctrl (ou Cmd) para selecionar múltiplos alunos.</p>
        </div>
         <div class="border-t mt-6 pt-4 flex justify-end">
            <button id="btn-generate-grades-report" class="btn btn-primary"><i class="fas fa-file-invoice-dollar mr-2"></i>Gerar Relatório</button>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="text-xl font-bold mb-4 border-b pb-2 flex items-center"><i class="fas fa-exclamation-triangle mr-3 text-[var(--theme-color)]"></i>Relatório de Notas Vermelhas (Abaixo de 5,0)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
                <label for="red-grades-school-select" class="block font-medium mb-1">1. Escola</label>
                <select id="red-grades-school-select" class="form-select w-full">
                    <option value="">-- Selecione --</option>
                    ${schoolOptions}
                </select>
            </div>
            <div class="flex flex-col">
                <label for="red-grades-class-select" class="block font-medium mb-1">2. Turma(s)</label>
                <select id="red-grades-class-select" class="form-select w-full flex-grow" disabled multiple size="3">
                </select>
                <p class="text-xs text-secondary mt-1">Segure Ctrl/Cmd para selecionar várias.</p>
            </div>
            <div>
                <label for="red-grades-term-select" class="block font-medium mb-1">3. Período</label>
                <select id="red-grades-term-select" class="form-select w-full" disabled>
                    <option value="">-- Selecione a Escola --</option>
                </select>
            </div>
        </div>
        <div class="border-t mt-6 pt-4 flex justify-end">
            <button id="btn-generate-red-grades-report" class="btn btn-primary"><i class="fas fa-file-pdf mr-2"></i>Gerar Relatório de Notas Vermelhas</button>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="text-xl font-bold mb-4 border-b pb-2 flex items-center"><i class="fas fa-user-clock mr-3 text-[var(--theme-color)]"></i>Relatório de Alunos com Baixa Frequência</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
                <label for="low-freq-school-select" class="block font-medium mb-1">1. Escola</label>
                <select id="low-freq-school-select" class="form-select w-full">
                    <option value="">-- Selecione --</option>
                    ${schoolOptions}
                </select>
            </div>
            <div class="flex flex-col">
                <label for="low-freq-class-select" class="block font-medium mb-1">2. Turma(s)</label>
                <select id="low-freq-class-select" class="form-select w-full flex-grow" disabled multiple size="3">
                </select>
                <p class="text-xs text-secondary mt-1">Segure Ctrl/Cmd para selecionar várias. Deixe em branco para incluir todas.</p>
            </div>
            <div>
                <label for="low-freq-term-select" class="block font-medium mb-1">3. Período de Apuração</label>
                <select id="low-freq-term-select" class="form-select w-full" disabled>
                    <option value="all">Ano Letivo Completo</option>
                </select>
            </div>
            <div>
                <label for="low-freq-threshold" class="block font-medium mb-1">4. Frequência Mínima (%)</label>
                <input type="number" id="low-freq-threshold" class="form-input w-full" value="75" min="1" max="100">
            </div>
        </div>
        <div class="border-t mt-6 pt-4 flex justify-between items-center">
            <div>
                <p class="font-medium mb-2">Orientação</p>
                <div class="flex items-center gap-4">
                    <label class="flex items-center"><input type="radio" name="report-orientation-low-freq" value="p" class="form-radio" checked> <span class="ml-2">Retrato</span></label>
                    <label class="flex items-center"><input type="radio" name="report-orientation-low-freq" value="l" class="form-radio"> <span class="ml-2">Paisagem</span></label>
                </div>
            </div>
            <button id="btn-generate-low-freq-report" class="btn btn-primary"><i class="fas fa-file-pdf mr-2"></i>Gerar Relatório de Frequência</button>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="text-xl font-bold mb-4 border-b pb-2 flex items-center"><i class="fas fa-users mr-3 text-[var(--theme-color)]"></i>Relatório de Lista de Alunos por Turma</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
                <label for="report-classlist-select" class="block font-medium mb-1">1. Selecione a Turma</label>
                <select id="report-classlist-select" class="form-select w-full">
                    <option value="">-- Selecione --</option>
                    <option value="all">Todas as Turmas</option>
                    ${classOptions}
                </select>
            </div>
        </div>
        <div class="border-t mt-6 pt-4 flex justify-end">
            <button id="btn-generate-classlist-report" class="btn btn-primary"><i class="fas fa-file-pdf mr-2"></i>Gerar Relatório de Turmas</button>
        </div>
    </div>

    <div class="card p-6">
        <h3 class="text-xl font-bold mb-4 border-b pb-2 flex items-center"><i class="fas fa-user-md mr-3 text-[var(--theme-color)]"></i>Relatório de Alunos com Laudo</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
                 <label for="laudados-school-select" class="block font-medium mb-1">Filtro por Escola</label>
                 <select id="laudados-school-select" class="form-select w-full">
                    <option value="">Todas as Escolas</option>
                    ${schoolOptions}
                 </select>
            </div>
             <div>
                 <label for="laudados-class-select" class="block font-medium mb-1">Filtro por Turma</label>
                 <select id="laudados-class-select" class="form-select w-full" disabled>
                    <option value="">-- Primeiro selecione a escola --</option>
                 </select>
            </div>
        </div>
         <div class="border-t mt-6 pt-4 flex justify-between items-center">
            <div>
                <p class="font-medium mb-2">Orientação</p>
                <div class="flex items-center gap-4">
                    <label class="flex items-center"><input type="radio" name="report-orientation-laudados" value="p" class="form-radio"> <span class="ml-2">Retrato</span></label>
                    <label class="flex items-center"><input type="radio" name="report-orientation-laudados" value="l" class="form-radio" checked> <span class="ml-2">Paisagem</span></label>
                </div>
            </div>
            <button id="btn-generate-laudados-report" class="btn btn-primary"><i class="fas fa-user-md mr-2"></i>Gerar Relatório</button>
        </div>
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
    const activeStudentsOnly = document.getElementById(
      "report-active-students-only",
    ).checked;
    const schoolDaysOnly = document.getElementById(
      "report-school-days-only",
    ).checked;
    const showEvents = document.getElementById("report-show-events").checked;
    const givenClassesOnly = document.getElementById(
      "report-given-classes-only",
    ).checked;

    const course = getUniqueCourses().find((c) => c.id === courseId);
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

    let students = state.students.filter((s) => s.classId === course.classId);
    if (activeStudentsOnly) {
      students = students.filter((s) => s.status === "ativo");
    }
    students.sort(
      (a, b) =>
        (a.number || 999) - (b.number || 999) || a.name.localeCompare(b.name),
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

    doc.setFontSize(16);
    doc.text(`Relatório Detalhado - ${course.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 21);
    doc.text(`Professor(a): ${teacherName}`, 14, 26);

    let finalY = 35;
    let isFirstSection = true;

    const addPageIfNeeded = () => {
      if (!isFirstSection) {
        doc.addPage();
      }
      isFirstSection = false;
    };

    if (includeAttendance) {
      addPageIfNeeded();
      let sectionY = 30;
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
        let absences = 0;
        reportClassDates.forEach((d) => {
          for (let i = 0; i < d.numPeriods; i++) {
            // Obtém versão vigente da grade para a data
            const gradeVigente = getGradeHorariaVigente(d.date);
            const versaoSuffix = gradeVigente ? `_v${gradeVigente.versao}` : "";

            // Tenta buscar com versão, se não encontrar, busca sem versão (dados antigos)
            const keyWithVersion = `${course.classId}_${course.subjectId}_${d.date}_${i}${versaoSuffix}`;
            const keyOld = `${course.classId}_${course.subjectId}_${d.date}_${i}`;
            const attendanceStatus =
              state.attendance[keyWithVersion]?.[student.id] ??
              state.attendance[keyOld]?.[student.id];
            if (attendanceStatus === "absent") absences++;
          }
        });
        const frequency =
          totalClassesInPeriod > 0
            ? ((totalClassesInPeriod - absences) / totalClassesInPeriod) * 100
            : 100;
        return { student, absences, frequency };
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
    const students = state.students
      .filter((s) => s.classId === classId && s.status === "ativo")
      .sort((a, b) => (a.number || 999) - (b.number || 999));

    if (students.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Não há alunos ativos nesta turma para gerar o relatório.",
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
    const body = students.map((s) => [s.number || "-", s.name, s.ra || "-"]);

    doc.autoTable({
      startY: 35,
      head: head,
      body: body,
      theme: "striped",
      headStyles: { fillColor: themeColor },
      alternateRowStyles: { fillColor: "#dadada" },
      didDrawPage: drawFooter,
    });

    doc.save(`Lista_Alunos_${cls.name.replace(/\s/g, "_")}.pdf`);
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

    let selectedClassIds = [];
    if (options.all) {
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

    const reportData = [];
    // Adiciona o cabeçalho da planilha
    reportData.push(["Nº", "Nome do Aluno", "RA", "Status", "Turma"]);

    classesToReport.forEach((cls) => {
      const students = state.students
        .filter((s) => s.classId === cls.id)
        .sort((a, b) => (a.number || 999) - (b.number || 999));

      students.forEach((s) => {
        reportData.push([
          s.number || "",
          s.name,
          s.ra || "",
          s.status || "ativo",
          cls.name,
        ]);
      });
    });

    if (reportData.length <= 1) {
      CustomSwal.fire(
        "Atenção",
        "Não há alunos na(s) turma(s) selecionada(s) para gerar o relatório.",
        "info",
      );
      return;
    }

    // Cria a planilha a partir do array de dados
    const worksheet = XLSX.utils.aoa_to_sheet(reportData);

    // Ajusta a largura das colunas
    worksheet["!cols"] = [
      { wch: 5 }, // Nº
      { wch: 50 }, // Nome do Aluno
      { wch: 20 }, // RA
      { wch: 15 }, // Status
      { wch: 25 }, // Turma
    ];

    // Cria um novo workbook e anexa a planilha
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Alunos");

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
      doc.setFontSize(10);
      doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 21);
    }

    const head = [["Nº", "Nome", "RA", "Turma/Série"]];
    const classesToReport = state.classes
      .filter((c) => selectedClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const body = [];
    classesToReport.forEach((cls) => {
      const students = state.students
        .filter((s) => s.classId === cls.id && s.status === "ativo")
        .sort((a, b) => (a.number || 999) - (b.number || 999));

      students.forEach((s) => {
        body.push([s.number || "-", s.name, s.ra || "-", cls.name]);
      });
    });

    if (body.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Não há alunos ativos na(s) turma(s) selecionada(s).",
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

    doc.setFontSize(18);
    doc.text("Relatório de Alunos com Laudo", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Escola: ${schoolName} | Turma: ${className}`, 14, 21);
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

        if (!state.students) state.students = [];
        if (!state.homeworks) state.homeworks = [];
        if (!state.tasks) state.tasks = [];
        if (!state.notes) state.notes = [];
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
        });
      }
    } catch (error) {
      console.error(
        "LOAD (localStorage): Erro fatal ao carregar ou processar os dados.",
        error,
      );
      // Redefine para o estado inicial em caso de falha grave
      state = {
        settings: { theme: "light-default", color: "#4CAF50" },
        schools: [],
        teachers: [],
        subjects: [],
        classes: [],
        students: [],
        schedules: [],
        homeworks: [],
        tasks: [],
        notes: [],
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

    // Exibe o modal para o usuário selecionar um arquivo.
    const fileLoadedSuccessfully = await promptToLoadOrCreateFile();

    // A lógica de inicialização da interface só continua se um arquivo for carregado/criado.
    if (fileLoadedSuccessfully) {
      // Garante que as verificações de `loadData` sejam aplicadas aos dados do arquivo.
      loadData();
      applyAppearance();
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
    if (format === "individual" && selectedStudentIds.length === 0) {
      CustomSwal.fire(
        "Atenção",
        "Selecione pelo menos um aluno para o relatório individual.",
        "warning",
      );
      return;
    }

    const course = getUniqueCourses().find((c) => c.id === courseId);
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

    doc.setFontSize(16);
    doc.text("Relatório de Médias por Período", 14, 15);
    doc.setFontSize(10);
    doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 21);
    doc.text(`Turma/Disciplina: ${course.name}`, 14, 26);
    doc.text(`Professor(a): ${teacher?.name || "N/D"}`, 14, 31);

    if (format === "coletivo") {
      const students = state.students
        .filter((s) => s.classId === course.classId && s.status === "ativo")
        .sort((a, b) => (a.number || 999) - (b.number || 999));

      const head = [["Nº", "Aluno"]];
      terms.forEach((term) => head[0].push(`${term.id}º ${termTypeName}`));
      head[0].push("Média Final");
      head[0].push("Sit. Final");

      const body = students.map((student) => {
        const row = [student.number || "-", student.name];

        // Preenche as notas de cada bimestre/trimestre
        terms.forEach((term) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          const grade = getDefinitiveGrade(student.id, course.id, termKey);
          if (grade !== null) {
            row.push(grade.toFixed(2));
          } else {
            row.push("--");
          }
        });

        const finalResult = getFinalResult(student.id, course);
        const finalAverage =
          finalResult.finalGrade !== null
            ? finalResult.finalGrade.toFixed(2)
            : "--";
        row.push(finalAverage);

        // -- LÓGICA ATUALIZADA DA SITUAÇÃO FINAL --
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

      doc.autoTable({
        startY: 40,
        head,
        body,
        theme: "striped",
        headStyles: { fillColor: themeColor },
        alternateRowStyles: { fillColor: "#dadada" },
        didDrawPage: drawFooter,
        didParseCell: (data) => {
          const lastColumnIndex = head[0].length - 1;
          const finalAverageColumnIndex = lastColumnIndex - 1;

          if (data.section === "body") {
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
        },
      });
    } else {
      // Individual
      const students = state.students.filter((s) =>
        selectedStudentIds.includes(s.id),
      );
      students.forEach((student, index) => {
        if (index > 0) doc.addPage();

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(`Aluno: ${student.name}`, 14, 45);

        const head = [["Período", "Nota Final"]];

        const body = terms.map((term) => {
          const termKey = `${term.startDate}|${term.endDate}`;
          const grade = getDefinitiveGrade(student.id, course.id, termKey);
          return [
            `${term.id}º ${termTypeName}`,
            grade !== null ? grade.toFixed(2) : "--",
          ];
        });

        const finalResult = getFinalResult(student.id, course);
        const finalAverage =
          finalResult.finalGrade !== null
            ? finalResult.finalGrade.toFixed(2)
            : "--";
        body.push(["Média Final", finalAverage]);

        // -- LÓGICA ATUALIZADA DA SITUAÇÃO FINAL (INDIVIDUAL) --
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
          startY: 50,
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
        });
      });
      drawFooter({
        pageNumber: doc.internal.getNumberOfPages(),
        settings: { margin: { left: 14, right: 14 } },
      });
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
    if (format === "individual" && selectedStudentIds.length === 0) {
      CustomSwal.fire("Atenção", "Selecione pelo menos um aluno.", "warning");
      return;
    }

    const course = getUniqueCourses().find((c) => c.id === courseId);
    const termName = document.querySelector(
      "#grades-report-term-select option:checked",
    ).textContent;
    const termKey = termValue;
    const assessments = state.assessments.filter(
      (a) =>
        a.classId === course.classId &&
        a.subjectId === course.subjectId &&
        a.termKey === termKey,
    );

    const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
    const pageWidth =
      doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const drawFooter = (data) => {
      const pageHeight =
        doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerY = pageHeight - 10;
      doc.text(
        `Relatório de Notas das Avaliações - ${termName}`,
        data.settings.margin.left,
        footerY,
      );
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
    doc.text(`Relatório de Notas das Avaliações - ${termName}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Turma/Disciplina: ${course.name}`, 14, 21);

    if (format === "coletivo") {
      const students = state.students
        .filter((s) => s.classId === course.classId && s.status === "ativo")
        .sort((a, b) => (a.number || 999) - (b.number || 999));

      const head = [["Nº", "Aluno"]];
      assessments.forEach((a) => head[0].push(`${a.title} (P:${a.weight})`));
      head[0].push("Média");
      head[0].push("Sit. Final");

      const body = students.map((student) => {
        const row = [student.number || "-", student.name];
        assessments.forEach((assessment) => {
          const gradeKey = `${student.id}_${assessment.id}`;
          const grade = state.grades[gradeKey];
          row.push(grade !== undefined ? grade.toFixed(2) : "--");
        });

        const definitiveGrade = getDefinitiveGrade(
          student.id,
          course.id,
          termKey,
        );
        row.push(definitiveGrade !== null ? definitiveGrade.toFixed(2) : "--");

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

      doc.autoTable({
        startY: 30,
        head,
        body,
        theme: "striped",
        headStyles: { fillColor: themeColor },
        alternateRowStyles: { fillColor: "#dadada" },
        didDrawPage: drawFooter,
        didParseCell: (data) => {
          // Aplica cores nas colunas de notas (avaliacoes + média)
          if (
            data.section === "body" &&
            data.column.index > 1 &&
            data.column.index < head[0].length - 1
          ) {
            applyGradeStylesToPdfCell(data);
          }
          if (
            data.section === "body" &&
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
        },
      });
    } else {
      // Individual
      const students = state.students.filter((s) =>
        selectedStudentIds.includes(s.id),
      );
      students.forEach((student, index) => {
        if (index > 0) doc.addPage();

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(`Aluno: ${student.name}`, 14, 30);

        const head = [["Avaliação", "Peso", "Nota"]];
        const body = assessments.map((assessment) => {
          const gradeKey = `${student.id}_${assessment.id}`;
          const grade = state.grades[gradeKey];
          return [
            assessment.title,
            assessment.weight,
            grade !== undefined ? grade.toFixed(2) : "--",
          ];
        });

        const definitiveGrade = getDefinitiveGrade(
          student.id,
          course.id,
          termKey,
        );
        body.push([
          "Média do Período",
          "",
          definitiveGrade !== null ? definitiveGrade.toFixed(2) : "--",
        ]);

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
        body.push(["Sit. Final (Ano)", "", situacao]);

        doc.autoTable({
          startY: 35,
          head,
          body,
          theme: "grid",
          headStyles: { fillColor: themeColor },
          alternateRowStyles: { fillColor: "#dadada" },
          didParseCell: function (data) {
            if (data.row.index >= body.length - 2) {
              data.cell.styles.fontStyle = "bold";
            }

            // Aplica cores para as linhas de avaliações E para a linha de Média do Período (que é body.length - 2)
            if (
              data.section === "body" &&
              data.column.index === 2 &&
              data.row.index <= body.length - 2
            ) {
              applyGradeStylesToPdfCell(data);
            }

            if (
              data.section === "body" &&
              data.column.index === 2 &&
              data.row.index === body.length - 1
            ) {
              if (
                data.cell.text[0].startsWith("Aprov") ||
                data.cell.text[0].startsWith("Ap.")
              ) {
                data.cell.styles.textColor = "#2980b9";
              } else if (data.cell.text[0].startsWith("Reprov")) {
                data.cell.styles.textColor = "#e74c3c";
              }
            }
          },
        });
      });
      drawFooter({
        pageNumber: doc.internal.getNumberOfPages(),
        settings: { margin: { left: 14, right: 14 } },
      });
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
    const activeStudentsOnly = document.getElementById(
      "report-active-students-only",
    ).checked;
    const [termStart, termEnd] = termValue.split("|");
    const termKey = termValue;

    const course = getUniqueCourses().find((c) => c.id === courseId);
    const school = state.schools.find((s) => s.id === course.schoolId);
    const scheduleEntry = getScheduleEntryForCourse(course, termStart);
    const teacher = scheduleEntry
      ? state.teachers.find((t) => t.id === scheduleEntry.teacherId)
      : null;
    const teacherName = teacher ? teacher.name : "Professor não atribuído";

    let students = state.students.filter((s) => s.classId === course.classId);
    if (activeStudentsOnly) {
      students = students.filter((s) => s.status === "ativo");
    }
    students.sort(
      (a, b) =>
        (a.number || 999) - (b.number || 999) || a.name.localeCompare(b.name),
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

    doc.setFontSize(16);
    doc.text(`Diário Completo - ${course.name} (${termName})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Escola: ${school?.name || "Não informada"}`, 14, 21);
    doc.text(`Professor(a): ${teacherName}`, 14, 26);

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
      const row = [student.number || "-", student.name];
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
      const absencePercent =
        totalClassesInPeriod > 0 ? (absences / totalClassesInPeriod) * 100 : 0;
      row.push(
        absences.toString(),
        excusedAbsences.toString(),
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
        const row = [student.number || "-", student.name];
        assessmentsForTerm.forEach((assessment) => {
          const gradeKey = `${student.id}_${assessment.id}`;
          const grade = state.grades[gradeKey];
          row.push(grade !== undefined ? grade.toFixed(2) : "--");
        });

        const definitiveGrade = getDefinitiveGrade(
          student.id,
          course.id,
          termKey,
        );
        row.push(definitiveGrade !== null ? definitiveGrade.toFixed(2) : "--");

        let situacao = "--";
        if (definitiveGrade !== null) {
          situacao = definitiveGrade >= 5 ? "Aprov." : "Reprov.";
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
            sum += numericGrade;
            count++;
            if (numericGrade >= 5) blue++;
            else red++;
          }
        });
        const average = count > 0 ? (sum / count).toFixed(2) : "--";
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
          if (definitiveGrade >= 5) finalAvgBlue++;
          else finalAvgRed++;
        }
      });

      const finalAverageOfAverages =
        finalAvgCount > 0 ? (finalAvgSum / finalAvgCount).toFixed(2) : "--";

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
      });
    }

    doc.save(
      `Diario_Completo_${course.name.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
    );
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
        `Relatório de Notas Vermelhas - ${school.name}`,
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

    doc.setFontSize(18);
    doc.text("Relatório de Alunos com Notas Vermelhas", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Escola: ${school.name} | Período: ${termName} | Nota de Corte: < 5,0`,
      14,
      21,
    );
    doc.setTextColor(0);

    let finalY = 30;
    let foundAny = false;

    const classesToReport = state.classes
      .filter((c) => selectedClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    classesToReport.forEach((cls) => {
      const students = state.students
        .filter((s) => s.classId === cls.id && s.status === "ativo")
        .sort((a, b) => (a.number || 999) - (b.number || 999));

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

          if (grade !== null && grade < 5.0) {
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
              grade: grade.toFixed(1),
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
              rowData.push(item.number, item.name, subj.subject, subj.grade);
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
        });

        finalY = doc.autoTable.previous.finalY + 12;
      }
    });

    if (!foundAny) {
      doc.setFontSize(11);
      doc.text(
        "Nenhum aluno com nota abaixo de 5,0 encontrado nas turmas selecionadas.",
        14,
        40,
      );
    }

    doc.save(
      `Relatorio_Notas_Vermelhas_${school.name.replace(/\s/g, "_")}.pdf`,
    );
  };

  /**
   * NOVO (VERSÃO CORRIGIDA): Gera um relatório em PDF listando alunos com frequência abaixo de um limiar.
   * Lógica de cálculo de frequência aprimorada para maior precisão.
   */
  const generateLowFrequencyReport = () => {
    const { jsPDF } = window.jspdf;
    const themeColor = state.settings.color;

    const schoolId = document.getElementById("low-freq-school-select").value;
    const classSelect = document.getElementById("low-freq-class-select");
    const selectedClassIds = Array.from(classSelect.selectedOptions).map(
      (opt) => opt.value,
    );
    const termValue = document.getElementById("low-freq-term-select").value;
    const frequencyThreshold =
      parseFloat(document.getElementById("low-freq-threshold").value) || 75;
    const orientation = document.querySelector(
      'input[name="report-orientation-low-freq"]:checked',
    ).value;

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
        `Relatório de Baixa Frequência - ${school.name}`,
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

    doc.setFontSize(18);
    doc.text("Relatório de Alunos com Baixa Frequência", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Escola: ${school.name} | Período: ${termName} | Frequência Mínima: ${frequencyThreshold}%`,
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
      const students = state.students.filter(
        (s) => s.classId === cls.id && s.status === "ativo",
      );
      const coursesForClass = getUniqueCourses().filter(
        (c) => c.classId === cls.id,
      );
      if (students.length === 0 || coursesForClass.length === 0) return;

      const reportDataByStudent = [];

      students.forEach((student) => {
        const lowFreqSubjects = [];

        coursesForClass.forEach((course) => {
          let totalLessonsInPeriodForCourse = 0;
          let totalAbsencesForCourse = 0;

          termsToProcess.forEach((term) => {
            const termDates = getScheduledDatesForTerm(
              course,
              term.startDate,
              term.endDate,
            ).filter((d) => d.isSchoolDay);
            termDates.forEach((d) => {
              totalLessonsInPeriodForCourse += d.numPeriods;
              for (let i = 0; i < d.numPeriods; i++) {
                const attendanceData = getAttendanceForDate(
                  course.classId,
                  course.subjectId,
                  d.date,
                  i,
                );
                const status = attendanceData[student.id];
                if (status === "absent") {
                  totalAbsencesForCourse++;
                }
              }
            });
          });

          const frequency =
            totalLessonsInPeriodForCourse > 0
              ? ((totalLessonsInPeriodForCourse - totalAbsencesForCourse) /
                  totalLessonsInPeriodForCourse) *
                100
              : 100;

          if (frequency < frequencyThreshold) {
            lowFreqSubjects.push({
              subjectName: course.name.replace(`${cls.name} - `, ""),
              absences: totalAbsencesForCourse,
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
                  studentData.name,
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
   * AGORA TAMBÉM VERIFICA SE O DIA É LETIVO.
   */
  const getLaunchStatus = (scheduledClass, date) => {
    const dateString = date.toISOString().split("T")[0];
    const schoolCalendar = state.calendars[scheduledClass.schoolId];

    // --- INÍCIO DA MODIFICAÇÃO ---
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
    // --- FIM DA MODIFICAÇÃO ---

    // 3. Se FOR um dia letivo, executa a lógica original
    const currentTerm = getCurrentTerm(schoolCalendar, date);

    // Verifica status da Frequência (LÓGICA CORRIGIDA)
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
        // A verificação agora procura por qualquer status que NÃO SEJA 'unset'.
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
   * AGORA TAMBÉM EXIBE DIAS NÃO LETIVOS CORRETAMENTE.
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
    // MODIFICAÇÃO: Loop alterado de 7 para 6 para remover o Domingo.
    for (let i = 0; i < 6; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      weekDates.push(day);
    }

    const weekStartStr = weekDates[0].toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    // MODIFICAÇÃO: O final da semana agora é o 6º dia (índice 5).
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
              // --- INÍCIO DA MODIFICAÇÃO ---
              const {
                attendanceStatus,
                contentStatus,
                isSchoolDay,
                nonSchoolDayReason,
              } = getLaunchStatus(cls, date);

              const aulasTexto = cls.numPeriods > 1 ? "aulas" : "aula";

              // --- LÓGICA PARA ABREVIAR A DISCIPLINA ---
              let displaySubjectName = cls.subjectName;
              if (cls.subjectName.length > 10) {
                displaySubjectName = cls.subjectName
                  .split(" ")
                  .map((word) => word.substring(0, 4))
                  .join(" ");
              }
              const fullTitle = `${cls.className} - ${cls.subjectName}`;
              const displayTitle = `${cls.className} - ${displaySubjectName}`;
              // --- FIM DA LÓGICA ---

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
              // --- FIM DA MODIFICAÇÃO ---
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

/**
 * submit.js
 * 초등학교 1학년 맞춤형 AI 수학 학습 웹앱 ("쑥쑥 수학 놀이터")
 * 
 * 1. 로컬 저장소 및 학생 프로필 관리 (AppStorage)
 * 2. 화면 전환 및 내비게이션 컨트롤러
 * 3. 문제 풀이 인터랙션 & 키패드/선택지 입력 처리
 * 4. 단계별 오답 피드백 및 시각적 힌트 분기 처리
 * 5. 정답 축하 파티클/콘페티 이펙트
 * 6. 교사용 종합 학습 관리 대시보드 (진단 분석, CSV 내보내기, 샘플 데이터 로더)
 */

// ==========================================
// 1. 로컬 저장소 및 학생 데이터 관리자 (AppStorage)
// ==========================================
const AppStorage = {
  KEY_STUDENTS: 'ssuk_students_v1',
  KEY_CURRENT_ID: 'ssuk_current_student_id_v1',
  KEY_SOUND: 'ssuk_sound_enabled',

  getStudents() {
    try {
      const data = localStorage.getItem(this.KEY_STUDENTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load students:', e);
      return [];
    }
  },

  saveStudents(students) {
    try {
      localStorage.setItem(this.KEY_STUDENTS, JSON.stringify(students));
    } catch (e) {
      console.error('Failed to save students:', e);
    }
  },

  getCurrentStudentId() {
    return localStorage.getItem(this.KEY_CURRENT_ID) || null;
  },

  setCurrentStudentId(id) {
    if (id) {
      localStorage.setItem(this.KEY_CURRENT_ID, id);
    } else {
      localStorage.removeItem(this.KEY_CURRENT_ID);
    }
  },

  getStudent(id) {
    const students = this.getStudents();
    return students.find(s => s.id === id) || null;
  },

  saveStudent(student) {
    const students = this.getStudents();
    const idx = students.findIndex(s => s.id === student.id);
    if (idx >= 0) {
      students[idx] = student;
    } else {
      students.push(student);
    }
    this.saveStudents(students);
  },

  createStudent(name, isAnonymous = false) {
    const student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: isAnonymous ? '익명 꼬마 수학자' : name.trim(),
      isAnonymous,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      currentStage: 1,
      diagnosisCompleted: false,
      history: [],
      stats: {
        totalSolved: 0,
        totalCorrect: 0,
        hintUsedCount: 0
      }
    };
    this.saveStudent(student);
    this.setCurrentStudentId(student.id);
    return student;
  },

  // 교사 대시보드 즉시 확인을 위한 현실적인 초등 1학년 5명 샘플 데이터 생성기
  loadSampleStudents() {
    const sampleStudents = [
      {
        id: 'std_sample_1',
        name: '김민준',
        isAnonymous: false,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        lastActiveAt: new Date().toISOString(),
        currentStage: 3,
        diagnosisCompleted: true,
        stats: { totalSolved: 14, totalCorrect: 12, hintUsedCount: 3 },
        history: [
          { questionId: 'diag_1', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'diag_2', domain: 'make_10', isCorrect: true, usedHint: false },
          { questionId: 'diag_3', domain: 'sub_10', isCorrect: true, usedHint: false },
          { questionId: 'diag_4', domain: 'make10_add', isCorrect: false, usedHint: true },
          { questionId: 'st1_add_01', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'st1_add_02', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'st2_make10_01', domain: 'make_10', isCorrect: true, usedHint: false },
          { questionId: 'st2_make10_02', domain: 'make_10', isCorrect: true, usedHint: false },
          { questionId: 'st3_make10add_01', domain: 'make10_add', isCorrect: false, usedHint: true },
          { questionId: 'st3_make10add_02', domain: 'make10_add', isCorrect: true, usedHint: true },
          { questionId: 'st5_num_order', domain: 'num_100', isCorrect: true, usedHint: false },
          { questionId: 'st5_time_01', domain: 'shape_time', isCorrect: true, usedHint: false },
          { questionId: 'st1_sub_01', domain: 'basic_sub', isCorrect: true, usedHint: false },
          { questionId: 'st5_three_01', domain: 'three_nums', isCorrect: true, usedHint: false }
        ]
      },
      {
        id: 'std_sample_2',
        name: '이서연',
        isAnonymous: false,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        lastActiveAt: new Date().toISOString(),
        currentStage: 5,
        diagnosisCompleted: true,
        stats: { totalSolved: 18, totalCorrect: 17, hintUsedCount: 1 },
        history: [
          { questionId: 'diag_1', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'diag_2', domain: 'make_10', isCorrect: true, usedHint: false },
          { questionId: 'diag_3', domain: 'sub_10', isCorrect: true, usedHint: false },
          { questionId: 'diag_4', domain: 'make10_add', isCorrect: true, usedHint: false },
          { questionId: 'st3_make10add_01', domain: 'make10_add', isCorrect: true, usedHint: false },
          { questionId: 'st3_make10add_02', domain: 'make10_add', isCorrect: true, usedHint: false },
          { questionId: 'st3_make10add_03', domain: 'make10_add', isCorrect: true, usedHint: false },
          { questionId: 'st4_sub_01', domain: 'basic_sub', isCorrect: true, usedHint: false },
          { questionId: 'st4_sub_02', domain: 'sub_10', isCorrect: true, usedHint: false },
          { questionId: 'st4_sub_03', domain: 'basic_sub', isCorrect: true, usedHint: false },
          { questionId: 'st5_three_01', domain: 'three_nums', isCorrect: true, usedHint: false },
          { questionId: 'st5_three_02', domain: 'three_nums', isCorrect: true, usedHint: false },
          { questionId: 'st5_num_order', domain: 'num_100', isCorrect: true, usedHint: false },
          { questionId: 'st5_num_compare', domain: 'num_100', isCorrect: true, usedHint: false },
          { questionId: 'st5_shape_01', domain: 'shape_time', isCorrect: true, usedHint: false },
          { questionId: 'st5_time_01', domain: 'shape_time', isCorrect: true, usedHint: false },
          { questionId: 'gen_add_1', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'gen_sub_1', domain: 'basic_sub', isCorrect: false, usedHint: true }
        ]
      },
      {
        id: 'std_sample_3',
        name: '박도윤',
        isAnonymous: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastActiveAt: new Date().toISOString(),
        currentStage: 2,
        diagnosisCompleted: true,
        stats: { totalSolved: 10, totalCorrect: 6, hintUsedCount: 5 },
        history: [
          { questionId: 'diag_1', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'diag_2', domain: 'make_10', isCorrect: false, usedHint: true },
          { questionId: 'diag_3', domain: 'sub_10', isCorrect: false, usedHint: true },
          { questionId: 'st1_add_01', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'st1_sub_01', domain: 'basic_sub', isCorrect: false, usedHint: true },
          { questionId: 'st2_make10_01', domain: 'make_10', isCorrect: false, usedHint: true },
          { questionId: 'st2_make10_02', domain: 'make_10', isCorrect: true, usedHint: true },
          { questionId: 'st1_add_02', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'st1_sub_02', domain: 'basic_sub', isCorrect: true, usedHint: false },
          { questionId: 'st2_sub10_01', domain: 'sub_10', isCorrect: true, usedHint: false }
        ]
      },
      {
        id: 'std_sample_4',
        name: '최시우',
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        currentStage: 1,
        diagnosisCompleted: false, // 진단 미완료 (자료 부족 상태 시연용)
        stats: { totalSolved: 2, totalCorrect: 2, hintUsedCount: 0 },
        history: [
          { questionId: 'diag_1', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'diag_2', domain: 'make_10', isCorrect: true, usedHint: false }
        ]
      },
      {
        id: 'std_sample_5',
        name: '강지우',
        isAnonymous: false,
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        lastActiveAt: new Date().toISOString(),
        currentStage: 3,
        diagnosisCompleted: true,
        stats: { totalSolved: 12, totalCorrect: 10, hintUsedCount: 2 },
        history: [
          { questionId: 'diag_1', domain: 'basic_add', isCorrect: true, usedHint: false },
          { questionId: 'diag_5', domain: 'basic_sub', isCorrect: true, usedHint: false },
          { questionId: 'diag_6', domain: 'num_100', isCorrect: true, usedHint: false },
          { questionId: 'diag_7', domain: 'shape_time', isCorrect: true, usedHint: false },
          { questionId: 'st5_num_order', domain: 'num_100', isCorrect: true, usedHint: false },
          { questionId: 'st5_num_compare', domain: 'num_100', isCorrect: true, usedHint: false },
          { questionId: 'st5_shape_01', domain: 'shape_time', isCorrect: true, usedHint: false },
          { questionId: 'st5_time_01', domain: 'shape_time', isCorrect: true, usedHint: false },
          { questionId: 'st3_make10add_01', domain: 'make10_add', isCorrect: false, usedHint: true },
          { questionId: 'st2_make10_01', domain: 'make_10', isCorrect: true, usedHint: false },
          { questionId: 'st3_make10add_02', domain: 'make10_add', isCorrect: true, usedHint: false },
          { questionId: 'st1_add_01', domain: 'basic_add', isCorrect: true, usedHint: false }
        ]
      }
    ];

    this.saveStudents(sampleStudents);
    this.setCurrentStudentId(sampleStudents[0].id);
    return sampleStudents;
  }
};

// ==========================================
// 2. 학습 앱 핵심 컨트롤러 (MathApp)
// ==========================================
const MathApp = {
  currentStudent: null,
  isDiagnosisMode: false,
  diagIndex: 0,
  currentQuestion: null,
  currentInput: '',
  attemptCount: 0,
  consecutiveWrongs: 0,
  hintVisible: false,
  sessionSolvedCount: 0,
  sessionCorrectCount: 0,
  recentFeedbackType: null, // 'correct' | 'wrong1' | 'wrong2'

  init() {
    this.bindEvents();
    this.loadSoundState();
    this.refreshStartScreen();
    this.showScreen('screen-start');
  },

  // 소리 상태 설정
  loadSoundState() {
    const saved = localStorage.getItem(AppStorage.KEY_SOUND);
    const enabled = saved === null ? true : saved === 'true';
    SoundFX.enabled = enabled;
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      btn.innerHTML = enabled ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
      btn.classList.toggle('muted', !enabled);
    }
  },

  toggleSound() {
    SoundFX.enabled = !SoundFX.enabled;
    localStorage.setItem(AppStorage.KEY_SOUND, SoundFX.enabled);
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      btn.innerHTML = SoundFX.enabled ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
      btn.classList.toggle('muted', !SoundFX.enabled);
    }
    if (SoundFX.enabled) {
      SoundFX.click();
    }
  },

  // 화면 전환 도우미
  showScreen(screenId) {
    document.querySelectorAll('.app-screen').forEach(el => {
      el.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }

    // 학생 정보 바 갱신
    this.updateHeaderBadge();
  },

  updateHeaderBadge() {
    const badge = document.getElementById('header-student-badge');
    if (!badge) return;

    if (this.currentStudent) {
      badge.style.display = 'inline-flex';
      badge.innerHTML = `👤 <strong>${this.currentStudent.name}</strong> 어린이`;
    } else {
      badge.style.display = 'none';
    }
  },

  // 시작 화면 목록 갱신
  refreshStartScreen() {
    const students = AppStorage.getStudents();
    const selectEl = document.getElementById('existing-student-select');
    const resumeBtn = document.getElementById('resume-student-btn');

    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">-- 내 이름을 찾아보세요 --</option>';
    if (students.length > 0) {
      students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.stats.totalSolved}문제 완료)`;
        selectEl.appendChild(opt);
      });
      if (resumeBtn) resumeBtn.disabled = false;
    } else {
      if (resumeBtn) resumeBtn.disabled = true;
    }
  },

  // 이벤트 리스너 바인딩
  bindEvents() {
    // 1. 소리 토글
    document.getElementById('sound-toggle-btn')?.addEventListener('click', () => {
      this.toggleSound();
    });

    // 2. 교사용 모드 전환 버튼
    document.getElementById('teacher-mode-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.openTeacherDashboard();
    });

    // 3. 시작 화면: 이름 입력 후 시작
    document.getElementById('start-with-name-btn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('student-name-input');
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        alert('이름이나 예쁜 별칭을 입력해 주세요! 😊');
        nameInput?.focus();
        return;
      }
      SoundFX.click();
      this.currentStudent = AppStorage.createStudent(name, false);
      this.startLearningJourney();
    });

    // 4. 익명으로 시작하기
    document.getElementById('start-anonymous-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.currentStudent = AppStorage.createStudent('꼬마 수학자', true);
      this.startLearningJourney();
    });

    // 5. 이어서 학습하기
    document.getElementById('resume-student-btn')?.addEventListener('click', () => {
      const selectEl = document.getElementById('existing-student-select');
      const stdId = selectEl ? selectEl.value : '';
      if (!stdId) {
        alert('이어서 공부할 학생 이름을 선택해 주세요! 🎒');
        return;
      }
      SoundFX.click();
      this.currentStudent = AppStorage.getStudent(stdId);
      this.startLearningJourney();
    });

    // 6. 진단 시작 버튼
    document.getElementById('start-diagnosis-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.isDiagnosisMode = true;
      this.diagIndex = 0;
      this.sessionSolvedCount = 0;
      this.sessionCorrectCount = 0;
      this.showScreen('screen-play');
      this.loadDiagnosticQuestion();
    });

    // 7. 힌트 보기 토글 버튼
    document.getElementById('toggle-hint-btn')?.addEventListener('click', () => {
      this.toggleHint();
    });

    // 8. 숫자 키패드 (화면 터치 버튼)
    document.querySelectorAll('.numpad-key').forEach(btn => {
      btn.addEventListener('click', e => {
        const key = btn.getAttribute('data-key');
        SoundFX.keyTap();
        this.handleKeyInput(key);
      });
    });

    // 9. 물리 키보드 지원
    window.addEventListener('keydown', e => {
      const playScreen = document.getElementById('screen-play');
      if (!playScreen || !playScreen.classList.contains('active')) return;

      if (e.key >= '0' && e.key <= '9') {
        SoundFX.keyTap();
        this.handleKeyInput(e.key);
      } else if (e.key === 'Backspace') {
        SoundFX.keyTap();
        this.handleKeyInput('backspace');
      } else if (e.key === 'Enter') {
        SoundFX.click();
        this.submitAnswer();
      }
    });

    // 10. 정답 제출 버튼
    document.getElementById('submit-answer-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.submitAnswer();
    });

    // 11. 피드백 모달 버튼들
    document.getElementById('feedback-next-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.closeFeedbackModal();
      this.proceedNext();
    });

    document.getElementById('feedback-retry-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.closeFeedbackModal();
      this.retryCurrentQuestion();
    });

    document.getElementById('feedback-easier-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.closeFeedbackModal();
      this.loadEasierQuestion();
    });

    // 12. 결과 화면 버튼들
    document.getElementById('finish-to-home-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.refreshStartScreen();
      this.showScreen('screen-start');
    });

    document.getElementById('restart-practice-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.sessionSolvedCount = 0;
      this.sessionCorrectCount = 0;
      this.isDiagnosisMode = false;
      this.showScreen('screen-play');
      this.loadNextAdaptiveQuestion();
    });

    // 13. 학습 도중 그만두기/결과 보기 버튼
    document.getElementById('quit-session-btn')?.addEventListener('click', () => {
      if (confirm('오늘의 학습을 마치고 결과 화면으로 가볼까요? 🌟')) {
        SoundFX.click();
        this.showResultScreen();
      }
    });

    // 14. 교사 대시보드 버튼들
    document.getElementById('exit-teacher-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.refreshStartScreen();
      this.showScreen('screen-start');
    });

    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      SoundFX.click();
      this.exportCSV();
    });

    document.getElementById('load-sample-btn')?.addEventListener('click', () => {
      if (confirm('체험용 샘플 학생 5명 데이터를 생성할까요? (교사용 대시보드 기능을 바로 볼 수 있습니다)')) {
        SoundFX.fanfare();
        AppStorage.loadSampleStudents();
        alert('샘플 학생 5명 데이터가 로드되었습니다! 🎉');
        this.renderTeacherDashboard();
      }
    });

    document.getElementById('reset-all-btn')?.addEventListener('click', () => {
      if (confirm('모든 학생의 학습 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        localStorage.removeItem(AppStorage.KEY_STUDENTS);
        localStorage.removeItem(AppStorage.KEY_CURRENT_ID);
        this.currentStudent = null;
        alert('학습 기록이 깨끗하게 초기화되었습니다.');
        this.renderTeacherDashboard();
      }
    });

    // 모달 닫기
    document.getElementById('student-detail-close-btn')?.addEventListener('click', () => {
      document.getElementById('student-detail-modal')?.classList.remove('active');
    });
  },

  // 학습 여정 시작 분기
  startLearningJourney() {
    if (!this.currentStudent) return;

    this.sessionSolvedCount = 0;
    this.sessionCorrectCount = 0;

    // 만약 학생의 진단 기록이 없으면 -> 기초 진단 먼저 친근하게 제안
    if (!this.currentStudent.diagnosisCompleted && (!this.currentStudent.history || this.currentStudent.history.length === 0)) {
      document.getElementById('diag-student-name').textContent = this.currentStudent.name;
      this.showScreen('screen-diagnosis-intro');
    } else {
      // 이미 진단받았거나 학습 기록이 있으면 맞춤형 문제 풀이로 직행
      this.isDiagnosisMode = false;
      this.showScreen('screen-play');
      this.loadNextAdaptiveQuestion();
    }
  },

  // 진단 문제 불러오기
  loadDiagnosticQuestion() {
    if (this.diagIndex >= DIAGNOSIS_QUESTIONS.length) {
      // 진단 완료
      this.finishDiagnosis();
      return;
    }

    const q = DIAGNOSIS_QUESTIONS[this.diagIndex];
    this.currentQuestion = q;
    this.attemptCount = 0;
    this.consecutiveWrongs = 0;
    this.currentInput = '';
    this.hintVisible = false;

    this.renderQuestionUI(`기초 진단 ${this.diagIndex + 1} / ${DIAGNOSIS_QUESTIONS.length}`);
  },

  // 진단 완료 처리
  finishDiagnosis() {
    this.currentStudent.diagnosisCompleted = true;
    // 초기 단계 배정 (정답 수 기반 부드러운 시작)
    const diagCorrect = this.currentStudent.history.filter(h => h.isCorrect).length;
    let initialStage = 1;
    if (diagCorrect >= 6) initialStage = 3;
    else if (diagCorrect >= 4) initialStage = 2;
    else initialStage = 1;

    this.currentStudent.currentStage = initialStage;
    AppStorage.saveStudent(this.currentStudent);

    SoundFX.fanfare();
    alert(`짝짝짝! 훌륭하게 진단을 마쳤어요! 🌸\n나에게 꼬옥 맞는 ${initialStage}단계 맞춤 문제를 시작해 볼까요?`);
    
    this.isDiagnosisMode = false;
    this.loadNextAdaptiveQuestion();
  },

  // 맞춤형 문제 로드
  loadNextAdaptiveQuestion() {
    this.currentQuestion = AdaptiveEngine.pickNextQuestion(this.currentStudent);
    this.attemptCount = 0;
    this.consecutiveWrongs = 0;
    this.currentInput = '';
    this.hintVisible = false;

    const domainInfo = CURRICULUM_DOMAINS[this.currentQuestion.domain] || { name: '수학 문제', icon: '✏️' };
    this.renderQuestionUI(`맞춤 학습: ${domainInfo.icon} ${domainInfo.name}`);
  },

  // 더 쉬운 유사 문제 로드 (반복 오답 시)
  loadEasierQuestion() {
    this.consecutiveWrongs = 0;
    this.attemptCount = 0;
    this.currentInput = '';
    this.hintVisible = false;

    // 1단계의 시각적 기본 덧셈/뺄셈 또는 10 만들기 문제로 완화
    if (this.currentQuestion.domain === 'make10_add') {
      this.currentQuestion = QuestionGenerator.generate('make_10', 2);
    } else {
      this.currentQuestion = QuestionGenerator.generate(this.currentQuestion.domain, 1);
    }

    this.renderQuestionUI(`친절한 그림 퀴즈 🎈`);
  },

  // 현재 문제 재도전
  retryCurrentQuestion() {
    this.currentInput = '';
    this.updateInputDisplay();
    // 힌트 영역 자동 활성화하여 아이가 도움을 보며 풀 수 있게 함
    this.showHintSection();
  },

  // 화면에 문제 렌더링
  renderQuestionUI(stageLabel) {
    const q = this.currentQuestion;
    if (!q) return;

    // 상단 라벨 및 카운터
    document.getElementById('play-stage-badge').textContent = stageLabel;
    document.getElementById('play-session-count').textContent = `오늘 해결: ${this.sessionSolvedCount}문제`;

    // 문제 질문 및 수식
    document.getElementById('question-text').textContent = q.questionText;
    document.getElementById('question-formula').textContent = q.formula || '';

    // 시각 자료 렌더링
    const visualBox = document.getElementById('question-visual-box');
    visualBox.innerHTML = this.buildVisualHTML(q);

    // 힌트 내용 세팅 (초기에는 숨김)
    const hintBox = document.getElementById('hint-content-box');
    hintBox.innerHTML = `
      <div class="hint-main-text">💡 <strong>힌트:</strong> ${q.hint || '그림을 보며 하나씩 세어보세요.'}</div>
      ${q.steps && q.steps.length > 0 ? `
        <div class="hint-steps-list">
          ${q.steps.map((st, idx) => `<div class="step-item"><span class="step-num">${idx + 1}</span> ${st}</div>`).join('')}
        </div>
      ` : ''}
    `;
    this.hideHintSection();

    // 입력 인터페이스 세팅 (키패드 vs 객관식 선택지)
    const numpadWrap = document.getElementById('numpad-container');
    const choicesWrap = document.getElementById('choice-container');

    if (q.inputType === 'choice' && q.options && q.options.length > 0) {
      numpadWrap.style.display = 'none';
      choicesWrap.style.display = 'grid';
      choicesWrap.innerHTML = q.options.map(opt => `
        <button class="choice-card-btn" data-val="${opt}">
          <span class="choice-radio">⚪</span>
          <span class="choice-text">${opt}</span>
        </button>
      `).join('');

      choicesWrap.querySelectorAll('.choice-card-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          SoundFX.click();
          choicesWrap.querySelectorAll('.choice-card-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.currentInput = btn.getAttribute('data-val');
          this.updateInputDisplay();
        });
      });
    } else {
      choicesWrap.style.display = 'none';
      numpadWrap.style.display = 'flex';
    }

    this.updateInputDisplay();
  },

  // 시각 자료 생성 분기
  buildVisualHTML(q) {
    if (!q.visualType || !q.visualData) {
      return '';
    }

    switch (q.visualType) {
      case 'tenframe':
        return VisualRenderer.renderTenFrame(
          q.visualData.n1,
          q.visualData.n2 || 0,
          q.visualData.mode || 'single'
        );

      case 'items':
        return VisualRenderer.renderItems(
          q.visualData.count,
          q.visualData.icon || '🍎',
          q.visualData.crossedCount || 0
        );

      case 'bundles':
        return VisualRenderer.renderTenBundles(
          q.visualData.tens,
          q.visualData.ones
        );

      case 'clock':
        return VisualRenderer.renderClockSVG(
          q.visualData.hour,
          q.visualData.minute || 0
        );

      case 'shape':
        return VisualRenderer.renderShapeSVG(
          q.visualData.shape,
          q.visualData.color || '#4299E1'
        );

      case 'numberline':
        return VisualRenderer.renderNumberLine(
          q.visualData.start,
          q.visualData.end,
          q.visualData.current,
          q.visualData.jump
        );

      default:
        return '';
    }
  },

  // 숫자 키패드 핸들러
  handleKeyInput(key) {
    if (key === 'clear') {
      this.currentInput = '';
    } else if (key === 'backspace') {
      this.currentInput = this.currentInput.toString().slice(0, -1);
    } else {
      // 초1 수학 답은 보통 두 자리 수 이하
      if (this.currentInput.length < 3) {
        this.currentInput += key;
      }
    }
    this.updateInputDisplay();
  },

  updateInputDisplay() {
    const displayEl = document.getElementById('answer-display-text');
    if (displayEl) {
      if (this.currentInput === '') {
        displayEl.textContent = '?';
        displayEl.classList.add('placeholder');
      } else {
        displayEl.textContent = this.currentInput;
        displayEl.classList.remove('placeholder');
      }
    }
  },

  // 힌트 토글
  toggleHint() {
    SoundFX.hint();
    if (this.hintVisible) {
      this.hideHintSection();
    } else {
      this.showHintSection();
    }
  },

  showHintSection() {
    this.hintVisible = true;
    document.getElementById('hint-content-box')?.classList.add('active');
    const toggleBtn = document.getElementById('toggle-hint-btn');
    if (toggleBtn) toggleBtn.innerHTML = '💡 힌트 접기 🔼';
    if (this.currentStudent) {
      this.currentStudent.stats.hintUsedCount++;
    }
  },

  hideHintSection() {
    this.hintVisible = false;
    document.getElementById('hint-content-box')?.classList.remove('active');
    const toggleBtn = document.getElementById('toggle-hint-btn');
    if (toggleBtn) toggleBtn.innerHTML = '💡 그림과 힌트 보기 🔽';
  },

  // 답안 제출 및 판정
  submitAnswer() {
    if (this.currentInput === '' || this.currentInput === null) {
      alert('답을 먼저 입력해 보세요! ✏️');
      return;
    }

    this.attemptCount++;
    const q = this.currentQuestion;
    const studentAns = this.currentInput.toString().trim();
    const correctAns = q.answer.toString().trim();

    const isCorrect = studentAns === correctAns;

    // 학습 기록 남기기
    const record = {
      questionId: q.id,
      domain: q.domain,
      stage: q.stage || 1,
      formula: q.formula,
      correctAnswer: correctAns,
      studentAnswer: studentAns,
      isCorrect,
      usedHint: this.hintVisible,
      attemptCount: this.attemptCount,
      timestamp: new Date().toISOString()
    };

    if (!this.currentStudent.history) {
      this.currentStudent.history = [];
    }
    this.currentStudent.history.push(record);
    this.currentStudent.stats.totalSolved++;
    if (isCorrect) {
      this.currentStudent.stats.totalCorrect++;
    }
    this.currentStudent.lastActiveAt = new Date().toISOString();
    AppStorage.saveStudent(this.currentStudent);

    if (isCorrect) {
      // 정답인 경우
      this.sessionSolvedCount++;
      this.sessionCorrectCount++;
      this.consecutiveWrongs = 0;
      SoundFX.correct();
      this.triggerConfetti();
      this.showCorrectFeedback(q);
    } else {
      // 오답인 경우
      this.consecutiveWrongs++;
      SoundFX.gentleWrong();
      if (this.attemptCount === 1) {
        // 첫 번째 오답: 즉시 정답 공개 X, 힌트와 재도전 기회
        this.showWrongFeedbackStep1(q);
      } else {
        // 2회 이상 오답: 풀이 전체 시각화 및 유사/쉬운 문제 추천
        this.sessionSolvedCount++;
        this.showWrongFeedbackStep2(q);
      }
    }
  },

  // 정답 피드백 팝업
  showCorrectFeedback(q) {
    this.recentFeedbackType = 'correct';
    const modal = document.getElementById('feedback-modal');
    const titleEl = document.getElementById('feedback-modal-title');
    const msgEl = document.getElementById('feedback-modal-msg');
    const visualEl = document.getElementById('feedback-modal-visual');
    const btnNext = document.getElementById('feedback-next-btn');
    const btnRetry = document.getElementById('feedback-retry-btn');
    const btnEasier = document.getElementById('feedback-easier-btn');

    // 1학년 맞춤형 칭찬 문구
    const praiseList = [
      '정답이야! 참 잘했어! 🌟',
      '와! 수의 관계를 쏙쏙 찾아냈구나! 👏',
      '10을 척척 완성했네! 대단해! 💯',
      '한 걸음 더 쑥쑥 자랐어요! 🎈'
    ];
    const praise = praiseList[Math.floor(Math.random() * praiseList.length)];

    titleEl.textContent = '🎉 와아! 정답이에요!';
    titleEl.className = 'feedback-title correct';
    msgEl.innerHTML = `
      <div class="feedback-praise">${praise}</div>
      <div class="feedback-formula-ans"><strong>${q.formula}</strong> ➡️ 답: <span class="highlight-ans">${q.answer}</span></div>
    `;

    // 10을 만들어 더하기였다면 원리 강조
    if (q.domain === 'make10_add') {
      visualEl.innerHTML = `
        <div class="feedback-explanation-card">
          <div class="exp-title">🌟 10 채우기 비밀:</div>
          <div class="exp-body">10을 먼저 채우고 남은 수를 더하면 큰 수도 쉽게 계산할 수 있어요!</div>
        </div>
      `;
    } else {
      visualEl.innerHTML = '';
    }

    btnNext.style.display = 'inline-flex';
    btnRetry.style.display = 'none';
    btnEasier.style.display = 'none';

    modal.classList.add('active');
  },

  // 1차 오답 피드백
  showWrongFeedbackStep1(q) {
    this.recentFeedbackType = 'wrong1';
    const modal = document.getElementById('feedback-modal');
    const titleEl = document.getElementById('feedback-modal-title');
    const msgEl = document.getElementById('feedback-modal-msg');
    const visualEl = document.getElementById('feedback-modal-visual');
    const btnNext = document.getElementById('feedback-next-btn');
    const btnRetry = document.getElementById('feedback-retry-btn');
    const btnEasier = document.getElementById('feedback-easier-btn');

    titleEl.textContent = '🌱 아쉬워요! 다시 해볼 수 있어요!';
    titleEl.className = 'feedback-title wrong';

    let gentleHint = q.hint || '그림을 천천히 세어보세요.';
    if (q.domain === 'make10_add') {
      gentleHint = '먼저 10칸 상자를 꽉 채우려면 몇 개가 더 필요한지 생각해 봐요!';
    } else if (q.domain === 'make_10') {
      gentleHint = '10이 되기 위해 비어있는 칸의 개수를 세어보세요.';
    }

    msgEl.innerHTML = `
      <div class="feedback-encourage">괜찮아요. 차근차근 그림을 보면서 다시 한번 풀어볼까요? 😊</div>
      <div class="feedback-hint-tip">💡 <strong>도움말:</strong> ${gentleHint}</div>
    `;

    visualEl.innerHTML = this.buildVisualHTML(q);

    btnNext.style.display = 'none';
    btnRetry.style.display = 'inline-flex';
    btnEasier.style.display = 'none';

    modal.classList.add('active');
  },

  // 2차 이상 오답 피드백 (풀이 공개)
  showWrongFeedbackStep2(q) {
    this.recentFeedbackType = 'wrong2';
    const modal = document.getElementById('feedback-modal');
    const titleEl = document.getElementById('feedback-modal-title');
    const msgEl = document.getElementById('feedback-modal-msg');
    const visualEl = document.getElementById('feedback-modal-visual');
    const btnNext = document.getElementById('feedback-next-btn');
    const btnRetry = document.getElementById('feedback-retry-btn');
    const btnEasier = document.getElementById('feedback-easier-btn');

    titleEl.textContent = '📖 함께 풀이 과정을 보아요!';
    titleEl.className = 'feedback-title guide';

    let stepsHtml = '';
    if (q.steps && q.steps.length > 0) {
      stepsHtml = `
        <div class="feedback-steps-box">
          <div class="box-title">🌈 이렇게 생각하면 쉬워요:</div>
          ${q.steps.map((st, i) => `<div class="f-step"><span class="f-num">${i + 1}</span> ${st}</div>`).join('')}
        </div>
      `;
    }

    msgEl.innerHTML = `
      <div class="feedback-encourage">정답은 <strong class="highlight-ans">${q.answer}</strong>이었어요! 괜찮아요, 실수를 통해 우리는 더 똑똑해져요. 👍</div>
      ${stepsHtml}
    `;

    visualEl.innerHTML = this.buildVisualHTML(q);

    btnNext.style.display = 'inline-flex';
    btnNext.textContent = '다음 문제로 가기 ➡️';
    btnRetry.style.display = 'none';
    btnEasier.style.display = 'inline-flex';
    btnEasier.textContent = '더 쉬운 그림 퀴즈 풀기 🎈';

    modal.classList.add('active');
  },

  closeFeedbackModal() {
    document.getElementById('feedback-modal')?.classList.remove('active');
  },

  // 다음 문제 진행
  proceedNext() {
    if (this.isDiagnosisMode) {
      this.diagIndex++;
      this.loadDiagnosticQuestion();
    } else {
      this.loadNextAdaptiveQuestion();
    }
  },

  // 학습 결과 화면 표시
  showResultScreen() {
    SoundFX.fanfare();
    this.triggerConfetti();

    const student = this.currentStudent;
    const stats = AdaptiveEngine.evaluateDomains(student);

    document.getElementById('result-student-name').textContent = student.name;
    document.getElementById('result-total-count').textContent = `${this.sessionSolvedCount}문제`;
    document.getElementById('result-correct-count').textContent = `${this.sessionCorrectCount}문제`;

    // 잘 해결한 영역 (숙달 완료 또는 익숙해지는 중)
    const strongDomains = Object.values(stats).filter(
      s => s.status === 'mastered' || s.status === 'improving'
    );
    const strongListEl = document.getElementById('result-strong-domains');
    if (strongDomains.length > 0) {
      strongListEl.innerHTML = strongDomains.map(d => {
        const info = CURRICULUM_DOMAINS[d.domainId];
        return `<span class="domain-tag strong">${info.icon} ${info.name}</span>`;
      }).join('');
    } else {
      strongListEl.innerHTML = '<span class="empty-badge">앞으로 더 멋지게 자라날 거예요! 🌱</span>';
    }

    // 더 연습하면 좋을 영역 (연습 중)
    const needPracticeDomains = Object.values(stats).filter(s => s.status === 'practicing');
    const needListEl = document.getElementById('result-practice-domains');
    if (needPracticeDomains.length > 0) {
      needListEl.innerHTML = needPracticeDomains.map(d => {
        const info = CURRICULUM_DOMAINS[d.domainId];
        return `<span class="domain-tag practice">${info.icon} ${info.name}</span>`;
      }).join('');
    } else {
      needListEl.innerHTML = '<span class="empty-badge">모든 영역을 아주 잘하고 있어요! 🌟</span>';
    }

    this.showScreen('screen-result');
  },

  // ==========================================
  // 교사용 대시보드 로직
  // ==========================================
  openTeacherDashboard() {
    this.showScreen('screen-teacher');
    this.renderTeacherDashboard();
  },

  renderTeacherDashboard() {
    const students = AppStorage.getStudents();

    // 1. 학급 요약 지표
    let totalSolvedAll = 0;
    let totalCorrectAll = 0;
    students.forEach(s => {
      totalSolvedAll += (s.stats.totalSolved || 0);
      totalCorrectAll += (s.stats.totalCorrect || 0);
    });

    const avgAccuracy = totalSolvedAll > 0 ? Math.round((totalCorrectAll / totalSolvedAll) * 100) : 0;

    document.getElementById('teacher-student-count').textContent = `${students.length}명`;
    document.getElementById('teacher-total-solved').textContent = `${totalSolvedAll}문제`;
    document.getElementById('teacher-avg-accuracy').textContent = `${avgAccuracy}%`;

    // 2. 학생별 테이블 렌더링
    const tbody = document.getElementById('teacher-students-tbody');
    if (!tbody) return;

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="empty-table-cell">
            등록된 학생 데이터가 없습니다. 우측 상단의 <strong>[🧪 테스트용 샘플 학생 5명 데이터 불러오기]</strong> 버튼을 눌러보세요!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = students.map((std, idx) => {
      const stats = AdaptiveEngine.evaluateDomains(std);
      const acc = std.stats.totalSolved > 0 ? Math.round((std.stats.totalCorrect / std.stats.totalSolved) * 100) : 0;

      // 8대 도메인 뱃지 렌더링
      const domainBadgesHtml = Object.keys(CURRICULUM_DOMAINS).map(dId => {
        const dStat = stats[dId];
        return `
          <td class="domain-col text-center">
            <span class="status-badge ${dStat.status}" title="${dStat.label} (정답률 ${dStat.accuracy}%)">
              ${this.getStatusShortBadge(dStat.status)}
            </span>
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td class="text-center font-bold">${idx + 1}</td>
          <td>
            <a href="#" class="student-name-link" data-id="${std.id}">
              <strong>${std.name}</strong> ${std.isAnonymous ? '<small class="anon-label">(익명)</small>' : ''}
            </a>
          </td>
          <td class="text-center">${std.stats.totalSolved}</td>
          <td class="text-center font-bold ${acc < 60 ? 'text-red' : 'text-blue'}">${acc}%</td>
          <td class="text-center">${std.stats.hintUsedCount || 0}회</td>
          ${domainBadgesHtml}
          <td class="text-center">
            <button class="btn-action-view" data-id="${std.id}">상세 분석</button>
          </td>
        </tr>
      `;
    }).join('');

    // 학생 이름 및 상세 버튼 클릭 이벤트 바인딩
    tbody.querySelectorAll('.student-name-link, .btn-action-view').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        SoundFX.click();
        const stdId = btn.getAttribute('data-id');
        this.openStudentDetailModal(stdId);
      });
    });
  },

  getStatusShortBadge(status) {
    switch (status) {
      case 'mastered': return '✨ 숙달';
      case 'improving': return '🌱 보통';
      case 'practicing': return '💡 보충';
      default: return '❓ 미확인';
    }
  },

  // 학생별 개별 지도 분석 모달 열기
  openStudentDetailModal(studentId) {
    const student = AppStorage.getStudent(studentId);
    if (!student) return;

    const modal = document.getElementById('student-detail-modal');
    const domainStats = AdaptiveEngine.evaluateDomains(student);

    document.getElementById('modal-std-name').textContent = `${student.name} 학생 학습 정밀 진단`;

    // 8대 영역 성취도 카드 목록
    const gridEl = document.getElementById('modal-domain-grid');
    gridEl.innerHTML = Object.keys(CURRICULUM_DOMAINS).map(dId => {
      const info = CURRICULUM_DOMAINS[dId];
      const stat = domainStats[dId];
      return `
        <div class="detail-domain-card status-${stat.status}">
          <div class="card-header">
            <span class="domain-icon">${info.icon}</span>
            <span class="domain-title">${info.name}</span>
            <span class="domain-badge ${stat.status}">${stat.label}</span>
          </div>
          <div class="card-metrics">
            <span>푼 문제: <strong>${stat.total}</strong>개</span>
            <span>정답률: <strong>${stat.accuracy}%</strong></span>
            <span>힌트 사용: <strong>${stat.hintUsed}</strong>회</span>
          </div>
        </div>
      `;
    }).join('');

    // 취약점 및 교사 지도 조언 팁 생성
    const adviceEl = document.getElementById('modal-teacher-advice');
    const weakDomains = Object.values(domainStats).filter(s => s.status === 'practicing');
    
    if (weakDomains.length > 0) {
      let adviceHtml = `<div class="advice-box warning">`;
      adviceHtml += `<h4>📌 중점 지도 및 처방 제안:</h4><ul>`;
      weakDomains.forEach(w => {
        const info = CURRICULUM_DOMAINS[w.domainId];
        if (w.domainId === 'make10_add') {
          adviceHtml += `<li><strong>10을 만들어 더하기:</strong> 8+5에서 5를 2와 3으로 가르는 과정에 어려움이 있습니다. 실물 바둑돌 10칸 수 모형으로 10을 먼저 채우는 구체물 조작 학습을 권장합니다.</li>`;
        } else if (w.domainId === 'make_10') {
          adviceHtml += `<li><strong>10 만들기:</strong> 10이 되는 두 수(보수 관계: 7과 3, 6과 4 등) 노래나 손가락 놀이를 통해 직관적인 수 감각을 다져주세요.</li>`;
        } else if (w.domainId === 'sub_10') {
          adviceHtml += `<li><strong>10에서 빼기:</strong> 10개에서 덜어내는 뺄셈 그림 자료를 활용하여 10의 보수와 연결해 지도해 주세요.</li>`;
        } else {
          adviceHtml += `<li><strong>${info.name}:</strong> ${info.desc} 관련 추가 반복 학습이 필요합니다.</li>`;
        }
      });
      adviceHtml += `</ul></div>`;
      adviceEl.innerHTML = adviceHtml;
    } else {
      adviceEl.innerHTML = `
        <div class="advice-box success">
          <h4>🌟 균형 잡힌 우수한 성취도!</h4>
          <p>현재까지 학습한 단원에서 안정적인 계산력과 개념 이해를 보여주고 있습니다. 다음 단계 응용 문제로 자연스럽게 확장을 유도해 주세요.</p>
        </div>
      `;
    }

    // 최근 푼 10문제 내역 테이블
    const historyTbody = document.getElementById('modal-history-tbody');
    const recentHistory = (student.history || []).slice(-10).reverse();

    if (recentHistory.length === 0) {
      historyTbody.innerHTML = '<tr><td colspan="5" class="text-center">아직 푼 문제가 없습니다.</td></tr>';
    } else {
      historyTbody.innerHTML = recentHistory.map(h => {
        const dom = CURRICULUM_DOMAINS[h.domain] || { name: h.domain };
        return `
          <tr>
            <td>${dom.name}</td>
            <td><strong>${h.formula || '-'}</strong></td>
            <td class="text-center">${h.studentAnswer}</td>
            <td class="text-center font-bold ${h.isCorrect ? 'text-green' : 'text-red'}">
              ${h.isCorrect ? '⭕ 정답' : '❌ 오답'}
            </td>
            <td class="text-center">${h.usedHint ? '💡 사용' : '-'}</td>
          </tr>
        `;
      }).join('');
    }

    modal.classList.add('active');
  },

  // CSV 내보내기 (한글 엑셀 호환 UTF-8 with BOM)
  exportCSV() {
    const students = AppStorage.getStudents();
    if (students.length === 0) {
      alert('내보낼 학생 데이터가 없습니다.');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM
    // 헤더 행
    const headers = [
      '번호', '학생이름', '총풀이수', '정답수', '전체정답률(%)', '힌트사용수',
      '기본덧셈', '기본뺄셈', '10만들기', '10만들어더하기', '10에서빼기', '세수계산', '100까지의수', '모양과시각', '최근학습일시'
    ];
    csvContent += headers.join(',') + '\r\n';

    students.forEach((s, idx) => {
      const stats = AdaptiveEngine.evaluateDomains(s);
      const acc = s.stats.totalSolved > 0 ? Math.round((s.stats.totalCorrect / s.stats.totalSolved) * 100) : 0;

      const row = [
        idx + 1,
        `"${s.name}"`,
        s.stats.totalSolved,
        s.stats.totalCorrect,
        acc,
        s.stats.hintUsedCount || 0,
        `"${stats.basic_add.label}"`,
        `"${stats.basic_sub.label}"`,
        `"${stats.make_10.label}"`,
        `"${stats.make10_add.label}"`,
        `"${stats.sub_10.label}"`,
        `"${stats.three_nums.label}"`,
        `"${stats.num_100.label}"`,
        `"${stats.shape_time.label}"`,
        `"${s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString('ko-KR') : '-'}"`
      ];
      csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `초등1학년_수학_학습진단결과_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // 축하 콘페티 파티클
  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FF6B6B', '#4DABF7', '#FFD43B', '#69DB7C', '#DA77F2', '#FFA94D'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.8) * 14,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frames = 0;
    function anim() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // 중력
        p.rotation += p.vr;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      frames++;
      if (alive && frames < 80) {
        requestAnimationFrame(anim);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(anim);
  }
};

// DOM 로드 완료 시 초기화
window.addEventListener('DOMContentLoaded', () => {
  MathApp.init();
});

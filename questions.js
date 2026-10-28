/**
 * questions.js
 * 초등학교 1학년 맞춤형 AI 수학 학습 웹앱 ("쑥쑥 수학 놀이터")
 * 
 * 1. Web Audio API 기반 효과음 모듈 (SoundFX)
 * 2. 2022 개정 초등 1학년 2학기 수학 교육과정 도메인 정의
 * 3. 1학년 맞춤형 인터랙티브 시각 자료 렌더러 (VisualRenderer)
 *    - 10칸 수 모형 (Ten-frame) 분해/결합 시각화
 *    - 바둑돌/사과/별/손가락 일러스트레이션
 *    - 시계 (아날로그 시계 SVG - 몇 시, 몇 시 30분)
 *    - 동그라미/세모/네모 모양 분류
 *    - 수직선 및 10개 묶음/낱개 모형
 * 4. 수준 진단 평가 문항 (Diagnosis Pool)
 * 5. 정선된 단원별/단계별 문항 데이터베이스 (Question Bank)
 * 6. 규칙 기반 무작위 문항 생성기 (Question Generator - 범위 검증 보장)
 * 7. 적응형 학습 진단 및 추천 엔진 (AdaptiveEngine)
 */

// ==========================================
// 1. 친근한 사운드 효과 모듈 (SoundFX)
// ==========================================
const SoundFX = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },

  playTone(freq, type = 'sine', duration = 0.1, delay = 0, startVol = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(startVol, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  },

  // 버튼 클릭음 (가벼운 퐁 소리)
  click() {
    this.playTone(520, 'triangle', 0.06, 0, 0.1);
  },

  // 숫자 키패드 누를 때
  keyTap() {
    this.playTone(680, 'sine', 0.04, 0, 0.08);
  },

  // 힌트 열람음 (딩동)
  hint() {
    this.playTone(587.33, 'sine', 0.12, 0, 0.12);     // D5
    this.playTone(880.00, 'sine', 0.25, 0.1, 0.12);    // A5
  },

  // 정답 팡파레 (따라라란~ 따란!)
  correct() {
    const notes = [
      { f: 523.25, d: 0.1, t: 0 },       // C5
      { f: 659.25, d: 0.1, t: 0.09 },    // E5
      { f: 783.99, d: 0.1, t: 0.18 },    // G5
      { f: 1046.50, d: 0.35, t: 0.27 }   // C6
    ];
    notes.forEach(n => {
      this.playTone(n.f, 'triangle', n.d, n.t, 0.18);
    });
  },

  // 오답 격려음 (부드러운 또옹 소리, 위협적이지 않음)
  gentleWrong() {
    this.playTone(392.00, 'sine', 0.15, 0, 0.12);    // G4
    this.playTone(329.63, 'sine', 0.25, 0.12, 0.12);  // E4
  },

  // 학습 완료 축하음
  fanfare() {
    const chords = [
      { f: 523.25, t: 0 }, { f: 659.25, t: 0.08 }, { f: 783.99, t: 0.16 },
      { f: 1046.50, t: 0.26 }, { f: 880, t: 0.38 }, { f: 1046.50, t: 0.50 }
    ];
    chords.forEach(c => {
      this.playTone(c.f, 'triangle', 0.2, c.t, 0.2);
    });
  }
};

// ==========================================
// 2. 초등 1학년 8대 핵심 학습 도메인 정의
// ==========================================
const CURRICULUM_DOMAINS = {
  basic_add: {
    id: 'basic_add',
    unit: '2단원. 덧셈과 뺄셈 (1)',
    name: '기본 덧셈',
    shortName: '기본 덧셈',
    icon: '➕',
    color: '#FF6B6B',
    bgColor: '#FFE3E3',
    desc: '한 자리 수의 덧셈 (합이 10 이하)'
  },
  basic_sub: {
    id: 'basic_sub',
    unit: '2단원. 덧셈과 뺄셈 (1)',
    name: '기본 뺄셈',
    shortName: '기본 뺄셈',
    icon: '➖',
    color: '#4DABF7',
    bgColor: '#E7F5FF',
    desc: '한 자리 수의 뺄셈 (10 이하의 수에서 빼기)'
  },
  make_10: {
    id: 'make_10',
    unit: '2단원. 덧셈과 뺄셈 (1)',
    name: '10 만들기',
    shortName: '10 만들기',
    icon: '🔟',
    color: '#FF922B',
    bgColor: '#FFF4E6',
    desc: '두 수를 모아 10 만들기, 10이 되는 더하기 (7+□=10)'
  },
  make10_add: {
    id: 'make10_add',
    unit: '2단원. 덧셈과 뺄셈 (1)',
    name: '10을 만들어 더하기',
    shortName: '10 만들어 더하기',
    icon: '🌟',
    color: '#845EF7',
    bgColor: '#F3F0FF',
    desc: '10칸 모형을 이용해 뒤의 수를 갈라 10을 먼저 채우고 더하기 (8+5=13)'
  },
  sub_10: {
    id: 'sub_10',
    unit: '2단원. 덧셈과 뺄셈 (1)',
    name: '10에서 빼기',
    shortName: '10에서 빼기',
    icon: '🎯',
    color: '#20C997',
    bgColor: '#E6FCF5',
    desc: '10에서 한 자리 수를 빼는 계산 (10-4=6)'
  },
  three_nums: {
    id: 'three_nums',
    unit: '2단원. 덧셈과 뺄셈 (1)',
    name: '세 수의 덧셈과 뺄셈',
    shortName: '세 수 계산',
    icon: '🔢',
    color: '#FAB005',
    bgColor: '#FFF9DB',
    desc: '앞에서부터 차례대로 세 수를 더하거나 빼기 (2+3+4, 9-2-3)'
  },
  num_100: {
    id: 'num_100',
    unit: '1단원. 100까지의 수',
    name: '100까지의 수',
    shortName: '100까지 수',
    icon: '💯',
    color: '#339AF0',
    bgColor: '#E7F5FF',
    desc: '10개씩 묶음과 낱개, 수의 순서, 크기 비교, 짝수와 홀수'
  },
  shape_time: {
    id: 'shape_time',
    unit: '3단원. 모양과 시각',
    name: '모양과 시각',
    shortName: '모양·시계',
    icon: '⏰',
    color: '#51CF66',
    bgColor: '#EBFBEE',
    desc: '동그라미·세모·네모 모양 찾기, 몇 시 및 몇 시 30분 시계 보기'
  }
};

// ==========================================
// 3. 1학년 맞춤형 시각 자료 렌더러 (VisualRenderer)
// ==========================================
const VisualRenderer = {
  /**
   * 10칸 수 모형 (Ten-frame) 렌더링
   * @param {number} n1 첫 번째 수 (빨간색 동그라미)
   * @param {number} n2 두 번째 수 (파란색 동그라미 - 더하기인 경우)
   * @param {string} mode 'single' (10칸 1개), 'make10' (10을 만들어 채우기 2개 프레임), 'subtract' (뺄셈 지우기)
   */
  renderTenFrame(n1, n2 = 0, mode = 'single') {
    if (mode === 'make10') {
      // 10을 만들어 더하기: 첫 번째 프레임에 n1개, 10을 채우기 위해 n2 중 (10 - n1)개를 첫 번째에 넣고, 나머지를 두 번째에!
      const neededFor10 = Math.max(0, 10 - n1);
      const firstFrameBlue = Math.min(n2, neededFor10);
      const secondFrameBlue = Math.max(0, n2 - firstFrameBlue);

      return `
        <div class="ten-frame-container make10-mode">
          <div class="ten-frame-wrapper">
            <div class="ten-frame-title">🔟 10 채우기 상자 (10개)</div>
            <div class="ten-frame-grid">
              ${Array.from({ length: 10 }).map((_, i) => {
                let dotClass = 'empty';
                let dotText = '';
                if (i < n1) {
                  dotClass = 'dot red animate-pop';
                  dotText = '🔴';
                } else if (i < n1 + firstFrameBlue) {
                  dotClass = 'dot blue-transfer animate-bounce';
                  dotText = '🔵';
                }
                return `<div class="frame-cell ${dotClass}">${dotText}</div>`;
              }).join('')}
            </div>
            <div class="ten-frame-subtext">8 + 2 = <strong>10</strong> 완성!</div>
          </div>

          <div class="ten-frame-operator">➕</div>

          <div class="ten-frame-wrapper">
            <div class="ten-frame-title">📦 남은 낱개 상자 (${secondFrameBlue}개)</div>
            <div class="ten-frame-grid">
              ${Array.from({ length: 10 }).map((_, i) => {
                let dotClass = 'empty';
                let dotText = '';
                if (i < secondFrameBlue) {
                  dotClass = 'dot blue animate-pop';
                  dotText = '🔵';
                }
                return `<div class="frame-cell ${dotClass}">${dotText}</div>`;
              }).join('')}
            </div>
            <div class="ten-frame-subtext">남은 파란 돌: <strong>${secondFrameBlue}개</strong></div>
          </div>
        </div>
      `;
    }

    if (mode === 'subtract') {
      // 뺄셈 모드: 총 n1개 중 n2개를 X 표시(취소선)하여 지우는 시각화
      return `
        <div class="ten-frame-container sub-mode">
          <div class="ten-frame-wrapper">
            <div class="ten-frame-title">🔟 10칸 수 모형에서 ${n2}개 지우기</div>
            <div class="ten-frame-grid">
              ${Array.from({ length: 10 }).map((_, i) => {
                let dotClass = 'empty';
                let dotContent = '';
                if (i < n1 - n2) {
                  dotClass = 'dot green animate-pop';
                  dotContent = '🟢';
                } else if (i < n1) {
                  dotClass = 'dot red-crossed animate-shake';
                  dotContent = '<span class="crossed-wrap">🔴<span class="cross-mark">❌</span></span>';
                }
                return `<div class="frame-cell ${dotClass}">${dotContent}</div>`;
              }).join('')}
            </div>
            <div class="ten-frame-subtext">지우고 남은 초록 돌: <strong>${n1 - n2}개</strong></div>
          </div>
        </div>
      `;
    }

    // 기본 10칸 모형 (단일 프레임)
    return `
      <div class="ten-frame-container single-mode">
        <div class="ten-frame-wrapper">
          <div class="ten-frame-title">🔟 10칸 수 모형</div>
          <div class="ten-frame-grid">
            ${Array.from({ length: 10 }).map((_, i) => {
              let dotClass = 'empty';
              let dotText = '';
              if (i < n1) {
                dotClass = 'dot red animate-pop';
                dotText = '🔴';
              } else if (i < n1 + n2) {
                dotClass = 'dot blue animate-pop';
                dotText = '🔵';
              }
              return `<div class="frame-cell ${dotClass}">${dotText}</div>`;
            }).join('')}
          </div>
          <div class="ten-frame-subtext">
            ${n2 > 0 ? `빨간 돌 ${n1}개 + 파란 돌 ${n2}개 = 총 ${n1 + n2}개` : `돌 ${n1}개 (10이 되려면 ${10 - n1}개 더 필요해요)`}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 구체물 (사과, 별, 바둑돌 등) 카운팅 렌더링
   */
  renderItems(count, icon = '🍎', crossedCount = 0) {
    let html = '<div class="items-display-box">';
    const activeCount = count - crossedCount;
    for (let i = 0; i < count; i++) {
      if (i < activeCount) {
        html += `<span class="item-icon animate-pop" title="낱개 ${i + 1}">${icon}</span>`;
      } else {
        html += `<span class="item-icon crossed animate-fade" title="지워진 낱개">${icon}<span class="cross-line">✖</span></span>`;
      }
    }
    html += '</div>';
    return html;
  },

  /**
   * 10개씩 묶음과 낱개 모형 렌더링 (100까지의 수)
   */
  renderTenBundles(tens, ones) {
    let bundlesHtml = '';
    for (let i = 0; i < tens; i++) {
      bundlesHtml += `
        <div class="bundle-col animate-pop" title="10개 묶음 1개">
          <div class="bundle-bar">10</div>
          <div class="bundle-label">10개 묶음</div>
        </div>
      `;
    }

    let onesHtml = '';
    for (let i = 0; i < ones; i++) {
      onesHtml += `<div class="single-block animate-pop">1</div>`;
    }

    return `
      <div class="bundles-container">
        <div class="bundles-group">
          <div class="group-title">🏷️ 10개씩 묶음 (${tens}개)</div>
          <div class="bundle-items">${bundlesHtml}</div>
        </div>
        <div class="bundles-group">
          <div class="group-title">🏷️ 낱개 (${ones}개)</div>
          <div class="single-items">${onesHtml || '<span class="empty-text">낱개 없음 (0개)</span>'}</div>
        </div>
      </div>
      <div class="bundle-summary-text">
        10개씩 묶음 <strong>${tens}</strong>개와 낱개 <strong>${ones}</strong>개는 <strong>${tens * 10 + ones}</strong>입니다.
      </div>
    `;
  },

  /**
   * 아날로그 시계 SVG 렌더러 (초등 1학년: 몇 시, 몇 시 30분)
   * @param {number} hour 1 ~ 12
   * @param {number} minute 0 or 30
   */
  renderClockSVG(hour, minute = 0) {
    // 각도 계산: 12시가 0도 (위쪽)
    // 분침: minute * 6도
    const minAngle = minute * 6;
    // 시침: hour * 30도 + (minute / 60) * 30도
    const hourAngle = (hour % 12) * 30 + (minute / 60) * 30;

    // SVG 중심 100, 100, 반지름 80
    const cx = 100;
    const cy = 100;

    // 시계 숫자 (1~12)
    let numbersSvg = '';
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const nx = cx + 64 * Math.cos(angle);
      const ny = cy + 64 * Math.sin(angle) + 5; // text baseline 보정
      numbersSvg += `<text x="${nx}" y="${ny}" text-anchor="middle" font-size="14" font-weight="700" fill="#2D3748">${i}</text>`;
    }

    return `
      <div class="clock-svg-wrapper">
        <svg viewBox="0 0 200 200" width="180" height="180" class="clock-svg">
          <!-- 시계 외곽 테두리 -->
          <circle cx="${cx}" cy="${cy}" r="88" fill="#FFFDF8" stroke="#4A5568" stroke-width="6" />
          <circle cx="${cx}" cy="${cy}" r="82" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />
          
          <!-- 12개 눈금 -->
          ${Array.from({ length: 12 }).map((_, i) => {
            const rad = (i * 30) * (Math.PI / 180);
            const x1 = cx + 76 * Math.sin(rad);
            const y1 = cy - 76 * Math.cos(rad);
            const x2 = cx + 82 * Math.sin(rad);
            const y2 = cy - 82 * Math.cos(rad);
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#718096" stroke-width="3" stroke-linecap="round"/>`;
          }).join('')}

          <!-- 숫자들 -->
          ${numbersSvg}

          <!-- 시침 (빨간색, 굵고 짧음) -->
          <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 45}" 
                stroke="#E53E3E" stroke-width="7" stroke-linecap="round"
                transform="rotate(${hourAngle} ${cx} ${cy})" />

          <!-- 분침 (파란색, 길고 얇음) -->
          <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 68}" 
                stroke="#3182CE" stroke-width="5" stroke-linecap="round"
                transform="rotate(${minAngle} ${cx} ${cy})" />

          <!-- 중심 핀 -->
          <circle cx="${cx}" cy="${cy}" r="6" fill="#2B6CB0" stroke="#FFFFFF" stroke-width="2" />
        </svg>
        <div class="clock-legend">
          <span class="legend-item"><span class="badge red"></span>짧은 바늘(시침): 빨강</span>
          <span class="legend-item"><span class="badge blue"></span>긴 바늘(분침): 파랑</span>
        </div>
      </div>
    `;
  },

  /**
   * 모양 (동그라미, 세모, 네모) SVG 렌더러
   */
  renderShapeSVG(shapeType, color = '#4299E1') {
    if (shapeType === 'circle' || shapeType === '동그라미') {
      return `
        <div class="shape-svg-box">
          <svg viewBox="0 0 100 100" width="90" height="90">
            <circle cx="50" cy="50" r="42" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="5" />
          </svg>
          <div class="shape-title">동그라미 모양 (〇)</div>
        </div>
      `;
    }
    if (shapeType === 'triangle' || shapeType === '세모') {
      return `
        <div class="shape-svg-box">
          <svg viewBox="0 0 100 100" width="90" height="90">
            <polygon points="50,10 90,88 10,88" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="5" stroke-linejoin="round" />
          </svg>
          <div class="shape-title">세모 모양 (△)</div>
        </div>
      `;
    }
    // 네모 모양
    return `
      <div class="shape-svg-box">
        <svg viewBox="0 0 100 100" width="90" height="90">
          <rect x="12" y="12" width="76" height="76" rx="8" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="5" />
        </svg>
        <div class="shape-title">네모 모양 (□)</div>
      </div>
    `;
  },

  /**
   * 수직선 렌더러
   */
  renderNumberLine(start, end, current, jump) {
    const total = end - start;
    const curPercent = ((current - start) / total) * 100;
    const nextPercent = (((current + jump) - start) / total) * 100;

    return `
      <div class="number-line-container">
        <div class="number-line-track">
          <div class="number-line-fill" style="left: ${curPercent}%; width: ${Math.abs(nextPercent - curPercent)}%;"></div>
          ${Array.from({ length: total + 1 }).map((_, i) => {
            const val = start + i;
            const pct = (i / total) * 100;
            const isHighlight = val === current || val === (current + jump);
            return `
              <div class="nl-tick ${isHighlight ? 'highlight' : ''}" style="left: ${pct}%;">
                <div class="nl-mark"></div>
                <div class="nl-num">${val}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="nl-jump-label">
          ${jump > 0 ? `👉 오른쪽으로 ${jump}칸 앞으로 가요 (+${jump})` : `👈 왼쪽으로 ${Math.abs(jump)}칸 뒤로 가요 (${jump})`}
        </div>
      </div>
    `;
  }
};

// ==========================================
// 4. 초기 수준 진단 평가 문항 (Diagnosis Pool: 7문항)
// ==========================================
const DIAGNOSIS_QUESTIONS = [
  {
    id: 'diag_1',
    domain: 'basic_add',
    title: '기초 덧셈 진단',
    questionText: '그림을 보고 덧셈의 답을 구해보세요.',
    formula: '4 + 3 = ?',
    visualType: 'items',
    visualData: { count: 7, icon: '🍎', split: [4, 3] },
    answer: 7,
    inputType: 'numpad',
    hint: '사과 4개에 3개를 더 모아보세요. 손가락으로 4 다음에 5, 6, 7을 세어봐요!',
    steps: ['사과가 먼저 4개 있어요.', '사과 3개를 더 가져왔어요.', '모두 세어보면 4, 5, 6, 7! 답은 7이에요.']
  },
  {
    id: 'diag_2',
    domain: 'make_10',
    title: '10 만들기 진단',
    questionText: '7과 더하여 10이 되는 수는 무엇일까요?',
    formula: '7 + □ = 10',
    visualType: 'tenframe',
    visualData: { n1: 7, n2: 0, mode: 'single' },
    answer: 3,
    inputType: 'numpad',
    hint: '10칸 상자에서 빈칸이 몇 개인지 세어보세요!',
    steps: ['10칸 상자에 빨간 돌이 7개 차 있어요.', '빈칸은 3칸이 남아있어요.', '따라서 7에 3을 더하면 10이 됩니다.']
  },
  {
    id: 'diag_3',
    domain: 'sub_10',
    title: '10에서 빼기 진단',
    questionText: '10개에서 4개를 빼면 몇 개가 남을까요?',
    formula: '10 - 4 = ?',
    visualType: 'tenframe',
    visualData: { n1: 10, n2: 4, mode: 'subtract' },
    answer: 6,
    inputType: 'numpad',
    hint: '10칸 모형에서 4개를 지우면 남은 칸은 몇 개일까요?',
    steps: ['10개 중에서 4개를 ❌표로 지워요.', '남아 있는 초록색 돌을 세어봐요.', '5개 묶음에 1개가 더 있으니 6개예요!']
  },
  {
    id: 'diag_4',
    domain: 'make10_add',
    title: '10을 만들어 더하기 진단',
    questionText: '8에 5를 더하면 얼마일까요? (10을 먼저 만들어 봐요)',
    formula: '8 + 5 = ?',
    visualType: 'tenframe',
    visualData: { n1: 8, n2: 5, mode: 'make10' },
    answer: 13,
    inputType: 'numpad',
    hint: '8에 2를 더해 10을 먼저 채우고, 5에서 남은 3을 더해봐요!',
    steps: [
      '1단계: 8은 10이 되려면 2가 필요해요.',
      '2단계: 더하는 5를 2와 3으로 나누어요. (5 = 2 + 3)',
      '3단계: 8 + 2 = 10으로 10을 먼저 만들어요.',
      '4단계: 10에 남은 3을 더하면 10 + 3 = 13이 됩니다!'
    ]
  },
  {
    id: 'diag_5',
    domain: 'basic_sub',
    title: '기초 뺄셈 진단',
    questionText: '사탕 9개 중 4개를 친구에게 주었습니다. 남은 사탕은 몇 개일까요?',
    formula: '9 - 4 = ?',
    visualType: 'items',
    visualData: { count: 9, icon: '🍬', crossedCount: 4 },
    answer: 5,
    inputType: 'numpad',
    hint: '9개에서 ❌표시된 4개를 빼고 남아있는 사탕을 세어보세요.',
    steps: ['전체 사탕 9개에서 4개를 뺐어요.', '남은 사탕을 하나씩 세어보면 5개예요!']
  },
  {
    id: 'diag_6',
    domain: 'num_100',
    title: '100까지의 수 진단',
    questionText: '10개씩 묶음 3개와 낱개 5개는 어떤 수일까요?',
    formula: '묶음 3개, 낱개 5개 = ?',
    visualType: 'bundles',
    visualData: { tens: 3, ones: 5 },
    answer: 35,
    inputType: 'numpad',
    hint: '10개 묶음 3개는 30(서른)이에요. 낱개 5개를 합쳐서 읽고 써보세요.',
    steps: ['10개씩 묶음 3개는 30이에요.', '낱개 5개는 5예요.', '30과 5가 모이면 서른다섯, 즉 35예요.']
  },
  {
    id: 'diag_7',
    domain: 'shape_time',
    title: '모양과 시각 진단',
    questionText: '시계가 가리키는 시각은 몇 시일까요?',
    formula: '시계 보기',
    visualType: 'clock',
    visualData: { hour: 3, minute: 0 },
    answer: 3,
    inputType: 'numpad',
    hint: '짧은 바늘이 3을 가리키고, 긴 바늘이 12를 가리키고 있어요!',
    steps: ['짧은 빨간 바늘이 가리키는 숫자가 "몇 시"를 알려줘요.', '긴 파란 바늘이 12에 있으면 정각(0분)이에요.', '따라서 지금은 "3시"입니다.']
  }
];

// ==========================================
// 5. 정선된 5단계 학습 문제 은행 (Question Bank)
// ==========================================
const QUESTION_BANK = [
  // ------------------------------------------
  // 1단계: 기초 다지기 (한 자리 덧셈/뺄셈, 10 모으기와 가르기)
  // ------------------------------------------
  {
    id: 'st1_add_01',
    stage: 1,
    domain: 'basic_add',
    difficulty: 1,
    questionText: '바둑돌을 보고 덧셈을 해보세요.',
    formula: '3 + 4 = ?',
    visualType: 'tenframe',
    visualData: { n1: 3, n2: 4, mode: 'single' },
    answer: 7,
    inputType: 'numpad',
    hint: '빨간 돌 3개에 파란 돌 4개를 함께 세어보세요.',
    steps: ['빨간 돌이 3개 있어요.', '파란 돌 4개를 더하면 3, 4, 5, 6, 7개!', '답은 7입니다.']
  },
  {
    id: 'st1_add_02',
    stage: 1,
    domain: 'basic_add',
    difficulty: 1,
    questionText: '사과를 모두 모으면 몇 개일까요?',
    formula: '5 + 2 = ?',
    visualType: 'items',
    visualData: { count: 7, icon: '🍎', split: [5, 2] },
    answer: 7,
    inputType: 'numpad',
    hint: '5 다음에 6, 7 손가락으로 2번 더 세어봐요.',
    steps: ['사과가 5개 있어요.', '여기에 2개를 더 놓으면 6, 7!', '답은 7개예요.']
  },
  {
    id: 'st1_sub_01',
    stage: 1,
    domain: 'basic_sub',
    difficulty: 1,
    questionText: '별 8개 중 3개를 지우면 몇 개가 남을까요?',
    formula: '8 - 3 = ?',
    visualType: 'items',
    visualData: { count: 8, icon: '⭐', crossedCount: 3 },
    answer: 5,
    inputType: 'numpad',
    hint: '❌표시되지 않은 노란 별들을 하나씩 세어보세요.',
    steps: ['별이 처음에 8개 있었어요.', '그중 3개를 ❌표로 지웠어요.', '남은 별을 세어보면 5개예요.']
  },
  {
    id: 'st1_sub_02',
    stage: 1,
    domain: 'basic_sub',
    difficulty: 1,
    questionText: '10칸 상자에서 6개 중 2개를 빼면?',
    formula: '6 - 2 = ?',
    visualType: 'tenframe',
    visualData: { n1: 6, n2: 2, mode: 'subtract' },
    answer: 4,
    inputType: 'numpad',
    hint: '6칸 차 있던 돌에서 2개를 지웠어요.',
    steps: ['돌 6개에서 2개를 뺐어요.', '남아 있는 돌은 4개입니다.']
  },

  // ------------------------------------------
  // 2단계: 10 만들기 이해하기 (7+□=10, 10-6=□, 8과 2의 합)
  // ------------------------------------------
  {
    id: 'st2_make10_01',
    stage: 2,
    domain: 'make_10',
    difficulty: 2,
    questionText: '빈칸 □ 안에 들어갈 알맞은 수는 무엇일까요?',
    formula: '7 + □ = 10',
    visualType: 'tenframe',
    visualData: { n1: 7, n2: 0, mode: 'single' },
    answer: 3,
    inputType: 'numpad',
    hint: '10칸 상자에서 비어있는 하얀 칸의 개수를 세어보세요.',
    steps: ['10칸 상자에 7개의 돌이 차 있어요.', '10개를 꽉 채우려면 빈칸 3칸이 더 채워져야 해요.', '따라서 7 + 3 = 10입니다!']
  },
  {
    id: 'st2_make10_02',
    stage: 2,
    domain: 'make_10',
    difficulty: 2,
    questionText: '4와 더하여 10이 되는 짝꿍 수는 무엇일까요?',
    formula: '4 + □ = 10',
    visualType: 'tenframe',
    visualData: { n1: 4, n2: 0, mode: 'single' },
    answer: 6,
    inputType: 'numpad',
    hint: '4에 몇 개를 더 넣어야 10칸이 가득 찰까요?',
    steps: ['4는 10이 되려면 6개가 더 필요해요.', '4와 6을 모으면 10이 됩니다!']
  },
  {
    id: 'st2_sub10_01',
    stage: 2,
    domain: 'sub_10',
    difficulty: 2,
    questionText: '10에서 6을 빼면 얼마가 남을까요?',
    formula: '10 - 6 = ?',
    visualType: 'tenframe',
    visualData: { n1: 10, n2: 6, mode: 'subtract' },
    answer: 4,
    inputType: 'numpad',
    hint: '10칸 중 6개를 ❌표시하면 몇 칸이 남나요?',
    steps: ['10개 중 6개를 지웠어요.', '남은 칸은 4칸입니다.', '10 - 6 = 4']
  },
  {
    id: 'st2_make10_sum',
    stage: 2,
    domain: 'make_10',
    difficulty: 2,
    questionText: '8과 2를 더하면 얼마일까요?',
    formula: '8 + 2 = ?',
    visualType: 'tenframe',
    visualData: { n1: 8, n2: 2, mode: 'single' },
    answer: 10,
    inputType: 'numpad',
    hint: '8에 2를 쏙 넣으면 10칸 상자가 가득 차요!',
    steps: ['8에 2를 더하면 10칸 상자가 꼭 맞게 꽉 찹니다.', '그래서 8 + 2 = 10이에요.']
  },

  // ------------------------------------------
  // 3단계: 10을 만들어 더하기 (8+5, 9+4, 7+6, 8+2+3 등 수 분해)
  // ------------------------------------------
  {
    id: 'st3_make10add_01',
    stage: 3,
    domain: 'make10_add',
    difficulty: 3,
    questionText: '10을 먼저 채우고 남은 수를 더해 보세요.',
    formula: '8 + 5 = ?',
    visualType: 'tenframe',
    visualData: { n1: 8, n2: 5, mode: 'make10' },
    answer: 13,
    inputType: 'numpad',
    hint: '8은 2를 만나면 10이 돼요! 5에서 2를 먼저 주고 남은 3을 생각해요.',
    steps: [
      '1. 8에 얼마를 더하면 10이 될까요? 바로 2예요.',
      '2. 뒤의 5를 2와 3으로 갈라요 (5 = 2 + 3).',
      '3. 8에 2를 더해 먼저 10을 만들어요 (8 + 2 = 10).',
      '4. 10에 남은 3을 더하면 10 + 3 = 13이 됩니다!'
    ]
  },
  {
    id: 'st3_make10add_02',
    stage: 3,
    domain: 'make10_add',
    difficulty: 3,
    questionText: '10을 만들어 더해 보세요.',
    formula: '9 + 4 = ?',
    visualType: 'tenframe',
    visualData: { n1: 9, n2: 4, mode: 'make10' },
    answer: 13,
    inputType: 'numpad',
    hint: '9는 1개만 더 있으면 10이 돼요! 4에서 1을 먼저 빌려줘요.',
    steps: [
      '1. 9는 1만 더하면 10이 돼요.',
      '2. 4를 1과 3으로 갈라요 (4 = 1 + 3).',
      '3. 9 + 1 = 10을 먼저 만들어요.',
      '4. 10 + 3 = 13입니다!'
    ]
  },
  {
    id: 'st3_make10add_03',
    stage: 3,
    domain: 'make10_add',
    difficulty: 3,
    questionText: '7과 6을 더해 보세요.',
    formula: '7 + 6 = ?',
    visualType: 'tenframe',
    visualData: { n1: 7, n2: 6, mode: 'make10' },
    answer: 13,
    inputType: 'numpad',
    hint: '7은 3이 있으면 10이 돼요. 6을 3과 3으로 나누어 봐요.',
    steps: [
      '1. 7에 3을 더하면 10이 돼요.',
      '2. 6을 3과 3으로 나누어요.',
      '3. 7 + 3 = 10을 먼저 만들고,',
      '4. 10 + 3 = 13으로 계산해요.'
    ]
  },
  {
    id: 'st3_make10add_step',
    stage: 3,
    domain: 'make10_add',
    difficulty: 3,
    questionText: '10을 만드는 과정입니다. 빈칸에 알맞은 답을 구해보세요.',
    formula: '8 + 2 + 3 = ?',
    visualType: 'tenframe',
    visualData: { n1: 8, n2: 5, mode: 'make10' },
    answer: 13,
    inputType: 'numpad',
    hint: '8 + 2를 먼저 계산하면 10이 돼요. 10에 3을 더해 보세요!',
    steps: ['앞의 8과 2를 먼저 더하면 10이 됩니다.', '10에 남은 3을 더하면 13이에요!']
  },

  // ------------------------------------------
  // 4단계: 뺄셈 개념 다지기 (전체와 남은 수, 10에서 빼기, 13-3 등)
  // ------------------------------------------
  {
    id: 'st4_sub_01',
    stage: 4,
    domain: 'basic_sub',
    difficulty: 2,
    questionText: '그림을 보고 뺄셈의 답을 구해 보세요.',
    formula: '9 - 4 = ?',
    visualType: 'items',
    visualData: { count: 9, icon: '🍎', crossedCount: 4 },
    answer: 5,
    inputType: 'numpad',
    hint: '9개 사과 중에서 ❌표시된 4개를 뺀 남은 사과를 세어보세요.',
    steps: ['사과가 9개 있었습니다.', '그중 4개를 먹어서 없앴어요.', '남은 사과는 5개입니다.']
  },
  {
    id: 'st4_sub_02',
    stage: 4,
    domain: 'sub_10',
    difficulty: 2,
    questionText: '10에서 7을 빼면 얼마일까요?',
    formula: '10 - 7 = ?',
    visualType: 'tenframe',
    visualData: { n1: 10, n2: 7, mode: 'subtract' },
    answer: 3,
    inputType: 'numpad',
    hint: '10칸 상자에서 7개를 ❌하면 몇 칸이 남을까요?',
    steps: ['10에서 7을 빼면 3이 남아요.', '7과 3은 10을 만드는 짝꿍이에요!']
  },
  {
    id: 'st4_sub_03',
    stage: 4,
    domain: 'basic_sub',
    difficulty: 3,
    questionText: '13에서 낱개 3을 먼저 빼보세요.',
    formula: '13 - 3 = ?',
    visualType: 'bundles',
    visualData: { tens: 1, ones: 3 },
    answer: 10,
    inputType: 'numpad',
    hint: '13은 10개 묶음 1개와 낱개 3개예요. 낱개 3개를 빼면 무엇만 남을까요?',
    steps: ['13은 10과 3으로 이루어져 있어요.', '낱개 3개를 빼버리면 딱 10만 남게 됩니다!']
  },

  // ------------------------------------------
  // 5단계: 종합 문제와 응용 (세 수의 계산, 100까지의 수, 시각과 모양)
  // ------------------------------------------
  {
    id: 'st5_three_01',
    stage: 5,
    domain: 'three_nums',
    difficulty: 3,
    questionText: '앞에서부터 차례대로 더해 보세요.',
    formula: '2 + 3 + 4 = ?',
    visualType: 'items',
    visualData: { count: 9, icon: '⭐', split: [2, 3, 4] },
    answer: 9,
    inputType: 'numpad',
    hint: '먼저 2 + 3 = 5를 계산하고, 그 5에 4를 더해봐요!',
    steps: ['1단계: 앞의 두 수 2 + 3 = 5예요.', '2단계: 5에 4를 더하면 9가 됩니다.']
  },
  {
    id: 'st5_three_02',
    stage: 5,
    domain: 'three_nums',
    difficulty: 3,
    questionText: '앞에서부터 차례대로 빼보세요.',
    formula: '9 - 2 - 3 = ?',
    visualType: 'items',
    visualData: { count: 9, icon: '🍬', crossedCount: 5 },
    answer: 4,
    inputType: 'numpad',
    hint: '9에서 먼저 2를 빼면 7! 7에서 3을 더 빼보세요.',
    steps: ['1단계: 9 - 2 = 7입니다.', '2단계: 7에서 3을 더 빼면 4가 됩니다!']
  },
  {
    id: 'st5_num_order',
    stage: 5,
    domain: 'num_100',
    difficulty: 2,
    questionText: '빈칸에 들어갈 알맞은 수를 맞춰보세요.',
    formula: '47, 48, □, 50, 51',
    visualType: 'numberline',
    visualData: { start: 46, end: 52, current: 48, jump: 1 },
    answer: 49,
    inputType: 'numpad',
    hint: '48 다음으로 1 큰 수는 무엇일까요?',
    steps: ['수를 1씩 커지게 순서대로 세고 있어요.', '48보다 1 큰 수는 49예요.']
  },
  {
    id: 'st5_num_compare',
    stage: 5,
    domain: 'num_100',
    difficulty: 2,
    questionText: '54와 48 중 더 큰 수를 고르세요.',
    formula: '54 와 48',
    visualType: 'bundles',
    visualData: { tens: 5, ones: 4 },
    options: ['54', '48'],
    answer: '54',
    inputType: 'choice',
    hint: '10개씩 묶음의 개수를 먼저 비교해 보세요! 5묶음 vs 4묶음!',
    steps: ['54는 10개씩 묶음이 5개이고, 48은 10개씩 묶음이 4개예요.', '10개씩 묶음이 더 많은 54가 더 큰 수예요!']
  },
  {
    id: 'st5_shape_01',
    stage: 5,
    domain: 'shape_time',
    difficulty: 1,
    questionText: '이 모양의 이름은 무엇일까요?',
    formula: '도형 알아보기',
    visualType: 'shape',
    visualData: { shape: '동그라미', color: '#ED64A6' },
    options: ['동그라미 모양', '세모 모양', '네모 모양'],
    answer: '동그라미 모양',
    inputType: 'choice',
    hint: '둥글둥글 굴러가는 모양이에요.',
    steps: ['동그랗게 굽은 선으로 둘러싸인 모양을 "동그라미 모양"이라고 불러요.']
  },
  {
    id: 'st5_time_01',
    stage: 5,
    domain: 'shape_time',
    difficulty: 2,
    questionText: '시계가 가리키는 시각은 몇 시 몇 분일까요?',
    formula: '시계 보기',
    visualType: 'clock',
    visualData: { hour: 4, minute: 30 },
    options: ['4시 30분', '5시 30분', '4시', '5시'],
    answer: '4시 30분',
    inputType: 'choice',
    hint: '짧은 바늘이 4와 5의 가운데 있고, 긴 바늘이 6을 가리키고 있어요!',
    steps: ['짧은 바늘이 4를 지나 4와 5 가운데에 있고, 긴 바늘이 6에 있으면 "4시 30분"입니다.']
  }
];

// ==========================================
// 6. 안전하고 검증된 무작위 문항 생성기 (Question Generator)
// ==========================================
const QuestionGenerator = {
  // 1학년 2학기 범위 내에서만 숫자를 추출하여 수학적으로 정확한 문제를 생성
  generate(domainId, stage = 1) {
    switch (domainId) {
      case 'basic_add': {
        // 합이 10 이하인 한 자리 수 덧셈
        const a = Math.floor(Math.random() * 5) + 1; // 1~5
        const maxB = 10 - a;
        const b = Math.floor(Math.random() * maxB) + 1;
        const ans = a + b;
        return {
          id: `gen_add_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'basic_add',
          difficulty: ans > 7 ? 2 : 1,
          questionText: '그림을 보고 덧셈의 답을 구해 보세요.',
          formula: `${a} + ${b} = ?`,
          visualType: 'tenframe',
          visualData: { n1: a, n2: b, mode: 'single' },
          answer: ans,
          inputType: 'numpad',
          hint: `${a} 다음에 손가락으로 ${b}번 더 세어봐요!`,
          steps: [
            `빨간 돌이 ${a}개 있어요.`,
            `파란 돌 ${b}개를 더 모아봐요.`,
            `모두 세어보면 ${ans}개예요!`
          ]
        };
      }

      case 'basic_sub': {
        // 10 이하에서 한 자리 수를 빼는 뺄셈
        const a = Math.floor(Math.random() * 6) + 4; // 4~9
        const b = Math.floor(Math.random() * (a - 1)) + 1; // 1 ~ a-1
        const ans = a - b;
        return {
          id: `gen_sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'basic_sub',
          difficulty: 1,
          questionText: '전체에서 빼는 만큼 지우고 남은 수를 구해 보세요.',
          formula: `${a} - ${b} = ?`,
          visualType: 'items',
          visualData: { count: a, icon: '🍎', crossedCount: b },
          answer: ans,
          inputType: 'numpad',
          hint: `${a}개 사과 중에서 ❌표시된 ${b}개를 뺀 남은 사과를 세어보세요.`,
          steps: [
            `전체 사과가 ${a}개 있었어요.`,
            `${b}개를 ❌표로 지웠어요.`,
            `남아있는 사과는 ${ans}개입니다.`
          ]
        };
      }

      case 'make_10': {
        // 10 만들기 (a + □ = 10)
        const a = Math.floor(Math.random() * 8) + 1; // 1~8
        const ans = 10 - a;
        return {
          id: `gen_m10_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'make_10',
          difficulty: 2,
          questionText: '10이 되기 위해 빈칸 □에 들어갈 수는 무엇일까요?',
          formula: `${a} + □ = 10`,
          visualType: 'tenframe',
          visualData: { n1: a, n2: 0, mode: 'single' },
          answer: ans,
          inputType: 'numpad',
          hint: `10칸 상자에서 하얀 빈칸의 개수를 세어보세요.`,
          steps: [
            `10칸 상자에 돌이 ${a}개 채워져 있어요.`,
            `10칸을 모두 채우려면 ${ans}칸이 더 필요해요.`,
            `따라서 ${a} + ${ans} = 10입니다!`
          ]
        };
      }

      case 'make10_add': {
        // 10을 만들어 더하기 (합이 11~18)
        // a는 6, 7, 8, 9 중 하나
        const aCandidates = [8, 9, 7, 6];
        const a = aCandidates[Math.floor(Math.random() * aCandidates.length)];
        const needFor10 = 10 - a; // 예: a=8이면 2 필요
        // b는 needFor10보다 큰 수 (최대 9)
        const b = needFor10 + Math.floor(Math.random() * 4) + 1; // 2 + 1~4 = 3~6
        const remainder = b - needFor10;
        const ans = a + b;

        return {
          id: `gen_m10add_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'make10_add',
          difficulty: 3,
          questionText: '10을 먼저 채우고 남은 수를 더해 보세요.',
          formula: `${a} + ${b} = ?`,
          visualType: 'tenframe',
          visualData: { n1: a, n2: b, mode: 'make10' },
          answer: ans,
          inputType: 'numpad',
          hint: `${a}에 ${needFor10}을 먼저 채워 10을 만들고, 남은 ${remainder}를 더해봐요!`,
          steps: [
            `1단계: ${a}는 10이 되려면 ${needFor10}이 필요해요.`,
            `2단계: 뒤의 ${b}를 ${needFor10}과 ${remainder}로 나누어요 (${b} = ${needFor10} + ${remainder}).`,
            `3단계: ${a} + ${needFor10} = 10을 먼저 만들어요.`,
            `4단계: 10에 남은 ${remainder}를 더하면 10 + ${remainder} = ${ans}입니다!`
          ]
        };
      }

      case 'sub_10': {
        // 10에서 한 자리 수 빼기
        const b = Math.floor(Math.random() * 8) + 1; // 1~8
        const ans = 10 - b;
        return {
          id: `gen_sub10_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'sub_10',
          difficulty: 2,
          questionText: '10개에서 빼고 남은 개수를 구해 보세요.',
          formula: `10 - ${b} = ?`,
          visualType: 'tenframe',
          visualData: { n1: 10, n2: b, mode: 'subtract' },
          answer: ans,
          inputType: 'numpad',
          hint: `10칸 상자에서 ${b}개를 ❌하면 몇 칸이 남을까요?`,
          steps: [
            `10개 중에서 ${b}개를 지워요.`,
            `${b}와 10을 만드는 짝꿍 수는 ${ans}예요!`,
            `따라서 10 - ${b} = ${ans}입니다.`
          ]
        };
      }

      case 'three_nums': {
        // 세 수의 덧셈 (합 <= 10)
        const n1 = Math.floor(Math.random() * 3) + 1; // 1~3
        const n2 = Math.floor(Math.random() * 3) + 1; // 1~3
        const maxN3 = 10 - (n1 + n2);
        const n3 = Math.floor(Math.random() * maxN3) + 1;
        const ans = n1 + n2 + n3;
        return {
          id: `gen_three_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'three_nums',
          difficulty: 3,
          questionText: '앞에서부터 두 수씩 차례대로 더해 보세요.',
          formula: `${n1} + ${n2} + ${n3} = ?`,
          visualType: 'items',
          visualData: { count: ans, icon: '⭐', split: [n1, n2, n3] },
          answer: ans,
          inputType: 'numpad',
          hint: `먼저 ${n1} + ${n2} = ${n1 + n2}를 구하고, 거기에 ${n3}을 더해요!`,
          steps: [
            `1단계: 앞의 두 수 ${n1} + ${n2} = ${n1 + n2}를 먼저 계산해요.`,
            `2단계: ${n1 + n2}에 마지막 수 ${n3}을 더하면 ${ans}가 됩니다!`
          ]
        };
      }

      case 'num_100': {
        // 10개 묶음과 낱개 또는 수의 순서
        const tens = Math.floor(Math.random() * 7) + 2; // 2~8 (20~80)
        const ones = Math.floor(Math.random() * 8) + 1; // 1~8
        const total = tens * 10 + ones;
        return {
          id: `gen_n100_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'num_100',
          difficulty: 2,
          questionText: '10개씩 묶음과 낱개를 세어 알맞은 수를 쓰세요.',
          formula: `묶음 ${tens}개와 낱개 ${ones}개`,
          visualType: 'bundles',
          visualData: { tens, ones },
          answer: total,
          inputType: 'numpad',
          hint: `10개 묶음 ${tens}개는 ${tens * 10}이에요. 낱개 ${ones}개를 함께 세어요.`,
          steps: [
            `10개씩 묶음 ${tens}개는 ${tens * 10}입니다.`,
            `낱개 ${ones}개와 합치면 ${total}이 됩니다!`
          ]
        };
      }

      case 'shape_time': {
        // 시계 정각 또는 30분
        const isHalf = Math.random() > 0.5;
        const hour = Math.floor(Math.random() * 11) + 1; // 1~11
        const minute = isHalf ? 30 : 0;
        const ans = isHalf ? `${hour}시 30분` : `${hour}시`;
        const wrong1 = isHalf ? `${hour}시` : `${hour}시 30분`;
        const wrong2 = `${(hour % 12) + 1}시`;
        const wrong3 = `${(hour % 12) + 1}시 30분`;
        const opts = [ans, wrong1, wrong2, wrong3].sort(() => Math.random() - 0.5);

        return {
          id: `gen_time_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          stage,
          domain: 'shape_time',
          difficulty: isHalf ? 2 : 1,
          questionText: '시계가 가리키는 시각을 골라 보세요.',
          formula: '시계 알아보기',
          visualType: 'clock',
          visualData: { hour, minute },
          options: opts,
          answer: ans,
          inputType: 'choice',
          hint: `짧은 바늘이 어디를 가리키는지, 긴 바늘이 12인지 6인지 보세요!`,
          steps: [
            `짧은 빨간 바늘이 ${hour}를 가리키거나 지나고 있어요.`,
            `긴 파란 바늘이 ${minute === 0 ? '12를 가리키므로 정각' : '6을 가리키므로 30분'}이에요.`,
            `따라서 정답은 "${ans}"입니다.`
          ]
        };
      }

      default:
        return QUESTION_BANK[0];
    }
  }
};

// ==========================================
// 7. 적응형 학습 진단 및 추천 엔진 (AdaptiveEngine)
// ==========================================
const AdaptiveEngine = {
  // 도메인별 성취 상태 정의
  STATUS: {
    UNTESTED: 'untested',     // 미확인 (학습 전)
    PRACTICING: 'practicing', // 연습 중 (힌트 사용 또는 오답 발생)
    IMPROVING: 'improving',   // 익숙해지는 중 (안정적 정답)
    MASTERED: 'mastered'      // 숙달 완료
  },

  /**
   * 학생 프로필의 도메인 성취도 계산
   * @param {Object} studentProfile
   */
  evaluateDomains(studentProfile) {
    const domainStats = {};
    const history = studentProfile.history || [];

    Object.keys(CURRICULUM_DOMAINS).forEach(dId => {
      const records = history.filter(h => h.domain === dId);
      const total = records.length;
      const correct = records.filter(r => r.isCorrect).length;
      const hintUsed = records.filter(r => r.usedHint).length;
      const recent3 = records.slice(-3);
      const recentCorrectCount = recent3.filter(r => r.isCorrect).length;

      let status = this.STATUS.UNTESTED;
      let label = '미확인 (자료 부족)';
      let badgeColor = '#A0AEC0';

      if (total === 0) {
        status = this.STATUS.UNTESTED;
        label = '자료 부족 (학습 전)';
        badgeColor = '#CBD5E0';
      } else if (total < 2) {
        status = this.STATUS.PRACTICING;
        label = '추가 확인 필요';
        badgeColor = '#ED8936';
      } else {
        const accuracy = Math.round((correct / total) * 100);
        if (accuracy >= 85 && recentCorrectCount >= 2 && hintUsed <= 1) {
          status = this.STATUS.MASTERED;
          label = '숙달 완료 ✨';
          badgeColor = '#38A169';
        } else if (accuracy >= 65 || recentCorrectCount >= 2) {
          status = this.STATUS.IMPROVING;
          label = '익숙해지는 중 🌱';
          badgeColor = '#3182CE';
        } else {
          status = this.STATUS.PRACTICING;
          label = '연습 중 (보충 필요) 💡';
          badgeColor = '#DD6B20';
        }
      }

      domainStats[dId] = {
        domainId: dId,
        total,
        correct,
        hintUsed,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        status,
        label,
        badgeColor,
        recentErrors: records.filter(r => !r.isCorrect).length
      };
    });

    return domainStats;
  },

  /**
   * 학생의 현재 학습 상태를 바탕으로 다음 맞춤형 문제 추천
   * @param {Object} studentProfile
   * @param {Object} lastResult { questionId, domain, isCorrect, usedHint, consecutiveWrongs }
   */
  pickNextQuestion(studentProfile, lastResult = null) {
    const history = studentProfile.history || [];
    const stats = this.evaluateDomains(studentProfile);

    // 1. 방금 푼 문제에서 오답이 2회 이상 연속된 경우:
    // 10을 만들어 더하기에서 막히면 -> 더 기초적인 '10 만들기' 또는 시각자료 10칸 모형 문제로 즉시 보충!
    if (lastResult && !lastResult.isCorrect && lastResult.consecutiveWrongs >= 2) {
      if (lastResult.domain === 'make10_add') {
        // 10 만들기(make_10) 개념 복습 문항 제공
        return QuestionGenerator.generate('make_10', 2);
      }
      if (lastResult.domain === 'three_nums') {
        // 기본 덧셈 복습
        return QuestionGenerator.generate('basic_add', 1);
      }
      // 그 외 유형은 같은 도메인의 가장 쉬운 시각 모형 문제로 완화
      return QuestionGenerator.generate(lastResult.domain, 1);
    }

    // 2. 가장 도움이 필요한 도메인 탐색 (연습 중 > 미확인 > 익숙해지는 중)
    const priorityDomains = Object.values(stats).sort((a, b) => {
      // 연습 중인 영역 우선
      if (a.status === 'practicing' && b.status !== 'practicing') return -1;
      if (b.status === 'practicing' && a.status !== 'practicing') return 1;
      // 그 다음은 아직 확인 안 된 영역
      if (a.status === 'untested' && b.status !== 'untested') return -1;
      if (b.status === 'untested' && a.status !== 'untested') return 1;
      // 그 다음 정답률 낮은 순
      return a.accuracy - b.accuracy;
    });

    const targetDomain = priorityDomains[0] ? priorityDomains[0].domainId : 'basic_add';
    const targetStage = studentProfile.currentStage || 1;

    // 문제 은행에서 아직 안 풀어본 정선된 문제 검색
    const solvedIds = new Set(history.map(h => h.questionId));
    const availableFromBank = QUESTION_BANK.filter(
      q => q.domain === targetDomain && !solvedIds.has(q.id)
    );

    if (availableFromBank.length > 0) {
      // 은행에서 랜덤하게 1개 추천
      const picked = availableFromBank[Math.floor(Math.random() * availableFromBank.length)];
      return JSON.parse(JSON.stringify(picked));
    }

    // 은행에 소진되었으면 안전한 동적 생성기로 새로 생성!
    return QuestionGenerator.generate(targetDomain, targetStage);
  }
};

// 전역 등록 (외부 모듈/스크립트에서 안전하게 접근)
window.SoundFX = SoundFX;
window.CURRICULUM_DOMAINS = CURRICULUM_DOMAINS;
window.VisualRenderer = VisualRenderer;
window.DIAGNOSIS_QUESTIONS = DIAGNOSIS_QUESTIONS;
window.QUESTION_BANK = QUESTION_BANK;
window.QuestionGenerator = QuestionGenerator;
window.AdaptiveEngine = AdaptiveEngine;

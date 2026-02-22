import "./rebalancing-guide.css";

export default function RebalancingGuide() {
  return (
    <div data-guide-article data-guide="rebalancing-guide">
      <div className="container">

        {/* ① Hero */}
        <div className="hero">
          <span className="badge">투자 전략 · 자산관리</span>
          <h1>포트폴리오 리밸런싱<br />완전 가이드</h1>
          <p>처음 세운 비중으로 돌아가는 단순한 규율.<br />그 꾸준함이 장기 수익의 가장 단단한 안전벨트가 됩니다.</p>
        </div>

        {/* ② Navigation Pills */}
        <nav className="nav-pills">
          <a className="pill" href="#s1">개념</a>
          <a className="pill" href="#s2">왜 필요한가</a>
          <a className="pill" href="#s3">방법 비교</a>
          <a className="pill" href="#s4">실전 계산</a>
          <a className="pill" href="#s5">절세 계좌 활용</a>
          <a className="pill" href="#s6">주의사항 &amp; 팁</a>
          <a className="pill" href="#summary">한눈에 보기</a>
        </nav>

        {/* ③ Overview Cards */}
        <div className="ov-grid">
          <div className="ov-card">
            <span className="ov-icon">⚖️</span>
            <h3>비중 재조정</h3>
            <p>목표 비중에서 벗어난 자산을 원래대로 되돌리는 과정</p>
          </div>
          <div className="ov-card">
            <span className="ov-icon">🛡️</span>
            <h3>리스크 관리</h3>
            <p>특정 자산 쏠림을 방지해 포트폴리오 위험을 통제</p>
          </div>
          <div className="ov-card">
            <span className="ov-icon">🔄</span>
            <h3>매매 자동화</h3>
            <p>감정 개입 없이 규칙 기반으로 매수·매도 결정</p>
          </div>
          <div className="ov-card">
            <span className="ov-icon">📈</span>
            <h3>복리 효과</h3>
            <p>절세 계좌와 결합하면 세금 이연으로 복리 극대화</p>
          </div>
        </div>

        {/* ═══ Section 1 ═══ */}
        <div className="section" id="s1">
          <div className="section-bar">
            <span className="section-num" style={{ background: "var(--guide-concept)" }}>01</span>
            <div>
              <h2>리밸런싱이란?</h2>
              <span className="sub">Rebalancing — 자산 비중을 초기 목표로 되돌리는 일</span>
            </div>
          </div>

          <div className="explain">
            <p>리밸런싱은 포트폴리오 안에 있는 자산들의 <strong>비중을 재조정하는 과정</strong>입니다. 처음에 주식 60%, 채권 40%로 정했는데, 주식이 올라서 70:30이 되었다면 — 다시 60:40으로 되돌리는 것이 리밸런싱입니다.</p>
            <p>구체적으로 하는 일은 간단합니다. <strong>많이 오른 자산은 일부 매도해 수익을 실현</strong>하고, <strong>하락한 자산은 낮은 가격에 추가 매수</strong>합니다. 자연스럽게 &quot;고평가 자산을 줄이고, 저평가 자산을 늘리는&quot; 역발상 투자가 규칙 기반으로 실행됩니다.</p>
            <div className="callout concept">
              <strong>핵심:</strong> 리밸런싱 = 처음 약속한 비중으로 되돌리는 규율. 거창한 기술이 아니라, 초심을 지키는 행동입니다.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.kbam.co.kr/board/view/470?boardCode=03&contentType=0&topYn=N" target="_blank" rel="noopener"><span className="s-icon">📄</span> KB자산운용 — 리밸런싱의 중요성</a>
            <a className="source-link" href="https://www.sedaily.com/NewsView/2GZCBX4BMU" target="_blank" rel="noopener"><span className="s-icon">📰</span> 서울경제 — 포트폴리오 리밸런싱의 중요성 (2025.10)</a>
          </div>
        </div>

        {/* ═══ Section 2 ═══ */}
        <div className="section" id="s2">
          <div className="section-bar">
            <span className="section-num" style={{ background: "var(--guide-effect)" }}>02</span>
            <div>
              <h2>왜 필요한가?</h2>
              <span className="sub">리밸런싱의 3가지 효과</span>
            </div>
          </div>

          <div className="explain">
            <p>시장이 움직이면 자산 비중도 자연스럽게 변합니다. 주가가 오르면 주식 비중이 커지고, 떨어지면 줄어듭니다. 이 과정에서 처음 세운 투자 목표가 어긋나게 되죠. 리밸런싱은 이 괴리를 바로잡아 줍니다.</p>
            <p>뱅가드(Vanguard)와 블랙록(BlackRock)의 연구에 따르면, <strong>정기적인 리밸런싱을 수행한 포트폴리오가 그렇지 않은 포트폴리오보다 연평균 약 0.5~1% 높은 수익률</strong>을 기록했습니다. 한 해로 보면 작아 보이지만, 10~20년 복리로 쌓이면 상당한 차이가 됩니다.</p>
            <div className="callout effect">
              <strong>간단 정리:</strong> 리밸런싱은 ① 리스크 통제 ② 수익 실현 + 저가 매수 ③ 감정 배제라는 세 마리 토끼를 잡습니다.
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-title">📊 리밸런싱 효과 — 10년 추적 결과 (TIAA DC형 퇴직연금, 1992~2002)</div>
            <table>
              <thead>
                <tr>
                  <th>구분</th>
                  <th>연평균 수익률</th>
                  <th>원금 대비 최종 자산</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="highlight-cell">리밸런싱 실행 (주식 51% 유지)</td>
                  <td className="highlight-cell" style={{ color: "var(--guide-effect)" }}>8.6%</td>
                  <td className="highlight-cell" style={{ color: "var(--guide-effect)" }}>2.29배</td>
                  <td>매년 비중 원위치</td>
                </tr>
                <tr>
                  <td>리밸런싱 미실행</td>
                  <td>8.2%</td>
                  <td>2.19배</td>
                  <td>방치</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="tip" style={{ background: "var(--guide-effect-soft)" }}>
            <span className="tip-icon">💡</span>
            <div className="tip-content">
              <strong>왜 수익률이 높아질까?</strong>
              리밸런싱은 비중만 원래대로 바꾸는 것인데도 ① 오른 자산을 일부 팔아 수익 실현, ② 떨어진 자산을 저가에 추가 매수하는 효과가 자동으로 발생합니다. 시장의 평균 회귀(Mean Reversion) 현상과 결합되면 장기 누적 수익이 더 안정적으로 다듬어집니다.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.sedaily.com/NewsView/2GZCBX4BMU" target="_blank" rel="noopener"><span className="s-icon">📰</span> 서울경제 — 데이비드 스웬슨 사례 (2025.10)</a>
            <a className="source-link" href="https://www.mitrade.com/kr/insights/cfd/basic/investment-portfolios" target="_blank" rel="noopener"><span className="s-icon">📄</span> 뱅가드·블랙록 리서치 인용</a>
            <a className="source-link" href="https://www.dndn.io/blog/1039" target="_blank" rel="noopener"><span className="s-icon">📄</span> 든든 블로그 — 리밸런싱 효과 분석</a>
          </div>
        </div>

        {/* ═══ Section 3 ═══ */}
        <div className="section" id="s3">
          <div className="section-bar">
            <span className="section-num" style={{ background: "var(--guide-method)" }}>03</span>
            <div>
              <h2>리밸런싱 방법 비교</h2>
              <span className="sub">정기형 vs 밴드형 vs 혼합형</span>
            </div>
          </div>

          <div className="explain">
            <p>리밸런싱 방법은 크게 세 가지입니다. <strong>정기형(Calendar)</strong>은 정해진 주기(월, 분기, 반기, 연 단위)에 맞춰 비중을 조정합니다. <strong>밴드형(Threshold)</strong>은 특정 자산의 비중이 목표에서 일정 범위(예: ±5%p) 이상 벗어났을 때 즉시 조정합니다.</p>
            <p><strong>혼합형</strong>은 기본적으로 연 1회 정기 리밸런싱을 하되, 급격한 시장 변동 시 밴드 기준으로 추가 리밸런싱을 실행합니다. 많은 전문 운용사가 이 방식을 채택하고 있습니다.</p>
            <div className="callout method">
              <strong>핵심:</strong> 초보자에게는 관리가 쉬운 &quot;연 1회 정기 리밸런싱&quot;이 가장 많이 추천됩니다.
            </div>
          </div>

          <div className="compare-grid">
            <div className="compare-card">
              <div className="compare-header" style={{ background: "var(--guide-method)" }}>📅 정기형 (Calendar)</div>
              <div className="compare-body">
                <ul>
                  <li>정해진 기간마다 비중 재조정</li>
                  <li>월별, 분기별, 반기별, 연별 선택</li>
                  <li>관리가 간단하고 규칙적</li>
                  <li>급변하는 시장에 느린 대응이 단점</li>
                  <li><strong>추천 주기:</strong> 6개월~1년</li>
                </ul>
              </div>
            </div>
            <div className="compare-card">
              <div className="compare-header" style={{ background: "var(--guide-concept)" }}>📐 밴드형 (Threshold)</div>
              <div className="compare-body">
                <ul>
                  <li>목표 비중에서 ±5%p 이상 이탈 시 조정</li>
                  <li>시장 변동에 즉시 대응 가능</li>
                  <li>수익률 극대화에 유리</li>
                  <li>잦은 매매 → 거래비용 증가 위험</li>
                  <li><strong>적합 대상:</strong> 시장을 자주 모니터링하는 투자자</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-title">📋 방법별 비교표</div>
            <table>
              <thead>
                <tr>
                  <th>항목</th>
                  <th>정기형</th>
                  <th>밴드형</th>
                  <th>혼합형</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>실행 기준</td>
                  <td>시간 (월/분기/연)</td>
                  <td>비중 이탈 폭 (±5%p 등)</td>
                  <td>시간 + 비중 이탈</td>
                </tr>
                <tr>
                  <td>관리 난이도</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>쉬움</td>
                  <td>보통</td>
                  <td>보통</td>
                </tr>
                <tr>
                  <td>거래 빈도</td>
                  <td>낮음</td>
                  <td>시장 따라 변동</td>
                  <td>중간</td>
                </tr>
                <tr>
                  <td>시장 대응 속도</td>
                  <td>느림</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>빠름</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>빠름</td>
                </tr>
                <tr>
                  <td>추천 대상</td>
                  <td>초보·바쁜 직장인</td>
                  <td>적극 투자자</td>
                  <td>중급 이상</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="tip" style={{ background: "var(--guide-method-soft)" }}>
            <span className="tip-icon">🔔</span>
            <div className="tip-content">
              <strong>현금흐름 리밸런싱 — 매매 없이 조정하는 방법</strong>
              매달 들어오는 추가 입금, 배당, 이자를 비중이 부족한 자산에 우선 배정하면, 굳이 기존 자산을 매도하지 않아도 비중 조정이 가능합니다. 거래비용과 세금을 줄이는 데 효과적입니다.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.dndn.io/blog/1039" target="_blank" rel="noopener"><span className="s-icon">📄</span> 든든 블로그 — 주기형 vs 밴드형</a>
            <a className="source-link" href="https://www.kcgiam.com/invest/guide-list.php?boardid=guide&mode=view&idx=9" target="_blank" rel="noopener"><span className="s-icon">📄</span> KCGI자산운용 — 리밸런싱 전략</a>
            <a className="source-link" href="https://www.frism.io/ddoggateun-jasaneuro-deo-nopeun-suigeul-eodneun-beob/" target="_blank" rel="noopener"><span className="s-icon">📄</span> 프리즘 — 정기·수시 리밸런싱 비교</a>
          </div>
        </div>

        {/* ═══ Section 4 ═══ */}
        <div className="section" id="s4">
          <div className="section-bar">
            <span className="section-num" style={{ background: "var(--guide-practice)" }}>04</span>
            <div>
              <h2>실전 계산 예시</h2>
              <span className="sub">1,000만 원 포트폴리오로 따라해 보기</span>
            </div>
          </div>

          <div className="explain">
            <p>처음에 <strong>주식 60%(600만 원) + 채권 40%(400만 원)</strong>으로 투자를 시작했다고 가정합니다. 1년 후 주식이 20% 올랐고 채권은 5% 올랐습니다. 이제 비중이 틀어진 상태에서 리밸런싱을 진행해 봅시다.</p>
          </div>

          <div className="example">
            <div className="example-title">📝 Step 1 — 1년 후 현재 상태 확인</div>
            <div className="calc-row">
              <span className="calc-label">주식: 600만 × 1.20 =</span>
              <span className="calc-value">720만 원 (64.9%)</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">채권: 400만 × 1.05 =</span>
              <span className="calc-value">420만 원 (35.1%)</span>
            </div>
            <div className="calc-result" style={{ background: "var(--guide-practice-soft)", color: "var(--guide-practice)" }}>
              <span>총 자산</span>
              <span className="big">1,140만 원</span>
            </div>
          </div>

          <div className="example">
            <div className="example-title">📝 Step 2 — 목표 비중 계산 (60:40)</div>
            <div className="calc-row">
              <span className="calc-label">주식 목표: 1,140만 × 60% =</span>
              <span className="calc-value">684만 원</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">채권 목표: 1,140만 × 40% =</span>
              <span className="calc-value">456만 원</span>
            </div>
          </div>

          <div className="example">
            <div className="example-title">📝 Step 3 — 리밸런싱 실행</div>
            <div className="calc-row">
              <span className="calc-label">주식: 720만 → 684만 (매도)</span>
              <span className="calc-value" style={{ color: "var(--guide-practice)" }}>−36만 원</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">채권: 420만 → 456만 (매수)</span>
              <span className="calc-value" style={{ color: "var(--guide-effect)" }}>+36만 원</span>
            </div>
            <div className="calc-result" style={{ background: "var(--guide-effect-soft)", color: "var(--guide-effect)" }}>
              <span>결과</span>
              <span className="big">다시 60:40 달성 ✓</span>
            </div>
          </div>

          <div className="callout practice" style={{ marginTop: "8px" }}>
            <strong>포인트:</strong> 주식 36만 원어치를 팔아서 채권을 산 것뿐인데, 자연스럽게 수익 실현 + 안전자산 추가 매수가 이루어졌습니다. 이것이 리밸런싱의 핵심 메커니즘입니다.
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.kbam.co.kr/board/view/470?boardCode=03&contentType=0&topYn=N" target="_blank" rel="noopener"><span className="s-icon">📄</span> KB자산운용 — 리밸런싱 예시</a>
          </div>
        </div>

        {/* ═══ Section 5 ═══ */}
        <div className="section" id="s5">
          <div className="section-bar">
            <span className="section-num" style={{ background: "var(--guide-taxsave)" }}>05</span>
            <div>
              <h2>절세 계좌 활용</h2>
              <span className="sub">ISA · 연금저축 · IRP에서 리밸런싱하면 세금이 다르다</span>
            </div>
          </div>

          <div className="explain">
            <p>일반 계좌에서 리밸런싱하면 매도 시 수익에 대한 세금(배당소득세 15.4%, 해외 ETF 매매차익 등)이 발생합니다. 하지만 <strong>절세 계좌(ISA, 연금저축, IRP)</strong> 안에서 리밸런싱하면 <strong>과세이연</strong> — 즉 세금 내는 시점을 나중으로 미룰 수 있습니다.</p>
            <p>세금으로 나갈 돈까지 계속 투자에 활용할 수 있으므로 복리 효과가 극대화됩니다. 리밸런싱을 자주 해야 하는 투자자라면, 절세 계좌 안에서 실행하는 것이 특히 유리합니다.</p>
            <div className="callout taxsave">
              <strong>핵심:</strong> 리밸런싱 = 매도가 수반됨 → 일반 계좌에서는 세금 발생 → 절세 계좌에서 하면 과세이연으로 비용 절감
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-title">📋 절세 계좌 3종 비교 — 리밸런싱 관점</div>
            <table>
              <thead>
                <tr>
                  <th>항목</th>
                  <th>ISA</th>
                  <th>연금저축</th>
                  <th>IRP</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>세액공제</td>
                  <td>없음</td>
                  <td>연 600만 원 한도</td>
                  <td>연금저축 포함 900만 원 한도</td>
                </tr>
                <tr>
                  <td>과세이연</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>○</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>○</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>○</td>
                </tr>
                <tr>
                  <td>수익 과세</td>
                  <td>200만 원 비과세, 초과 9.9%</td>
                  <td>연금수령 시 3.3~5.5%</td>
                  <td>연금수령 시 3.3~5.5%</td>
                </tr>
                <tr>
                  <td>주식형 비중 한도</td>
                  <td>제한 없음</td>
                  <td>100%</td>
                  <td>70%</td>
                </tr>
                <tr>
                  <td>의무 기간</td>
                  <td>3년</td>
                  <td>55세 이후 수령</td>
                  <td>55세 이후 수령</td>
                </tr>
                <tr>
                  <td>리밸런싱 시 세금</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>없음 (만기 시 정산)</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>없음 (수령 시 정산)</td>
                  <td style={{ color: "var(--guide-effect)", fontWeight: "700" }}>없음 (수령 시 정산)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="tip" style={{ background: "var(--guide-taxsave-soft)" }}>
            <span className="tip-icon">💡</span>
            <div className="tip-content">
              <strong>TDF(타깃데이트펀드) — 리밸런싱 자동화 상품</strong>
              직접 리밸런싱이 어렵다면, 은퇴 목표 시점에 맞춰 자동으로 자산 비중을 조정해주는 TDF를 활용하는 것도 좋은 방법입니다. 감정 개입 없이 규율이 자동화되며, IRP·연금저축에서 편입 가능합니다.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.banksalad.com/articles/%EC%86%8C%EB%93%9D%EA%B3%B5%EC%A0%9C-%EC%84%B8%EC%95%A1%EA%B3%B5%EC%A0%9C-%EA%B0%9C%EC%9D%B8%EC%97%B0%EA%B8%88-%EC%97%B0%EB%B4%89%EB%B3%84-%EB%B9%84%EA%B5%90" target="_blank" rel="noopener"><span className="s-icon">📄</span> 뱅크샐러드 — 연금저축·IRP 세액공제 총정리</a>
            <a className="source-link" href="https://samsungfundblog.com/archives/50710" target="_blank" rel="noopener"><span className="s-icon">📄</span> 삼성자산운용 — 절세계좌 3종 비교</a>
            <a className="source-link" href="https://www.hankyung.com/article/202501195858i" target="_blank" rel="noopener"><span className="s-icon">📰</span> 한국경제 — 절세계좌 활용법 (2025.01)</a>
          </div>
        </div>

        {/* ═══ Section 6 ═══ */}
        <div className="section" id="s6">
          <div className="section-bar">
            <span className="section-num" style={{ background: "var(--guide-concept)" }}>06</span>
            <div>
              <h2>주의사항 &amp; 실전 팁</h2>
              <span className="sub">리밸런싱할 때 꼭 기억할 것들</span>
            </div>
          </div>

          <div className="explain">
            <p>리밸런싱은 강력한 도구이지만, 무조건 자주 하는 것이 좋은 건 아닙니다. <strong>매매 횟수가 늘면 거래 수수료와 세금 부담도 함께 커집니다.</strong> 또한 강한 상승장에서 너무 자주 리밸런싱하면 모멘텀의 기회를 놓칠 수 있습니다.</p>
            <p>2025년 미래에셋투자와연금센터 설문에 따르면, DC형 퇴직연금 가입자 중 분기 1회 이상 운용지시를 하는 비율은 38%에 불과했고, 약 20%는 가입 후 한 번도 비중을 조정하지 않았습니다. 핵심은 &quot;너무 자주도, 완전히 방치도 아닌&quot; <strong>적절한 주기를 정해서 꾸준히 실행</strong>하는 것입니다.</p>
          </div>

          <div className="tip" style={{ background: "var(--guide-practice-soft)" }}>
            <span className="tip-icon">⚠️</span>
            <div className="tip-content">
              <strong>주의: 너무 잦은 리밸런싱의 위험</strong>
              매매회전율이 높아지면 거래 비용이 누적됩니다. 일반 계좌에서는 매도 시마다 세금도 발생합니다. 대부분의 전문가는 개인 투자자에게 연 1~2회 정기 리밸런싱을 권장합니다.
            </div>
          </div>

          <div className="tip" style={{ background: "var(--guide-effect-soft)" }}>
            <span className="tip-icon">✅</span>
            <div className="tip-content">
              <strong>팁 1: 현금흐름을 먼저 활용하세요</strong>
              매달 추가 입금, 배당, 이자 재투자분을 비중이 부족한 자산에 우선 배정하면 매도 없이도 비중 조정이 가능합니다. 세금·수수료를 아끼는 가장 효율적인 방법입니다.
            </div>
          </div>

          <div className="tip" style={{ background: "var(--guide-concept-soft)" }}>
            <span className="tip-icon">✅</span>
            <div className="tip-content">
              <strong>팁 2: 리밸런싱 날짜를 달력에 미리 적어두세요</strong>
              분기나 연 단위로 점검 주기를 정하고, 목표에서 벗어나면 비율을 조절합니다. 달력에 미리 일정을 잡아두면 &quot;나중에 해야지&quot; 하다가 잊어버리는 실수를 방지할 수 있습니다.
            </div>
          </div>

          <div className="tip" style={{ background: "var(--guide-taxsave-soft)" }}>
            <span className="tip-icon">✅</span>
            <div className="tip-content">
              <strong>팁 3: 연말에 리밸런싱하면 세금 상계 효과</strong>
              손실이 난 자산을 매도해 실현 손실을 만들면, 같은 해 실현 이익과 상계할 수 있는 경우가 있습니다. 연말 리밸런싱을 활용하면 절세 효과를 극대화할 수 있습니다.
            </div>
          </div>

          <div className="sources">
            <span className="sources-label">출처</span>
            <a className="source-link" href="https://www.sedaily.com/NewsView/2GZCBX4BMU" target="_blank" rel="noopener"><span className="s-icon">📰</span> 서울경제 — 미래에셋 설문 결과 (2025)</a>
            <a className="source-link" href="https://www.kcgiam.com/invest/guide-list.php?boardid=guide&mode=view&idx=9" target="_blank" rel="noopener"><span className="s-icon">📄</span> KCGI자산운용 — 리밸런싱 주의사항</a>
          </div>
        </div>

        {/* ═══ Summary ═══ */}
        <div className="summary" id="summary">
          <h2>한눈에 보기</h2>
          <p className="summary-sub">포트폴리오 리밸런싱의 핵심을 6가지로 정리합니다</p>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="s-num">01</div>
              <h3>정의</h3>
              <p>자산 비중을 처음 목표로 되돌리는 재조정 과정</p>
            </div>
            <div className="summary-card">
              <div className="s-num">02</div>
              <h3>효과</h3>
              <p>리스크 통제 + 수익 실현 + 저가 매수가 자동으로 발생</p>
            </div>
            <div className="summary-card">
              <div className="s-num">03</div>
              <h3>추천 방법</h3>
              <p>초보자는 연 1회 정기 리밸런싱이 가장 실용적</p>
            </div>
            <div className="summary-card">
              <div className="s-num">04</div>
              <h3>계산법</h3>
              <p>총자산 × 목표비중 = 각 자산의 목표 금액 → 차이만큼 매수/매도</p>
            </div>
            <div className="summary-card">
              <div className="s-num">05</div>
              <h3>절세 전략</h3>
              <p>ISA·연금저축·IRP 안에서 리밸런싱하면 과세이연 효과</p>
            </div>
            <div className="summary-card">
              <div className="s-num">06</div>
              <h3>핵심 원칙</h3>
              <p>너무 자주도, 완전 방치도 아닌 — 규칙을 정하고 꾸준히 실행</p>
            </div>
          </div>
        </div>

        {/* ═══ Footer ═══ */}
        <div className="footer-section">
          <h3>📚 참고 법령 및 자료</h3>
          <ul>
            <li><a href="https://www.law.go.kr" target="_blank" rel="noopener">소득세법</a> — 연금소득세, 배당소득세 관련 규정</li>
            <li><a href="https://www.law.go.kr" target="_blank" rel="noopener">조세특례제한법</a> — ISA, 연금저축, IRP 세액공제 근거</li>
            <li><a href="https://www.fss.or.kr" target="_blank" rel="noopener">금융감독원</a> — 투자자 보호 및 금융상품 안내</li>
            <li><a href="https://www.nps.or.kr" target="_blank" rel="noopener">국민연금공단</a> — 퇴직연금(IRP) 제도 안내</li>
            <li><a href="https://www.kofia.or.kr" target="_blank" rel="noopener">금융투자협회 ISA 다모아</a> — ISA 비교 공시</li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>📂 주제별 참고 자료</h3>
          <ul>
            <li><a href="https://www.dndn.io/blog/1039" target="_blank" rel="noopener">든든 블로그</a> — 리밸런싱 타이밍과 실증 분석</li>
            <li><a href="https://www.sedaily.com/NewsView/2GZCBX4BMU" target="_blank" rel="noopener">서울경제 (2025.10.27)</a> — 포트폴리오 리밸런싱의 중요성</li>
            <li><a href="https://www.kbam.co.kr/board/view/470?boardCode=03&contentType=0&topYn=N" target="_blank" rel="noopener">KB자산운용</a> — 투자에서 리밸런싱의 중요성</li>
            <li><a href="https://www.kcgiam.com/invest/guide-list.php?boardid=guide&mode=view&idx=9" target="_blank" rel="noopener">KCGI자산운용</a> — 사후관리: 리밸런싱 방법</li>
            <li><a href="https://samsungfundblog.com/archives/50710" target="_blank" rel="noopener">삼성자산운용 블로그</a> — 절세계좌 3종 비교</li>
            <li><a href="https://www.banksalad.com/articles/%EC%86%8C%EB%93%9D%EA%B3%B5%EC%A0%9C-%EC%84%B8%EC%95%A1%EA%B3%B5%EC%A0%9C-%EA%B0%9C%EC%9D%B8%EC%97%B0%EA%B8%88-%EC%97%B0%EB%B4%89%EB%B3%84-%EB%B9%84%EA%B5%90" target="_blank" rel="noopener">뱅크샐러드</a> — 연금저축·IRP 세액공제 총정리</li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>⚖️ 면책 고지 (Disclaimer)</h3>
          <ul className="disclaimer-list">
            <li>본 페이지는 2025년 2월 기준, 공개된 법령·금융기관 자료·언론 보도 등을 참고하여 일반적인 정보 제공을 목적으로 작성된 것입니다.</li>
            <li>본 자료는 특정 개인의 상황에 대한 맞춤형 재무·세무·법률 자문에 해당하지 않습니다. 구체적인 투자 판단이나 세무 사안은 공인 재무설계사, 세무사 등 관련 전문가와 상담하시기 바랍니다.</li>
            <li>세법, 금융 규정 등은 수시로 변경될 수 있으며, 열람 시점의 최신 정보와 다를 수 있습니다. 최종 확인은 금융감독원(fss.or.kr), 국세청 홈택스(hometax.go.kr) 등 공식 기관을 이용해 주세요.</li>
            <li>본 자료의 내용을 근거로 한 투자·의사결정으로 발생하는 어떠한 직접·간접 손해에 대해서도 작성자는 법적 책임을 지지 않습니다.</li>
            <li>포함된 외부 사이트 링크는 참고 편의를 위해 제공한 것이며, 해당 사이트의 내용을 보증하거나 정확성에 대해 책임지지 않습니다.</li>
          </ul>
        </div>

        <div className="footer-note">
          이 가이드는 2025년 2월 기준으로 작성되었습니다.
        </div>

      </div>
    </div>
  );
}
